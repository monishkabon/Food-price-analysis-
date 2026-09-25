# =============================================================================
# 06_model_evaluation.R  (Members 3 & 4)
# Purpose : Evaluate all models on the held-out test set.
#           Produces comprehensive evaluation outputs for the API /performance
#           endpoint and the academic report.
# Run     : Rscript analytics/scripts/06_model_evaluation.R
# Outputs : analytics/outputs/evaluation_results.csv
#           analytics/outputs/plots/10_*.png
# =============================================================================

suppressPackageStartupMessages({
  library(dplyr)
  library(readr)
  library(glmnet)
  library(caret)
  library(tibble)
  library(ggplot2)
  library(scales)
  library(patchwork)
  library(tidyr)
})

cat("=== Phase 6: Model Evaluation ===\n\n")

source(file.path("analytics", "utils", "feature_builder.R"))

MODEL_CANDIDATES <- c(
  file.path("analytics", "outputs", "data", "modelling_dataset.csv"),
  file.path("analytics", "outputs", "modelling_dataset.csv")
)
BUNDLE_CANDIDATES <- c(
  file.path("analytics", "outputs", "models", "model_bundle.rds"),
  file.path("analytics", "outputs", "model_bundle.rds")
)
MODEL_FILE         <- MODEL_CANDIDATES[file.exists(MODEL_CANDIDATES)][1]
BUNDLE_FILE        <- BUNDLE_CANDIDATES[file.exists(BUNDLE_CANDIDATES)][1]
OUTPUT_DIR         <- file.path("analytics", "outputs")
OUTPUT_REPORTS_DIR <- file.path("analytics", "outputs", "reports")
OUTPUT_MODELS_DIR  <- file.path("analytics", "outputs", "models")
PLOT_DIR           <- file.path("analytics", "outputs", "plots")

dir.create(PLOT_DIR, recursive = TRUE, showWarnings = FALSE)
dir.create(OUTPUT_DIR, recursive = TRUE, showWarnings = FALSE)
dir.create(OUTPUT_REPORTS_DIR, recursive = TRUE, showWarnings = FALSE)
dir.create(OUTPUT_MODELS_DIR, recursive = TRUE, showWarnings = FALSE)

if (is.na(MODEL_FILE) || !file.exists(MODEL_FILE) || is.na(BUNDLE_FILE) || !file.exists(BUNDLE_FILE)) {
  stop("Missing required input files. Run preceding analytics scripts first.")
}

df     <- read_csv(MODEL_FILE, show_col_types = FALSE) %>%
            mutate(date = as.Date(date))
bundle <- readRDS(BUNDLE_FILE)

cat(sprintf("Model version : %s\n", bundle$version))
cat(sprintf("Data cutoff   : %s\n\n", bundle$data_cutoff))

# ---------------------------------------------------------------------------
# Dark theme
# ---------------------------------------------------------------------------
theme_food <- function() {
  theme_minimal(base_size = 12) +
    theme(
      plot.background  = element_rect(fill = "#1a1a2e", colour = NA),
      panel.background = element_rect(fill = "#16213e", colour = NA),
      panel.grid.major = element_line(colour = "#2a2a4a"),
      panel.grid.minor = element_blank(),
      plot.title       = element_text(colour = "#e2e8f0", face = "bold", size = 14),
      plot.subtitle    = element_text(colour = "#94a3b8", size = 10),
      plot.caption     = element_text(colour = "#64748b", size = 8),
      axis.text        = element_text(colour = "#94a3b8"),
      axis.title       = element_text(colour = "#cbd5e1"),
      legend.background = element_rect(fill = "#1e293b", colour = NA),
      legend.text      = element_text(colour = "#cbd5e1"),
      legend.title     = element_text(colour = "#e2e8f0"),
      strip.text       = element_text(colour = "#e2e8f0", face = "bold"),
      strip.background = element_rect(fill = "#0f3460", colour = NA)
    )
}

# ---------------------------------------------------------------------------
# 1. Prepare test set
# ---------------------------------------------------------------------------
cat("1. Preparing test set ...\n")

test_df <- df %>%
  filter(split == "test", has_sufficient_history, !is.na(next_absolute_change_pct))

cat(sprintf("   Test rows: %d\n", nrow(test_df)))

