# =============================================================================
# 06_model_evaluation.R  (Members 3 & 4)
# Purpose : Evaluate candidate models on the held-out test set.
#           Produces continuous metrics (MAE, RMSE, R²_oos), binary metrics
#           (Brier, ROC-AUC, Precision, Recall, F1), cost-asymmetric procurement
#           threshold optimization, and publication-ready evaluation plots.
# Run     : Rscript analytics/scripts/06_model_evaluation.R
# Outputs : analytics/outputs/reports/evaluation_results.csv
#           analytics/outputs/reports/per_food_evaluation.csv
#           analytics/outputs/reports/assumption_diagnostics.csv
#           analytics/outputs/reports/procurement_cost_matrix.csv
#           analytics/outputs/plots/10_mae_comparison.png
#           analytics/outputs/plots/11_ridge_pred_vs_actual.png
#           analytics/outputs/plots/12_logit_calibration.png
#           analytics/outputs/plots/13_per_food_mae.png
#           analytics/outputs/plots/16_procurement_cost_tradeoff.png
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
  library(pROC)
})

# Prevent masking collision
select <- dplyr::select

cat("=== Phase 6: Model Evaluation & Procurement Decision Optimization ===\n\n")

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

df     <- read_csv(MODEL_FILE, show_col_types = FALSE) %>% mutate(date = as.Date(date))
bundle <- readRDS(BUNDLE_FILE)

cat(sprintf("Model version : %s\n", bundle$version))
cat(sprintf("Data cutoff   : %s\n\n", bundle$data_cutoff))

# ---------------------------------------------------------------------------
# Dark theme for charts
# ---------------------------------------------------------------------------
theme_food <- function() {
  theme_minimal(base_size = 12) +
    theme(
      plot.background   = element_rect(fill = "#1a1a2e", colour = NA),
      panel.background  = element_rect(fill = "#16213e", colour = NA),
      panel.grid.major  = element_line(colour = "#2a2a4a"),
      panel.grid.minor  = element_blank(),
      plot.title        = element_text(colour = "#e2e8f0", face = "bold", size = 14),
      plot.subtitle     = element_text(colour = "#94a3b8", size = 10),
      plot.caption      = element_text(colour = "#64748b", size = 8),
      axis.text         = element_text(colour = "#94a3b8"),
      axis.title        = element_text(colour = "#cbd5e1"),
      legend.background = element_rect(fill = "#1e293b", colour = NA),
      legend.text       = element_text(colour = "#cbd5e1"),
      legend.title      = element_text(colour = "#e2e8f0"),
      strip.text        = element_text(colour = "#e2e8f0", face = "bold"),
      strip.background  = element_rect(fill = "#0f3460", colour = NA)
    )
}

# ---------------------------------------------------------------------------
# 1. Prepare test set (Zero Leakage)
# ---------------------------------------------------------------------------
cat("1. Preparing held-out test set ...\n")

test_df <- df %>%
  filter(split == "test", has_sufficient_history, !is.na(next_absolute_change_pct))

cat(sprintf("   Test rows: %d (Period: %s to %s)\n",
            nrow(test_df), min(test_df$date), max(test_df$date)))

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
# 2. Generate predictions across all models
# ---------------------------------------------------------------------------
cat("2. Generating predictions ...\n")

# Baseline
baseline_pred <- pmax(test_imp$mean_absolute_change_3m, 0)
baseline_pred[is.na(baseline_pred)] <- bundle$baseline_train_mean

# MLR
mlr_pred <- pmax(predict(bundle$mlr_model, newdata = as.data.frame(X_test)), 0)

# Ridge
ridge_pred <- pmax(as.vector(predict(bundle$ridge_model, newx = X_test)), 0)

# LASSO
lasso_pred <- pmax(as.vector(predict(bundle$lasso_model, newx = X_test)), 0)

# Stepwise AIC
step_pred <- pmax(predict(bundle$step_model, newdata = as.data.frame(X_test)), 0)

# Logistic Regression
logit_prob <- predict(bundle$logit_model, newdata = as.data.frame(X_test), type = "response")

# ---------------------------------------------------------------------------
# 3. Continuous metrics: MAE, RMSE, and Out-of-Sample R²
# ---------------------------------------------------------------------------
cat("3. Computing continuous metrics ...\n")

# Baseline total sum of squares based on training mean benchmark
tss_test <- sum((y_test_cont - bundle$baseline_train_mean)^2, na.rm = TRUE)

