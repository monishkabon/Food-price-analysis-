# =============================================================================
# 05_model_training.R  (Members 3 & 4)
# Purpose : Train all candidate models and save a complete model bundle.
# Run     : Rscript analytics/05_model_training.R
# Outputs : analytics/outputs/model_bundle.rds
# =============================================================================

suppressPackageStartupMessages({
  library(dplyr)
  library(readr)
  library(glmnet)
  library(caret)
  library(lubridate)
  library(tibble)
})

cat("=== Phase 5: Model Training ===\n\n")

source(file.path("analytics", "utils", "feature_builder.R"))

MODEL_CANDIDATES <- c(
  file.path("analytics", "outputs", "data", "modelling_dataset.csv"),
  file.path("analytics", "outputs", "modelling_dataset.csv")
)
MODEL_FILE        <- MODEL_CANDIDATES[file.exists(MODEL_CANDIDATES)][1]
OUTPUT_DIR        <- file.path("analytics", "outputs")
OUTPUT_MODELS_DIR <- file.path("analytics", "outputs", "models")
dir.create(OUTPUT_DIR, recursive = TRUE, showWarnings = FALSE)
dir.create(OUTPUT_MODELS_DIR, recursive = TRUE, showWarnings = FALSE)

if (is.na(MODEL_FILE) || !file.exists(MODEL_FILE)) {
  stop("Run analytics/scripts/03_feature_engineering.R first.\nMissing: modelling_dataset.csv")
}

df <- read_csv(MODEL_FILE, show_col_types = FALSE) %>%
  mutate(date = as.Date(date))

PREDICTORS  <- get_predictor_names()
THRESHOLD   <- 10   # % — large change threshold
MODEL_VER   <- "1.0.0"
DATA_CUTOFF <- "2025-09-01"

# ---------------------------------------------------------------------------
# 1. Split data
# ---------------------------------------------------------------------------
cat("1. Splitting data ...\n")

train <- df %>%
  filter(split == "train", has_sufficient_history, !is.na(next_absolute_change_pct))
val   <- df %>%
  filter(split == "validation", has_sufficient_history, !is.na(next_absolute_change_pct))
test_df <- df %>%
  filter(split == "test", has_sufficient_history, !is.na(next_absolute_change_pct))

cat(sprintf("  Train: %d rows | Val: %d rows | Test: %d rows\n",
            nrow(train), nrow(val), nrow(test_df)))

if (nrow(train) < 30) {
  warning("Very few training rows — models may not generalise well.")
}

# ---------------------------------------------------------------------------
# 2. Preprocessing — scale and centre numeric predictors
# ---------------------------------------------------------------------------
cat("2. Fitting preprocessor ...\n")

# Impute NA predictors with column median (training set medians)
impute_medians <- train %>%
  select(all_of(PREDICTORS)) %>%
  summarise(across(everything(), ~median(.x, na.rm = TRUE)))

impute_fn <- function(df_in) {
  for (col in names(impute_medians)) {
    if (col %in% names(df_in)) {
      df_in[[col]] <- ifelse(is.na(df_in[[col]]), impute_medians[[col]], df_in[[col]])
    }
  }
  df_in
}

train_imp <- impute_fn(train)
val_imp   <- impute_fn(val)

# Scale/centre using training statistics
preproc <- preProcess(train_imp %>% select(all_of(PREDICTORS)),
                      method = c("center", "scale"))
X_train <- predict(preproc, train_imp %>% select(all_of(PREDICTORS))) %>% as.matrix()
X_val   <- predict(preproc, val_imp %>% select(all_of(PREDICTORS))) %>% as.matrix()

y_train_cont  <- train_imp$next_absolute_change_pct
y_val_cont    <- val_imp$next_absolute_change_pct
y_train_bin   <- train_imp$next_large_change
y_val_bin     <- val_imp$next_large_change

# ---------------------------------------------------------------------------
# 3. Model A — Rolling-average baseline (no fitting required)
# ---------------------------------------------------------------------------
cat("3. Baseline: rolling-average ...\n")

# Prediction = mean_absolute_change_3m (already in predictors, unscaled)
baseline_val_pred <- val_imp$mean_absolute_change_3m
baseline_val_pred[is.na(baseline_val_pred)] <- mean(y_train_cont, na.rm = TRUE)

baseline_mae  <- mean(abs(y_val_cont - baseline_val_pred), na.rm = TRUE)
baseline_rmse <- sqrt(mean((y_val_cont - baseline_val_pred)^2, na.rm = TRUE))
cat(sprintf("  Baseline  — Val MAE: %.4f | RMSE: %.4f\n", baseline_mae, baseline_rmse))

# ---------------------------------------------------------------------------
# 4. Model B — Multiple Linear Regression
# ---------------------------------------------------------------------------
cat("4. Training Multiple Linear Regression ...\n")

mlr_model <- lm(y_train_cont ~ ., data = as.data.frame(X_train))
mlr_val_pred <- pmax(predict(mlr_model, newdata = as.data.frame(X_val)), 0)

mlr_mae  <- mean(abs(y_val_cont - mlr_val_pred), na.rm = TRUE)
mlr_rmse <- sqrt(mean((y_val_cont - mlr_val_pred)^2, na.rm = TRUE))
cat(sprintf("  MLR       — Val MAE: %.4f | RMSE: %.4f\n", mlr_mae, mlr_rmse))

