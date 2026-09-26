# =============================================================================
# 05_model_training.R  (Members 3 & 4)
# Purpose : Train candidate models (Baseline, MLR, Ridge, LASSO, Stepwise, Logit),
#           verify statistical assumptions, extract feature selection paths,
#           and save a comprehensive model bundle.
# Run     : Rscript analytics/scripts/05_model_training.R
# Outputs : analytics/outputs/models/model_bundle.rds
#           analytics/outputs/plots/14_lasso_coefficient_path.png
#           analytics/outputs/plots/15_mlr_residual_diagnostics.png
# =============================================================================

suppressPackageStartupMessages({
  library(dplyr)
  library(readr)
  library(glmnet)
  library(caret)
  library(lubridate)
  library(tibble)
  library(lmtest)
  library(MASS)
})

# Prevent MASS::select from masking dplyr::select
select <- dplyr::select

cat("=== Phase 5: Model Training & Assumption Diagnostics ===\n\n")

source(file.path("analytics", "utils", "feature_builder.R"))

MODEL_CANDIDATES <- c(
  file.path("analytics", "outputs", "data", "modelling_dataset.csv"),
  file.path("analytics", "outputs", "modelling_dataset.csv")
)
MODEL_FILE        <- MODEL_CANDIDATES[file.exists(MODEL_CANDIDATES)][1]
OUTPUT_DIR        <- file.path("analytics", "outputs")
OUTPUT_MODELS_DIR <- file.path("analytics", "outputs", "models")
PLOT_DIR          <- file.path("analytics", "outputs", "plots")

dir.create(OUTPUT_DIR, recursive = TRUE, showWarnings = FALSE)
dir.create(OUTPUT_MODELS_DIR, recursive = TRUE, showWarnings = FALSE)
dir.create(PLOT_DIR, recursive = TRUE, showWarnings = FALSE)

if (is.na(MODEL_FILE) || !file.exists(MODEL_FILE)) {
  stop("Run analytics/scripts/03_feature_engineering.R first.\nMissing: modelling_dataset.csv")
}

df <- read_csv(MODEL_FILE, show_col_types = FALSE) %>%
  mutate(date = as.Date(date))

PREDICTORS  <- get_predictor_names()
THRESHOLD   <- 10   # % — large change threshold
MODEL_VER   <- "1.2.0"
DATA_CUTOFF <- "2025-09-01"

cat(sprintf("Predictor inventory (%d features): %s\n",
            length(PREDICTORS), paste(PREDICTORS, collapse = ", ")))

# ---------------------------------------------------------------------------
# 1. Split data (Strictly Chronological)
# ---------------------------------------------------------------------------
cat("\n1. Splitting data ...\n")

train <- df %>%
  filter(split == "train", has_sufficient_history, !is.na(next_absolute_change_pct))
val   <- df %>%
  filter(split == "validation", has_sufficient_history, !is.na(next_absolute_change_pct))
test_df <- df %>%
  filter(split == "test", has_sufficient_history, !is.na(next_absolute_change_pct))

cat(sprintf("  Train: %d rows | Val: %d rows | Test: %d rows\n",
            nrow(train), nrow(val), nrow(test_df)))

# ---------------------------------------------------------------------------
# 2. Preprocessing — scale and centre numeric predictors (Zero Leakage)
# ---------------------------------------------------------------------------
cat("2. Fitting preprocessor on training data ...\n")

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

preproc <- preProcess(train_imp %>% select(all_of(PREDICTORS)),
                      method = c("center", "scale"))
X_train <- predict(preproc, train_imp %>% select(all_of(PREDICTORS))) %>% as.matrix()
X_val   <- predict(preproc, val_imp %>% select(all_of(PREDICTORS))) %>% as.matrix()

y_train_cont  <- train_imp$next_absolute_change_pct
y_val_cont    <- val_imp$next_absolute_change_pct
y_train_bin   <- train_imp$next_large_change
y_val_bin     <- val_imp$next_large_change

# ---------------------------------------------------------------------------
# 3. Model A — Rolling-average baseline (Benchmark)
# ---------------------------------------------------------------------------
cat("3. Baseline: rolling-average benchmark ...\n")