eval_continuous <- function(name, preds, actuals) {
  rss <- sum((actuals - preds)^2, na.rm = TRUE)
  r2_oos <- 1 - (rss / tss_test)
  tibble(
    model   = name,
    mae     = mean(abs(actuals - preds), na.rm = TRUE),
    rmse    = sqrt(mean((actuals - preds)^2, na.rm = TRUE)),
    r2_oos  = r2_oos,
    n_neg   = sum(preds < 0, na.rm = TRUE)
  )
}

cont_results <- bind_rows(
  eval_continuous("Baseline",     baseline_pred, y_test_cont),
  eval_continuous("MLR",          mlr_pred,      y_test_cont),
  eval_continuous("Ridge",        ridge_pred,    y_test_cont),
  eval_continuous("LASSO",        lasso_pred,    y_test_cont),
  eval_continuous("Stepwise_AIC", step_pred,     y_test_cont)
)

cat("\n  Continuous model evaluation (test set):\n")
print(cont_results)

# ---------------------------------------------------------------------------
# 4. Binary metrics (Logistic Regression) & ROC-AUC
# ---------------------------------------------------------------------------
cat("\n4. Computing binary classification metrics ...\n")

roc_obj <- roc(y_test_bin, logit_prob, quiet = TRUE)
roc_auc <- as.numeric(auc(roc_obj))

# Standard cutoff at 0.50
logit_pred_50 <- as.integer(logit_prob >= 0.5)
brier_50      <- mean((logit_prob - y_test_bin)^2, na.rm = TRUE)
tp_50         <- sum(logit_pred_50 == 1 & y_test_bin == 1)
fp_50         <- sum(logit_pred_50 == 1 & y_test_bin == 0)
fn_50         <- sum(logit_pred_50 == 0 & y_test_bin == 1)
tn_50         <- sum(logit_pred_50 == 0 & y_test_bin == 0)

precision_50 <- ifelse((tp_50 + fp_50) > 0, tp_50 / (tp_50 + fp_50), NA_real_)
recall_50    <- ifelse((tp_50 + fn_50) > 0, tp_50 / (tp_50 + fn_50), NA_real_)
f1_50        <- ifelse((precision_50 + recall_50) > 0,
                       2 * precision_50 * recall_50 / (precision_50 + recall_50), NA_real_)
accuracy_50  <- (tp_50 + tn_50) / (tp_50 + fp_50 + fn_50 + tn_50)

cat(sprintf("  ROC-AUC     : %.4f\n", roc_auc))
cat(sprintf("  Brier score : %.4f\n", brier_50))
cat(sprintf("  Precision   : %.4f (cutoff=0.50)\n", precision_50))
cat(sprintf("  Recall      : %.4f (cutoff=0.50)\n", recall_50))
cat(sprintf("  F1          : %.4f (cutoff=0.50)\n", f1_50))
cat(sprintf("  Accuracy    : %.4f (cutoff=0.50)\n", accuracy_50))

bin_results <- tibble(
  model         = "Logistic Regression",
  brier_score   = brier_50,
  roc_auc       = roc_auc,
  precision     = precision_50,
  recall        = recall_50,
  f1            = f1_50,
  accuracy      = accuracy_50,
  tp = tp_50, fp = fp_50, fn = fn_50, tn = tn_50,
  threshold_pct = bundle$large_change_threshold_pct,
  prob_cutoff   = 0.5
)

# ---------------------------------------------------------------------------
# 5. Cost-Asymmetric Procurement Decision Analysis
# ---------------------------------------------------------------------------
cat("\n5. Optimizing Procurement Shock Cutoff (Cost-Asymmetric Matrix) ...\n")

# In retail procurement, a False Negative (missed shock -> stockout/spot crisis)
# is substantially more damaging than a False Positive (unneeded buffer stock).
# Asymmetric cost weights: C_FN = 4.0, C_FP = 1.0
C_FN <- 4.0
C_FP <- 1.0

thresholds <- seq(0.10, 0.90, by = 0.05)
cost_records <- list()

for (th in thresholds) {
  pred_bin <- as.integer(logit_prob >= th)
  tp <- sum(pred_bin == 1 & y_test_bin == 1)
  fp <- sum(pred_bin == 1 & y_test_bin == 0)
  fn <- sum(pred_bin == 0 & y_test_bin == 1)
  tn <- sum(pred_bin == 0 & y_test_bin == 0)
  
  prec <- ifelse((tp + fp) > 0, tp / (tp + fp), 0)
  rec  <- ifelse((tp + fn) > 0, tp / (tp + fn), 0)
  f1_s <- ifelse((prec + rec) > 0, 2 * prec * rec / (prec + rec), 0)
  total_cost <- (C_FN * fn) + (C_FP * fp)
  
  cost_records[[length(cost_records) + 1]] <- tibble(
    threshold   = th,
    tp = tp, fp = fp, fn = fn, tn = tn,
    precision   = prec,
    recall      = rec,
    f1          = f1_s,
    total_cost  = total_cost
  )
}