# Impute then scale
impute_fn <- function(df_in) {
  for (col in names(bundle$impute_medians)) {
    if (col %in% names(df_in)) {
      df_in[[col]] <- ifelse(is.na(df_in[[col]]), bundle$impute_medians[[col]], df_in[[col]])
    }
  }
  df_in
}

test_imp <- impute_fn(test_df)
X_test   <- predict(bundle$preproc_caret,
                    test_imp %>% select(all_of(bundle$predictors))) %>% as.matrix()

y_test_cont <- test_imp$next_absolute_change_pct
y_test_bin  <- test_imp$next_large_change

# ---------------------------------------------------------------------------
# 2. Generate predictions
# ---------------------------------------------------------------------------
cat("2. Generating predictions ...\n")

# Baseline
baseline_pred <- pmax(test_imp$mean_absolute_change_3m, 0)
baseline_pred[is.na(baseline_pred)] <- bundle$baseline_train_mean

# MLR
mlr_pred  <- pmax(predict(bundle$mlr_model, newdata = as.data.frame(X_test)), 0)

# Ridge
ridge_pred <- pmax(as.vector(predict(bundle$ridge_model, newx = X_test)), 0)

# LASSO
lasso_pred <- pmax(
  as.vector(predict(bundle$lasso_model, newx = X_test)),
  0
)

# Logistic
logit_prob <- predict(bundle$logit_model, newdata = as.data.frame(X_test),
                      type = "response")
logit_pred <- as.integer(logit_prob >= 0.5)

# ---------------------------------------------------------------------------
# 3. Continuous metrics
# ---------------------------------------------------------------------------
cat("3. Computing continuous metrics ...\n")

eval_continuous <- function(name, preds, actuals) {
  tibble(
    model = name,
    mae   = mean(abs(actuals - preds), na.rm = TRUE),
    rmse  = sqrt(mean((actuals - preds)^2, na.rm = TRUE)),
    n_neg = sum(preds < 0, na.rm = TRUE)
  )
}

cont_results <- bind_rows(
  eval_continuous("Baseline",  baseline_pred, y_test_cont),
  eval_continuous("MLR",       mlr_pred,      y_test_cont),
  eval_continuous("Ridge",     ridge_pred,    y_test_cont),
  eval_continuous("LASSO",    lasso_pred,    y_test_cont)
)

cat("\n  Continuous model evaluation (test set):\n")
print(cont_results)

# ---------------------------------------------------------------------------
# 4. Binary (logistic) metrics
# ---------------------------------------------------------------------------
cat("\n4. Computing binary classification metrics ...\n")

brier   <- mean((logit_prob - y_test_bin)^2, na.rm = TRUE)
tp      <- sum(logit_pred == 1 & y_test_bin == 1)
fp      <- sum(logit_pred == 1 & y_test_bin == 0)
fn      <- sum(logit_pred == 0 & y_test_bin == 1)
tn      <- sum(logit_pred == 0 & y_test_bin == 0)
precision <- ifelse((tp + fp) > 0, tp / (tp + fp), NA_real_)
recall    <- ifelse((tp + fn) > 0, tp / (tp + fn), NA_real_)
f1        <- ifelse(!is.na(precision) & !is.na(recall) & (precision + recall) > 0,
                    2 * precision * recall / (precision + recall), NA_real_)
accuracy  <- (tp + tn) / (tp + fp + fn + tn)

cat(sprintf("  Brier score : %.4f\n", brier))
cat(sprintf("  Precision   : %.4f\n", precision))
cat(sprintf("  Recall      : %.4f\n", recall))
cat(sprintf("  F1          : %.4f\n", f1))
cat(sprintf("  Accuracy    : %.4f\n", accuracy))
cat(sprintf("  Confusion matrix:\n"))
cat(sprintf("    TP=%d  FP=%d\n    FN=%d  TN=%d\n", tp, fp, fn, tn))

bin_results <- tibble(
  model         = "Logistic Regression",
  brier_score   = brier,
  precision     = precision,
  recall        = recall,
  f1            = f1,
  accuracy      = accuracy,
  tp = tp, fp = fp, fn = fn, tn = tn,
  threshold_pct = bundle$large_change_threshold_pct,
  prob_cutoff   = 0.5
)