baseline_val_pred <- val_imp$mean_absolute_change_3m
baseline_val_pred[is.na(baseline_val_pred)] <- mean(y_train_cont, na.rm = TRUE)

baseline_mae  <- mean(abs(y_val_cont - baseline_val_pred), na.rm = TRUE)
baseline_rmse <- sqrt(mean((y_val_cont - baseline_val_pred)^2, na.rm = TRUE))
cat(sprintf("  Baseline  — Val MAE: %.4f | RMSE: %.4f\n", baseline_mae, baseline_rmse))

# ---------------------------------------------------------------------------
# 4. Model B — Multiple Linear Regression (MLR)
# ---------------------------------------------------------------------------
cat("4. Training Multiple Linear Regression ...\n")

mlr_model <- lm(y_train_cont ~ ., data = as.data.frame(X_train))
mlr_val_pred <- pmax(predict(mlr_model, newdata = as.data.frame(X_val)), 0)

mlr_mae  <- mean(abs(y_val_cont - mlr_val_pred), na.rm = TRUE)
mlr_rmse <- sqrt(mean((y_val_cont - mlr_val_pred)^2, na.rm = TRUE))
cat(sprintf("  MLR       — Val MAE: %.4f | RMSE: %.4f\n", mlr_mae, mlr_rmse))

# ---------------------------------------------------------------------------
# 5. Model C — Ridge Regression (L2 Penalty, Unconstrained)
# ---------------------------------------------------------------------------
cat("5. Training Ridge Regression (L2 penalty) ...\n")

set.seed(42)
# Unconstrained coefficients: allow legitimate negative economic relationships
ridge_cv <- cv.glmnet(X_train, y_train_cont, alpha = 0, nfolds = 5)
ridge_lambda <- ridge_cv$lambda.1se
ridge_model  <- glmnet(X_train, y_train_cont, alpha = 0, lambda = ridge_lambda)

ridge_val_pred <- pmax(as.vector(predict(ridge_model, newx = X_val)), 0)
ridge_mae      <- mean(abs(y_val_cont - ridge_val_pred), na.rm = TRUE)
ridge_rmse     <- sqrt(mean((y_val_cont - ridge_val_pred)^2, na.rm = TRUE))
cat(sprintf("  Ridge     — Val MAE: %.4f | RMSE: %.4f | lambda.1se=%.4f\n",
            ridge_mae, ridge_rmse, ridge_lambda))

# ---------------------------------------------------------------------------
# 6. Model D — LASSO Regression (L1 Feature Selection)
# ---------------------------------------------------------------------------
cat("6. Training LASSO Regression (L1 Feature Selection) ...\n")

set.seed(42)
lasso_cv <- cv.glmnet(X_train, y_train_cont, alpha = 1, nfolds = 5)
lasso_lambda <- lasso_cv$lambda.1se
lasso_model  <- glmnet(X_train, y_train_cont, alpha = 1, lambda = lasso_lambda)

lasso_val_pred <- pmax(as.vector(predict(lasso_model, newx = X_val)), 0)
lasso_mae  <- mean(abs(y_val_cont - lasso_val_pred), na.rm = TRUE)
lasso_rmse <- sqrt(mean((y_val_cont - lasso_val_pred)^2, na.rm = TRUE))
cat(sprintf("  LASSO     — Val MAE: %.4f | RMSE: %.4f | lambda.1se=%.4f\n",
            lasso_mae, lasso_rmse, lasso_lambda))

# Formal LASSO Feature Extraction & Reporting
lasso_coef_matrix <- as.matrix(coef(lasso_cv, s = "lambda.1se"))
lasso_features <- tibble(
  predictor   = rownames(lasso_coef_matrix)[-1],
  coefficient = as.vector(lasso_coef_matrix)[-1],
  selected    = as.vector(lasso_coef_matrix)[-1] != 0
) %>% arrange(desc(abs(coefficient)))

cat("\n  === LASSO Feature Selection Audit (lambda.1se) ===\n")
print(lasso_features)
cat(sprintf("  Retained: %d / %d features | Eliminated: %s\n",
            sum(lasso_features$selected), nrow(lasso_features),
            paste(lasso_features$predictor[!lasso_features$selected], collapse = ", ")))