# ---------------------------------------------------------------------------
# 5. Model C — Ridge Regression (cross-validated lambda)
# ---------------------------------------------------------------------------
cat("5. Training Ridge Regression ...\n")

set.seed(42)
ridge_cv <- cv.glmnet(X_train, y_train_cont, alpha = 0, nfolds = 5,
                      lower.limits = 0)   # constrain predictions ≥ 0
ridge_lambda <- ridge_cv$lambda.1se   # slightly regularised: prefer simpler model
ridge_model  <- glmnet(X_train, y_train_cont, alpha = 0,
                       lambda = ridge_lambda, lower.limits = 0)

ridge_val_pred <- pmax(as.vector(predict(ridge_model, newx = X_val)), 0)
ridge_mae      <- mean(abs(y_val_cont - ridge_val_pred), na.rm = TRUE)
ridge_rmse     <- sqrt(mean((y_val_cont - ridge_val_pred)^2, na.rm = TRUE))
cat(sprintf("  Ridge     — Val MAE: %.4f | RMSE: %.4f | lambda=%.4f\n",
            ridge_mae, ridge_rmse, ridge_lambda))

# ---------------------------------------------------------------------------
# 6. Model D — Logistic Regression (binary: large change or not)
# ---------------------------------------------------------------------------
cat("6. Training Logistic Regression ...\n")

logit_model <- glm(y_train_bin ~ ., data = as.data.frame(X_train),
                   family = binomial(link = "logit"))

logit_val_prob <- predict(logit_model, newdata = as.data.frame(X_val),
                          type = "response")
logit_val_pred <- as.integer(logit_val_prob >= 0.5)

brier_score <- mean((logit_val_prob - y_val_bin)^2, na.rm = TRUE)
cat(sprintf("  Logit     — Brier score: %.4f\n", brier_score))

# ---------------------------------------------------------------------------
# 7. Select best continuous model based on validation MAE
# ---------------------------------------------------------------------------
cat("\n7. Model selection ...\n")

val_results <- tibble(
  model       = c("Baseline", "MLR", "Ridge"),
  val_mae     = c(baseline_mae, mlr_mae, ridge_mae),
  val_rmse    = c(baseline_rmse, mlr_rmse, ridge_rmse)
)
print(val_results)

best_continuous <- val_results %>% slice_min(val_mae, n = 1) %>% pull(model)
cat(sprintf("\n  Best continuous model: %s (lowest Val MAE)\n", best_continuous))

# ---------------------------------------------------------------------------
# 8. Save complete model bundle
# ---------------------------------------------------------------------------
cat("\n8. Saving model bundle ...\n")

model_bundle <- list(
  # Version / metadata
  version         = MODEL_VER,
  data_cutoff     = DATA_CUTOFF,
  created_at      = format(Sys.time(), "%Y-%m-%dT%H:%M:%S"),
  large_change_threshold_pct = THRESHOLD,

  # Preprocessing
  predictors      = PREDICTORS,
  impute_medians  = impute_medians,
  preproc_caret   = preproc,

  # Models
  baseline_train_mean = mean(y_train_cont, na.rm = TRUE),
  mlr_model       = mlr_model,
  ridge_model     = ridge_model,
  ridge_lambda    = ridge_lambda,
  logit_model     = logit_model,
  best_continuous = best_continuous,

  # Validation performance (snapshot for API /performance endpoint)
  val_performance = list(
    continuous = val_results,
    binary     = list(
      brier_score     = brier_score,
      threshold_used  = 0.5
    )
  ),

  # Known category levels (for future categorical encoders if needed)
  known_commodity_ids = unique(df$commodity_id),
  known_market_ids    = unique(df$market_id),
  known_combos        = df %>%
                          distinct(commodity_id, market_id) %>%
                          as.data.frame()
)

for (out in c(OUTPUT_DIR, OUTPUT_MODELS_DIR)) {
  saveRDS(model_bundle, file.path(out, "model_bundle.rds"))
}
cat(sprintf("  Saved: %s\n", file.path(OUTPUT_MODELS_DIR, "model_bundle.rds")))

# Sanity check — reload and predict
cat("\n  Sanity check (reload bundle and predict one row):\n")
bundle_check_path <- file.path(OUTPUT_MODELS_DIR, "model_bundle.rds")
b2 <- readRDS(bundle_check_path)
test_row <- val_imp %>% slice(1) %>% select(all_of(PREDICTORS))
test_scaled <- predict(b2$preproc_caret, test_row) %>% as.matrix()
ridge_pred_check <- pmax(as.vector(predict(b2$ridge_model, newx = test_scaled)), 0)
logit_pred_check <- predict(b2$logit_model,
                            newdata = as.data.frame(test_scaled), type = "response")
cat(sprintf("  Ridge pred  : %.4f%%\n", ridge_pred_check))
cat(sprintf("  Logit prob  : %.4f\n", logit_pred_check))
cat("  [OK] Bundle loads and predicts correctly.\n")

cat("\n=== Phase 5 Complete ===\n")
cat("Next steps (can run in parallel):\n")
cat("  Rscript analytics/scripts/06_model_evaluation.R\n")
cat("  Rscript api/run_api.R  (once evaluation is done)\n")
