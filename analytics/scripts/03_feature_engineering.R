# =============================================================================
# 03_feature_engineering.R  (Members 1 & 3)
# Purpose : Build the modelling dataset from cleaned prices.
#           Sources feature_builder.R for all feature logic.
# Run     : Rscript analytics/03_feature_engineering.R
# Outputs : analytics/outputs/modelling_dataset.csv
# =============================================================================

suppressPackageStartupMessages({
  library(dplyr)
  library(tidyr)
  library(readr)
  library(lubridate)
})

cat("=== Phase 3b: Feature Engineering ===\n\n")

source(file.path("analytics", "utils", "feature_builder.R"))

CLEAN_CANDIDATES <- c(
  file.path("analytics", "outputs", "data", "cleaned_food_prices.csv"),
  file.path("analytics", "outputs", "cleaned_food_prices.csv")
)
CLEAN_FILE      <- CLEAN_CANDIDATES[file.exists(CLEAN_CANDIDATES)][1]
OUTPUT_DIR      <- file.path("analytics", "outputs")
OUTPUT_DATA_DIR <- file.path("analytics", "outputs", "data")
dir.create(OUTPUT_DIR, recursive = TRUE, showWarnings = FALSE)
dir.create(OUTPUT_DATA_DIR, recursive = TRUE, showWarnings = FALSE)

if (is.na(CLEAN_FILE) || !file.exists(CLEAN_FILE)) {
  stop("Run analytics/scripts/01_data_cleaning.R first.\nMissing: cleaned_food_prices.csv")
}

# ---------------------------------------------------------------------------
# 1. Load cleaned data (only observed months — exclude inserted NAs for now)
# ---------------------------------------------------------------------------
cat("1. Loading cleaned prices ...\n")

df_clean <- read_csv(CLEAN_FILE, show_col_types = FALSE) %>%
  mutate(date = as.Date(date)) %>%
  filter(!is.na(price))   # Use only observed months for feature building

cat(sprintf("   Rows with observed price: %d\n", nrow(df_clean)))

# ---------------------------------------------------------------------------
# 2. Verify required columns
# ---------------------------------------------------------------------------
required <- c("commodity_id", "market_id", "date", "price")
missing_cols <- setdiff(required, names(df_clean))
if (length(missing_cols) > 0) {
  stop("Missing columns: ", paste(missing_cols, collapse = ", "))
}

# ---------------------------------------------------------------------------
# 3. Build features using the shared feature_builder.R
# ---------------------------------------------------------------------------
cat("2. Building features (lags, rolling stats, targets) ...\n")

modelling_dataset <- build_features(
  df_clean,
  large_change_threshold_pct = 10,
  min_consecutive            = 3
)

# ---------------------------------------------------------------------------
# 4. Add additional metadata columns from original clean file
# ---------------------------------------------------------------------------
meta_cols <- df_clean %>%
  select(commodity_id, market_id, date, commodity, market, admin1, admin2,
         spike_flag, month_inserted) %>%
  distinct()

modelling_dataset <- modelling_dataset %>%
  left_join(meta_cols %>% select(-any_of(names(modelling_dataset)[
    names(modelling_dataset) %in% c("commodity", "market", "admin1", "admin2",
                                     "spike_flag", "month_inserted")
  ])),
  by = c("commodity_id", "market_id", "date"))

# ---------------------------------------------------------------------------
# 5. Flag sets
# ---------------------------------------------------------------------------
cat("3. Splitting into training-eligible and inference-only rows ...\n")

training_rows   <- modelling_dataset %>% filter(!is_inference_only, has_sufficient_history)
inference_rows  <- modelling_dataset %>% filter(is_inference_only, has_sufficient_history)
excluded_rows   <- modelling_dataset %>% filter(!has_sufficient_history)

cat(sprintf("   Training-eligible rows  : %d\n", nrow(training_rows)))
cat(sprintf("   Inference-only rows     : %d\n", nrow(inference_rows)))
cat(sprintf("   Excluded (insufficient history): %d\n", nrow(excluded_rows)))

# ---------------------------------------------------------------------------
# 6. Chronological split assignment
# ---------------------------------------------------------------------------
cat("4. Assigning train/val/test splits ...\n")