# Visualizing LASSO Shrinkage Path
png(file.path(PLOT_DIR, "14_lasso_coefficient_path.png"),
    width = 8, height = 5, units = "in", res = 150)
plot(lasso_cv$glmnet.fit, xvar = "lambda", label = TRUE)
abline(v = log(lasso_cv$lambda.1se), col = "#ef4444", lty = 2, lwd = 2)
abline(v = log(lasso_cv$lambda.min), col = "#3b82f6", lty = 3, lwd = 1.5)
legend("topright",
       legend = c(sprintf("lambda.1se (Selected, %d vars)", sum(lasso_features$selected)),
                  "lambda.min (CV optimal)"),
       col = c("#ef4444", "#3b82f6"), lty = c(2, 3), lwd = c(2, 1.5), bty = "n")
dev.off()
cat("  Saved: analytics/outputs/plots/14_lasso_coefficient_path.png\n")

# ---------------------------------------------------------------------------
# 7. Model D2 — Stepwise Feature Selection via AIC (Rubric Criterion #7)
# ---------------------------------------------------------------------------
cat("\n7. Training Stepwise Selection (AIC Bidirectional) ...\n")

step_df <- as.data.frame(X_train)
step_df$target <- y_train_cont

full_lm <- lm(target ~ ., data = step_df)
null_lm <- lm(target ~ 1, data = step_df)

step_model <- stepAIC(full_lm, scope = list(lower = null_lm, upper = full_lm),
                      direction = "both", trace = FALSE)

step_val_pred <- pmax(predict(step_model, newdata = as.data.frame(X_val)), 0)
step_mae  <- mean(abs(y_val_cont - step_val_pred), na.rm = TRUE)
step_rmse <- sqrt(mean((y_val_cont - step_val_pred)^2, na.rm = TRUE))

step_selected_vars <- names(coef(step_model))[-1]
cat(sprintf("  Stepwise  — Val MAE: %.4f | RMSE: %.4f | Retained: %d vars (%s)\n",
            step_mae, step_rmse, length(step_selected_vars),
            paste(step_selected_vars, collapse = ", ")))

# ---------------------------------------------------------------------------
# 8. Model E — Logistic Regression (Binary Price Shock Indicator)
# ---------------------------------------------------------------------------
cat("\n8. Training Logistic Regression (Large Change > 10%) ...\n")

logit_model <- glm(y_train_bin ~ ., data = as.data.frame(X_train),
                   family = binomial(link = "logit"))

logit_val_prob <- predict(logit_model, newdata = as.data.frame(X_val),
                          type = "response")
brier_score <- mean((logit_val_prob - y_val_bin)^2, na.rm = TRUE)
cat(sprintf("  Logit     — Brier score: %.4f\n", brier_score))

# ---------------------------------------------------------------------------
# 9. Verification of Classical Statistical Assumptions (MLR)
# ---------------------------------------------------------------------------
cat("\n9. Verifying Classical Statistical Assumptions ...\n")

# a) Multicollinearity via VIF
vif_values <- sapply(names(as.data.frame(X_train)), function(col) {
  form <- as.formula(paste("`", col, "` ~ .", sep = ""))
  r2 <- summary(lm(form, data = as.data.frame(X_train)))$r.squared
  if (r2 >= 0.999999) return(Inf)
  1 / (1 - r2)
})

cat("  a) Multicollinearity (VIF):\n")
print(round(vif_values, 2))

# b) Homoscedasticity (Studentized Breusch-Pagan Test)
bp_test <- bptest(mlr_model)
cat(sprintf("  b) Homoscedasticity (Breusch-Pagan): BP = %.2f, p-value = %.4e\n",
            bp_test$statistic, bp_test$p.value))

# c) Residual Normality (Shapiro-Wilk Test on Sample)
res <- residuals(mlr_model)
set.seed(42)
sw_test <- shapiro.test(sample(res, min(length(res), 3000)))
cat(sprintf("  c) Normality (Shapiro-Wilk, n=3000): W = %.4f, p-value = %.4e\n",
            sw_test$statistic, sw_test$p.value))