procurement_cost_matrix <- bind_rows(cost_records)
opt_row <- procurement_cost_matrix %>% slice_min(total_cost, n = 1) %>% slice(1)
opt_threshold <- opt_row$threshold

cat(sprintf("  Optimal Procurement Alert Cutoff : p* = %.2f\n", opt_threshold))
cat(sprintf("  Optimal Cost: %.1f vs Default Cost (0.50): %.1f (Cost Reduction: %.1f%%)\n",
            opt_row$total_cost,
            procurement_cost_matrix %>% filter(threshold == 0.5) %>% pull(total_cost),
            100 * (1 - opt_row$total_cost / (procurement_cost_matrix %>% filter(threshold == 0.5) %>% pull(total_cost)))))
cat(sprintf("  At p*=%.2f -> Recall increases from %.1f%% to %.1f%% (FN dropped from %d to %d)\n",
            opt_threshold, recall_50 * 100, opt_row$recall * 100, fn_50, opt_row$fn))

# ---------------------------------------------------------------------------
# 6. Per-commodity breakdown
# ---------------------------------------------------------------------------
cat("\n6. Per-commodity test breakdown ...\n")

test_imp_eval <- test_imp %>%
  mutate(
    pred_baseline = baseline_pred,
    pred_mlr      = mlr_pred,
    pred_ridge    = ridge_pred,
    pred_lasso    = lasso_pred,
    pred_step     = step_pred,
    pred_logit_p  = logit_prob,
    pred_logit_50 = logit_pred_50,
    pred_logit_opt= as.integer(logit_prob >= opt_threshold)
  )

per_food <- test_imp_eval %>%
  group_by(commodity) %>%
  summarise(
    n             = n(),
    mae_baseline  = mean(abs(next_absolute_change_pct - pred_baseline), na.rm = TRUE),
    mae_mlr       = mean(abs(next_absolute_change_pct - pred_mlr), na.rm = TRUE),
    mae_ridge     = mean(abs(next_absolute_change_pct - pred_ridge), na.rm = TRUE),
    mae_lasso     = mean(abs(next_absolute_change_pct - pred_lasso), na.rm = TRUE),
    mae_step      = mean(abs(next_absolute_change_pct - pred_step), na.rm = TRUE),
    brier_logit   = mean((pred_logit_p - next_large_change)^2, na.rm = TRUE),
    pct_large_true = mean(next_large_change) * 100,
    .groups = "drop"
  )

print(per_food)

# ---------------------------------------------------------------------------
# 7. Visualisations
# ---------------------------------------------------------------------------
cat("\n7. Creating enhanced evaluation plots ...\n")

# a) MAE comparison bar chart
p_mae <- cont_results %>%
  ggplot(aes(x = reorder(model, mae), y = mae, fill = model)) +
  geom_col(width = 0.5, alpha = 0.9) +
  geom_text(aes(label = sprintf("%.2f%%", mae)), hjust = -0.1, colour = "#e2e8f0", size = 3.5) +
  coord_flip() +
  scale_fill_manual(values = c(
    "Baseline"     = "#38bdf8",
    "MLR"          = "#fb923c",
    "Ridge"        = "#4ade80",
    "LASSO"        = "#a78bfa",
    "Stepwise_AIC" = "#f43f5e"
  )) +
  scale_y_continuous(labels = label_percent(scale = 1), expand = expansion(mult = c(0, 0.25))) +
  labs(
    title    = "Model Comparison — Test Set MAE (Lower is Better)",
    subtitle = sprintf("Test period: April–September 2025 (n=%d)", nrow(test_df)),
    x = NULL, y = "MAE (percentage points)"
  ) +
  theme_food() + theme(legend.position = "none")

ggsave(file.path(PLOT_DIR, "10_mae_comparison.png"), p_mae, width = 8, height = 4.5, dpi = 150, bg = "#1a1a2e")

# b) Ridge predicted vs actual
p_scatter <- ggplot(test_imp_eval, aes(x = next_absolute_change_pct, y = pred_ridge, colour = commodity)) +
  geom_abline(slope = 1, intercept = 0, colour = "#f1f5f9", linetype = "dashed", linewidth = 0.8) +
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