# ---------------------------------------------------------------------------
# 5. Per-commodity breakdown
# ---------------------------------------------------------------------------
cat("\n5. Per-commodity breakdown ...\n")

test_imp_eval <- test_imp %>%
  mutate(
    pred_baseline = baseline_pred,
    pred_mlr      = mlr_pred,
    pred_ridge    = ridge_pred,
    pred_lasso    = lasso_pred,
    pred_logit_p  = logit_prob,
    pred_logit    = logit_pred
  )

per_food <- test_imp_eval %>%
  group_by(commodity) %>%
  summarise(
    n = n(),
    mae_baseline = mean(abs(next_absolute_change_pct - pred_baseline), na.rm = TRUE),
    mae_mlr      = mean(abs(next_absolute_change_pct - pred_mlr), na.rm = TRUE),
    mae_ridge    = mean(abs(next_absolute_change_pct - pred_ridge), na.rm = TRUE),
    mae_lasso    = mean(abs(next_absolute_change_pct - pred_lasso), na.rm = TRUE),
    brier_logit  = mean((pred_logit_p - next_large_change)^2, na.rm = TRUE),
    pct_large_true = mean(next_large_change) * 100,
    .groups = "drop"
  )

cat("\n  Per-commodity test metrics:\n")
print(per_food)

# ---------------------------------------------------------------------------
# 6. Visualisations
# ---------------------------------------------------------------------------
cat("\n6. Creating evaluation plots ...\n")

# a) MAE comparison bar chart
p_mae <- cont_results %>%
  ggplot(aes(x = reorder(model, mae), y = mae, fill = model)) +
  geom_col(width = 0.5, alpha = 0.9) +
  geom_text(aes(label = sprintf("%.3f%%", mae)), hjust = -0.1,
            colour = "#e2e8f0", size = 3.5) +
  coord_flip() +
  scale_fill_manual(values = c(
  "Baseline" = "#38bdf8",
  "MLR"      = "#fb923c",
  "Ridge"    = "#4ade80",
  "LASSO"    = "#a78bfa"
)) +

  scale_y_continuous(labels = label_percent(scale = 1),
                     expand = expansion(mult = c(0, 0.25))) +
  labs(
    title    = "Model Comparison — MAE on Test Set",
    subtitle = sprintf("Test period: April–September 2025 (n=%d)", nrow(test_df)),
    x = NULL, y = "MAE (percentage points)"
  ) +
  theme_food() + theme(legend.position = "none")

ggsave(file.path(PLOT_DIR, "10_mae_comparison.png"),
       p_mae, width = 8, height = 4, dpi = 150, bg = "#1a1a2e")

# b) Predicted vs actual scatter (Ridge)
p_scatter <- ggplot(test_imp_eval,
                    aes(x = next_absolute_change_pct, y = pred_ridge,
                        colour = commodity)) +
  geom_abline(slope = 1, intercept = 0, colour = "#f1f5f9",
               linetype = "dashed", linewidth = 0.8) +
  geom_point(alpha = 0.6, size = 1.8) +
  scale_colour_manual(values = c("#38bdf8","#fb923c","#4ade80","#f472b6","#a78bfa")) +
  scale_x_continuous(labels = label_percent(scale = 1)) +
  scale_y_continuous(labels = label_percent(scale = 1)) +
  labs(
    title    = "Ridge Regression — Predicted vs Actual (Test Set)",
    subtitle = "Dashed line = perfect prediction · Points coloured by commodity",
    x = "Actual Absolute Change (%)", y = "Predicted Absolute Change (%)",
    colour = "Commodity"
  ) +
  theme_food()

ggsave(file.path(PLOT_DIR, "11_ridge_pred_vs_actual.png"),
       p_scatter, width = 8, height = 6, dpi = 150, bg = "#1a1a2e")

# c) Calibration plot (logistic)
logit_cal <- test_imp_eval %>%
  mutate(bin = cut(pred_logit_p, breaks = seq(0, 1, 0.1), include.lowest = TRUE)) %>%
  group_by(bin) %>%
  summarise(
    mean_pred = mean(pred_logit_p, na.rm = TRUE),
    mean_obs  = mean(next_large_change, na.rm = TRUE),
    n         = n(),
    .groups   = "drop"
  )