modelling_dataset <- modelling_dataset %>%
  mutate(
    split = case_when(
      is_inference_only                  ~ "inference",
      !has_sufficient_history            ~ "excluded",
      date <= as.Date("2024-12-01")      ~ "train",
      date <= as.Date("2025-03-01")      ~ "validation",
      TRUE                               ~ "test"
    )
  )

split_counts <- modelling_dataset %>%
  count(split) %>%
  arrange(match(split, c("train", "validation", "test", "inference", "excluded")))
print(split_counts)

# ---------------------------------------------------------------------------
# 7. Check for data leakage
# ---------------------------------------------------------------------------
cat("5. Checking for data leakage ...\n")

predictor_names <- get_predictor_names()

# All predictors must be derived from date <= target row's date
# (enforced structurally by feature_builder.R's lag/lead logic)
# Verify no NA in predictors for training rows
pred_na_counts <- training_rows %>%
  select(all_of(predictor_names)) %>%
  summarise(across(everything(), ~sum(is.na(.))))

cat("   NA counts in predictors (training rows):\n")
print(pred_na_counts)

# ---------------------------------------------------------------------------
# 8. Summary of target variable
# ---------------------------------------------------------------------------
cat("\n6. Target variable summary (training rows):\n")

target_summary <- training_rows %>%
  summarise(
    n                  = n(),
    mean_abs_change    = mean(next_absolute_change_pct, na.rm = TRUE),
    median_abs_change  = median(next_absolute_change_pct, na.rm = TRUE),
    sd_abs_change      = sd(next_absolute_change_pct, na.rm = TRUE),
    max_abs_change     = max(next_absolute_change_pct, na.rm = TRUE),
    pct_large_changes  = mean(next_large_change, na.rm = TRUE) * 100
  )

cat(sprintf("   n training rows              : %d\n", target_summary$n))
cat(sprintf("   Mean |Δ%%| next month         : %.2f%%\n", target_summary$mean_abs_change))
cat(sprintf("   Median |Δ%%| next month       : %.2f%%\n", target_summary$median_abs_change))
cat(sprintf("   SD                           : %.2f%%\n", target_summary$sd_abs_change))
cat(sprintf("   Max |Δ%%|                     : %.2f%%\n", target_summary$max_abs_change))
cat(sprintf("   %% months with >10%% change   : %.1f%%\n", target_summary$pct_large_changes))

cat("\n   Per-commodity breakdown:\n")
print(
  training_rows %>%
    group_by(commodity) %>%
    summarise(
      n              = n(),
      mean_target    = round(mean(next_absolute_change_pct, na.rm = TRUE), 2),
      pct_large      = round(mean(next_large_change, na.rm = TRUE) * 100, 1),
      .groups        = "drop"
    )
)

# ---------------------------------------------------------------------------
# 9. Save modelling dataset
# ---------------------------------------------------------------------------
cat("\n7. Saving modelling dataset ...\n")

# Final column order
final_cols <- c(
  "commodity_id", "commodity",
  "market_id", "market", "admin1", "admin2",
  "date", "price",
  "monthly_change_pct", "absolute_change_pct",
  "log_price", "log_change",
  "lag_change_1", "rolling_volatility_3m", "mean_absolute_change_3m",
  "month_of_year",
  "target_month", "next_absolute_change_pct", "next_large_change",
  "has_sufficient_history", "is_inference_only",
  "spike_flag", "month_inserted",
  "split"
)

# Only keep columns that actually exist
final_cols <- intersect(final_cols, names(modelling_dataset))

out_dataset <- modelling_dataset %>% select(all_of(final_cols))
for (out in c(OUTPUT_DIR, OUTPUT_DATA_DIR)) {
  write_csv(out_dataset, file.path(out, "modelling_dataset.csv"))
}

cat(sprintf("   Saved: %s\n", file.path(OUTPUT_DATA_DIR, "modelling_dataset.csv")))
cat(sprintf("   Total rows: %d | Columns: %d\n",
            nrow(modelling_dataset), length(final_cols)))

cat("\n=== Phase 3b Complete ===\n")
cat("Next steps (can run in parallel):\n")
cat("  Rscript analytics/scripts/04_statistical_inference.R\n")
cat("  Rscript analytics/scripts/05_model_training.R\n")