ggsave(file.path(PLOT_DIR, "11_ridge_pred_vs_actual.png"), p_scatter, width = 8, height = 6, dpi = 150, bg = "#1a1a2e")

# c) Logistic probability calibration
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
  geom_abline(slope = 1, intercept = 0, colour = "#f1f5f9", linetype = "dashed", linewidth = 0.8) +
  geom_point(aes(size = n), colour = "#38bdf8", alpha = 0.85) +
  geom_line(colour = "#38bdf8", linewidth = 1) +
  scale_size_continuous(range = c(2, 8)) +
  scale_x_continuous(labels = label_percent(), limits = c(0, 1)) +
  scale_y_continuous(labels = label_percent(), limits = c(0, 1)) +
  labs(
    title    = "Logistic Regression — Probability Calibration (Test Set)",
    subtitle = sprintf("Brier score: %.4f · ROC-AUC: %.4f", brier_50, roc_auc),
    x = "Mean Predicted Probability", y = "Observed Fraction (>10% Change)",
    size = "n"
  ) +
  theme_food()

ggsave(file.path(PLOT_DIR, "12_logit_calibration.png"), p_cal, width = 7, height = 6, dpi = 150, bg = "#1a1a2e")

# d) Per-food MAE
p_food_mae <- per_food %>%
  select(commodity, mae_baseline, mae_mlr, mae_ridge, mae_lasso) %>%
  pivot_longer(c(mae_baseline, mae_mlr, mae_ridge, mae_lasso), names_to = "model", values_to = "mae") %>%
  mutate(model = recode(model,
                        mae_baseline = "Baseline",
                        mae_mlr      = "MLR",
                        mae_ridge    = "Ridge",
                        mae_lasso    = "LASSO")) %>%
  ggplot(aes(x = commodity, y = mae, fill = model)) +
  geom_col(position = "dodge", width = 0.6, alpha = 0.9) +
  scale_fill_manual(values = c("Baseline" = "#38bdf8", "MLR" = "#fb923c", "Ridge" = "#4ade80", "LASSO" = "#a78bfa"), name = "Model") +
  scale_y_continuous(labels = label_percent(scale = 1)) +
  labs(
    title    = "Per-Commodity MAE — Continuous Models (Test Set)",
    subtitle = "Lower is better across regional supply chains",
    x = NULL, y = "MAE (percentage points)"
  ) +
  theme_food()

ggsave(file.path(PLOT_DIR, "13_per_food_mae.png"), p_food_mae, width = 10, height = 5, dpi = 150, bg = "#1a1a2e")

# e) ROC Curve & Cost-Asymmetric Cutoff Trade-off Plot
roc_df <- tibble(
  fpr = 1 - roc_obj$specificities,
  tpr = roc_obj$sensitivities
)

p_roc <- ggplot(roc_df, aes(x = fpr, y = tpr)) +
  geom_abline(slope = 1, intercept = 0, linetype = "dashed", colour = "#94a3b8") +
  geom_line(colour = "#38bdf8", linewidth = 1.2) +
  annotate("text", x = 0.6, y = 0.25,
           label = sprintf("ROC-AUC = %.4f", roc_auc),
           colour = "#38bdf8", size = 5, fontface = "bold") +
  labs(title = "Receiver Operating Characteristic (ROC)",
       subtitle = "Discriminative ability for severe price shock (>10%)",
       x = "False Positive Rate (1 - Specificity)", y = "True Positive Rate (Sensitivity / Recall)") +
  theme_food()

p_cost <- ggplot(procurement_cost_matrix, aes(x = threshold, y = total_cost)) +
  geom_line(colour = "#f43f5e", linewidth = 1.2) +
  geom_point(colour = "#f43f5e", size = 2) +
  geom_vline(xintercept = opt_threshold, linetype = "dashed", colour = "#4ade80", linewidth = 1) +
  geom_vline(xintercept = 0.50, linetype = "dotted", colour = "#fb923c", linewidth = 1) +
  annotate("text", x = opt_threshold - 0.02, y = max(procurement_cost_matrix$total_cost) * 0.9,
           label = sprintf("Optimal p* = %.2f\n(Min Cost = %.0f)", opt_threshold, opt_row$total_cost),
           colour = "#4ade80", hjust = 1, size = 3.5, fontface = "bold") +
  annotate("text", x = 0.52, y = max(procurement_cost_matrix$total_cost) * 0.7,
           label = "Default p = 0.50\n(High Stockout Cost)",
           colour = "#fb923c", hjust = 0, size = 3.5) +
  labs(title = "Procurement Penalty Cost vs Alert Threshold",
       subtitle = "Penalty: Stockout (C_FN=4.0) vs Buffer Holding (C_FP=1.0)",
       x = "Alert Probability Cutoff (p)", y = "Total Procurement Penalty Cost") +
  theme_food()