p_cal <- ggplot(logit_cal, aes(x = mean_pred, y = mean_obs)) +
  geom_abline(slope = 1, intercept = 0, colour = "#f1f5f9",
               linetype = "dashed", linewidth = 0.8) +
  geom_point(aes(size = n), colour = "#38bdf8", alpha = 0.85) +
  geom_line(colour = "#38bdf8", linewidth = 1) +
  scale_size_continuous(range = c(2, 8)) +
  scale_x_continuous(labels = label_percent(), limits = c(0, 1)) +
  scale_y_continuous(labels = label_percent(), limits = c(0, 1)) +
  labs(
    title    = "Logistic Regression — Probability Calibration (Test Set)",
    subtitle = sprintf("Brier score: %.4f · Perfect calibration = dashed line", brier),
    x = "Mean Predicted Probability", y = "Observed Fraction (P>10%)",
    size = "n"
  ) +
  theme_food()

ggsave(file.path(PLOT_DIR, "12_logit_calibration.png"),
       p_cal, width = 7, height = 6, dpi = 150, bg = "#1a1a2e")

# d) Per-food MAE comparison
p_food_mae <- per_food %>%
  select(
    commodity,
    mae_baseline,
    mae_mlr,
    mae_ridge,
    mae_lasso
  ) %>%
  pivot_longer(
    c(mae_baseline, mae_mlr, mae_ridge, mae_lasso),
    names_to = "model",
    values_to = "mae"
  ) %>%
  mutate(
    model = recode(
      model,
      mae_baseline = "Baseline",
      mae_mlr = "MLR",
      mae_ridge = "Ridge",
      mae_lasso = "LASSO"
    )
  ) %>%
  ggplot(aes(x = commodity, y = mae, fill = model)) +
  geom_col(position = "dodge", width = 0.6, alpha = 0.9) +
  scale_fill_manual(
    values = c(
      "Baseline" = "#38bdf8",
      "MLR" = "#fb923c",
      "Ridge" = "#4ade80",
      "LASSO" = "#a78bfa"
    ),
    name = "Model"
  ) +
  scale_y_continuous(labels = label_percent(scale = 1)) +
  labs(
    title    = "Per-Commodity MAE — Continuous Models (Test Set)",
    subtitle = "Lower is better",
    x = NULL, y = "MAE (percentage points)"
  ) +
  theme_food()

ggsave(file.path(PLOT_DIR, "13_per_food_mae.png"),
       p_food_mae, width = 10, height = 5, dpi = 150, bg = "#1a1a2e")

cat("   Plots saved to:", PLOT_DIR, "\n")

# ---------------------------------------------------------------------------
# 7. Save evaluation results and update model bundle
# ---------------------------------------------------------------------------
cat("\n7. Saving evaluation results ...\n")

# Append test performance to bundle and resave
bundle$test_performance <- list(
  continuous    = cont_results,
  binary        = bin_results,
  per_commodity = per_food,
  test_period   = list(start = "2025-04-01", end = "2025-09-01"),
  n_test        = nrow(test_df)
)
for (out in c(OUTPUT_DIR, OUTPUT_MODELS_DIR)) {
  saveRDS(bundle, file.path(out, "model_bundle.rds"))
}
cat("   Model bundle updated with test performance.\n")

# Write CSV
all_eval <- bind_rows(
  cont_results %>%
    mutate(eval_type = "continuous", metric_set = "MAE+RMSE") %>%
    select(eval_type, model, mae, rmse),
  bin_results %>%
    mutate(eval_type = "binary") %>%
    select(eval_type, model, brier_score, precision, recall, f1, accuracy)
)

for (out in c(OUTPUT_DIR, OUTPUT_REPORTS_DIR)) {
  write_csv(all_eval, file.path(out, "evaluation_results.csv"))
  write_csv(per_food, file.path(out, "per_food_evaluation.csv"))
}
cat(sprintf("   Saved: %s\n", file.path(OUTPUT_REPORTS_DIR, "evaluation_results.csv")))
cat(sprintf("   Saved: %s\n", file.path(OUTPUT_REPORTS_DIR, "per_food_evaluation.csv")))

cat("\n=== Phase 6 Complete ===\n")
cat("Next step: Rscript api/run_api.R\n")