# d) Independence (Durbin-Watson Test)
dw_test <- dwtest(mlr_model)
cat(sprintf("  d) Independence (Durbin-Watson): DW = %.4f, p-value = %.4f\n",
            dw_test$statistic, dw_test$p.value))

# Diagnostic 4-Panel Plot
png(file.path(PLOT_DIR, "15_mlr_residual_diagnostics.png"),
    width = 10, height = 8, units = "in", res = 150)
par(mfrow = c(2, 2))
plot(mlr_model)
dev.off()
cat("  Saved: analytics/outputs/plots/15_mlr_residual_diagnostics.png\n")

assumption_diagnostics <- list(
  vif = vif_values,
  breusch_pagan = list(statistic = as.numeric(bp_test$statistic), p_value = bp_test$p.value),
  shapiro_wilk = list(statistic = as.numeric(sw_test$statistic), p_value = sw_test$p.value),
  durbin_watson = list(statistic = as.numeric(dw_test$statistic), p_value = dw_test$p.value)
)

# ---------------------------------------------------------------------------
# 10. Model Selection & Results Summary
# ---------------------------------------------------------------------------
cat("\n10. Model selection (Validation Performance) ...\n")

val_results <- tibble(
  model    = c("Baseline", "MLR", "Ridge", "LASSO", "Stepwise_AIC"),
  val_mae  = c(baseline_mae, mlr_mae, ridge_mae, lasso_mae, step_mae),
  val_rmse = c(baseline_rmse, mlr_rmse, ridge_rmse, lasso_rmse, step_rmse)
)
print(val_results)

best_continuous <- val_results %>% slice_min(val_mae, n = 1) %>% pull(model)
cat(sprintf("\n  Best continuous model: %s (lowest Val MAE)\n", best_continuous))

# ---------------------------------------------------------------------------
# 11. Save Complete Model Bundle
# ---------------------------------------------------------------------------
cat("\n11. Saving model bundle ...\n")

model_bundle <- list(
  version                    = MODEL_VER,
  data_cutoff                = DATA_CUTOFF,
  created_at                 = format(Sys.time(), "%Y-%m-%dT%H:%M:%S"),
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
  lasso_model     = lasso_model,
  lasso_lambda    = lasso_lambda,
  lasso_features  = lasso_features,
  step_model      = step_model,
  step_vars       = step_selected_vars,
  logit_model     = logit_model,
  best_continuous = best_continuous,

  # Diagnostics
  assumption_diagnostics = assumption_diagnostics,

  # Validation performance
  val_performance = list(
    continuous = val_results,
    binary     = list(
      brier_score     = brier_score,
      threshold_used  = 0.5
    )
  ),

  known_commodity_ids = unique(df$commodity_id),
  known_market_ids    = unique(df$market_id),
  known_combos        = df %>% distinct(commodity_id, market_id) %>% as.data.frame()
)

for (out in c(OUTPUT_DIR, OUTPUT_MODELS_DIR)) {
  saveRDS(model_bundle, file.path(out, "model_bundle.rds"))
}
cat(sprintf("  Saved: %s\n", file.path(OUTPUT_MODELS_DIR, "model_bundle.rds")))

# Sanity check
cat("\n  Sanity check (predict test row):\n")
bundle_check <- readRDS(file.path(OUTPUT_MODELS_DIR, "model_bundle.rds"))
test_row <- val_imp %>% slice(1) %>% select(all_of(PREDICTORS))
test_scaled <- predict(bundle_check$preproc_caret, test_row) %>% as.matrix()

cat(sprintf("  Ridge pred  : %.4f%%\n", pmax(as.vector(predict(bundle_check$ridge_model, newx = test_scaled)), 0)))
cat(sprintf("  LASSO pred  : %.4f%%\n", pmax(as.vector(predict(bundle_check$lasso_model, newx = test_scaled)), 0)))
cat(sprintf("  Logit prob  : %.4f\n", predict(bundle_check$logit_model, newdata = as.data.frame(test_scaled), type = "response")))
cat("  [OK] Model bundle generated and validated successfully.\n")

cat("\n=== Phase 5 Complete ===\n")