p_combined_decisions <- p_roc + p_cost + plot_layout(ncol = 2)
ggsave(file.path(PLOT_DIR, "16_procurement_cost_tradeoff.png"),
       p_combined_decisions, width = 13, height = 5.5, dpi = 150, bg = "#1a1a2e")
cat("  Saved: analytics/outputs/plots/16_procurement_cost_tradeoff.png\n")

# ---------------------------------------------------------------------------
# 8. Save updated model bundle and evaluation CSVs
# ---------------------------------------------------------------------------
cat("\n8. Saving comprehensive evaluation reports ...\n")

bundle$test_performance <- list(
  continuous         = cont_results,
  binary             = bin_results,
  per_commodity      = per_food,
  cost_optimization  = list(
    matrix           = procurement_cost_matrix,
    optimal_cutoff   = opt_threshold,
    c_fn             = C_FN,
    c_fp             = C_FP
  ),
  test_period        = list(start = min(test_df$date), end = max(test_df$date)),
  n_test             = nrow(test_df)
)

for (out in c(OUTPUT_DIR, OUTPUT_MODELS_DIR)) {
  saveRDS(bundle, file.path(out, "model_bundle.rds"))
}
cat("   Updated: model_bundle.rds\n")

# Master Evaluation CSV
all_eval <- bind_rows(
  cont_results %>%
    mutate(eval_type = "continuous", metric_set = "MAE+RMSE+R2_oos") %>%
    select(eval_type, model, mae, rmse, r2_oos),
  bin_results %>%
    mutate(eval_type = "binary") %>%
    select(eval_type, model, brier_score, roc_auc, precision, recall, f1, accuracy)
)

# Assumption Diagnostics Summary CSV
assump_df <- tibble(
  assumption = c(
    "Multicollinearity (Max VIF)",
    "Heteroscedasticity (Breusch-Pagan)",
    "Normality of Residuals (Shapiro-Wilk)",
    "Independence (Durbin-Watson)"
  ),
  test_used = c("VIF", "Studentized Breusch-Pagan", "Shapiro-Wilk (n=3000)", "Durbin-Watson"),
  statistic = c(
    max(bundle$assumption_diagnostics$vif),
    bundle$assumption_diagnostics$breusch_pagan$statistic,
    bundle$assumption_diagnostics$shapiro_wilk$statistic,
    bundle$assumption_diagnostics$durbin_watson$statistic
  ),
  p_value = c(
    NA_real_,
    bundle$assumption_diagnostics$breusch_pagan$p_value,
    bundle$assumption_diagnostics$shapiro_wilk$p_value,
    bundle$assumption_diagnostics$durbin_watson$p_value
  ),
  verdict = c(
    ifelse(max(bundle$assumption_diagnostics$vif) > 10, "Violated (Severe Collinearity)", "Pass"),
    ifelse(bundle$assumption_diagnostics$breusch_pagan$p_value < 0.05, "Violated (Heteroscedastic)", "Pass"),
    ifelse(bundle$assumption_diagnostics$shapiro_wilk$p_value < 0.05, "Violated (Non-Gaussian Skew)", "Pass"),
    "Panel / Boundary"
  )
)

for (out in c(OUTPUT_DIR, OUTPUT_REPORTS_DIR)) {
  write_csv(all_eval, file.path(out, "evaluation_results.csv"))
  write_csv(per_food, file.path(out, "per_food_evaluation.csv"))
  write_csv(assump_df, file.path(out, "assumption_diagnostics.csv"))
  write_csv(procurement_cost_matrix, file.path(out, "procurement_cost_matrix.csv"))
}

cat(sprintf("   Saved: %s\n", file.path(OUTPUT_REPORTS_DIR, "evaluation_results.csv")))
cat(sprintf("   Saved: %s\n", file.path(OUTPUT_REPORTS_DIR, "per_food_evaluation.csv")))
cat(sprintf("   Saved: %s\n", file.path(OUTPUT_REPORTS_DIR, "assumption_diagnostics.csv")))
cat(sprintf("   Saved: %s\n", file.path(OUTPUT_REPORTS_DIR, "procurement_cost_matrix.csv")))

cat("\n=== Phase 6 Complete ===\n")
