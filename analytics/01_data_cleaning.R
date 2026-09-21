# =============================================================================
# 01_data_cleaning.R  (Member 1)
# Purpose : Load raw WFP data, filter, validate, insert missing months,
#           flag anomalies, and save cleaned outputs.
# Run     : Rscript analytics/01_data_cleaning.R
# Outputs : analytics/outputs/cleaned_food_prices.csv
#           analytics/outputs/series_coverage.csv
#           analytics/outputs/data_quality_summary.csv
# =============================================================================

suppressPackageStartupMessages({
  library(readxl)
  library(dplyr)
  library(tidyr)
  library(lubridate)
  library(readr)
  library(stringr)
})

cat("=== Phase 2: Data Cleaning ===\n\n")

# ---------------------------------------------------------------------------
# 0. Configuration
# ---------------------------------------------------------------------------

RAW_FILE        <- file.path("dataset", "wfp_food_prices_lka.xlsx")
OUTPUT_DIR      <- file.path("analytics", "outputs")
dir.create(OUTPUT_DIR, recursive = TRUE, showWarnings = FALSE)

# Candidate commodities (will be matched case-insensitively via partial match)
CANDIDATE_FOODS <- c(
  "rice - white",
  "lentils",
  "onions - imported",
  "potatoes - imported",
  "tomatoes"
)

# Spike flag threshold: flag changes larger than this (%) for manual review
SPIKE_THRESHOLD_PCT <- 50

# Minimum number of months in a food-market series to retain it
MIN_MONTHS_REQUIRED <- 12

# ---------------------------------------------------------------------------
# 1. Load raw data
# ---------------------------------------------------------------------------
cat("1. Loading raw data from:", RAW_FILE, "\n")

if (!file.exists(RAW_FILE)) {
  stop("Raw data file not found: ", RAW_FILE,
       "\nPlace wfp_food_prices_lka.xlsx in the dataset/ directory.")
}

raw <- read_excel(RAW_FILE)
cat(sprintf("   Raw rows: %d | Columns: %d\n", nrow(raw), ncol(raw)))

# Print all column names for inspection
cat("   Columns found:", paste(names(raw), collapse = ", "), "\n\n")

# ---------------------------------------------------------------------------
# 2. Standardise column names (handle variations in WFP export format)
# ---------------------------------------------------------------------------
names(raw) <- tolower(str_replace_all(names(raw), "[ -]", "_"))

# Resolve common alternative names
col_map <- list(
  date        = c("date"),
  admin1      = c("admin1"),
  admin2      = c("admin2"),
  market      = c("market"),
  market_id   = c("market_id"),
  commodity   = c("commodity"),
  commodity_id = c("commodity_id"),
  unit        = c("unit"),
  pricetype   = c("pricetype", "price_type"),
  currency    = c("currency"),
  price       = c("price"),
  category    = c("category")
)

resolve_col <- function(df, aliases) {
  for (alias in aliases) {
    if (alias %in% names(df)) return(alias)
  }
  return(NULL)
}

# Build a canonical rename list
canonical_names <- list()
for (canonical in names(col_map)) {
  found <- resolve_col(raw, col_map[[canonical]])
  if (!is.null(found) && found != canonical) {
    canonical_names[[found]] <- canonical
  }
}
if (length(canonical_names) > 0) {
  raw <- rename(raw, !!!canonical_names)
}

# ---------------------------------------------------------------------------
# 3. Parse and validate dates
# ---------------------------------------------------------------------------
cat("2. Parsing dates ...\n")

raw <- raw %>%
  mutate(
    date = case_when(
      inherits(date, "Date")     ~ as.Date(date),
      inherits(date, "POSIXct")  ~ as.Date(date),
      TRUE                       ~ suppressWarnings(
        parse_date_time(as.character(date),
                        orders = c("Ymd", "mdY", "dmY", "Y/m/d"))
      ) %>% as.Date()
    )
  )

invalid_dates <- sum(is.na(raw$date))
cat(sprintf("   Invalid/unparseable dates: %d\n", invalid_dates))

# ---------------------------------------------------------------------------
# 4. Enumerate all commodities present in the dataset
# ---------------------------------------------------------------------------
cat("\n3. All commodities in dataset:\n")
commodity_list <- raw %>%
  count(commodity, sort = TRUE)
print(commodity_list, n = Inf)

# ---------------------------------------------------------------------------
# 5. Apply inclusion filters
# ---------------------------------------------------------------------------
cat("\n4. Applying inclusion filters (Retail, LKR, KG, candidate foods) ...\n")

# Normalise commodity column for matching
raw <- raw %>%
  mutate(commodity_lower = tolower(trimws(commodity)))

# Match candidate foods using partial string match
food_pattern <- paste(tolower(CANDIDATE_FOODS), collapse = "|")

filtered <- raw %>%
  filter(
    tolower(trimws(pricetype)) == "retail",
    tolower(trimws(currency))  == "lkr",
    tolower(trimws(unit))      == "kg",
    str_detect(commodity_lower, food_pattern),
    !is.na(price),
    price > 0
  )

cat(sprintf("   Rows after filtering: %d\n", nrow(filtered)))

# Print which candidate foods were matched
cat("   Matched commodities:\n")
matched <- filtered %>% distinct(commodity) %>% pull(commodity)
for (m in matched) cat(sprintf("     - %s\n", m))

# ---------------------------------------------------------------------------
# 6. Assign numeric IDs if not present
# ---------------------------------------------------------------------------
if (!"commodity_id" %in% names(filtered)) {
  id_map <- filtered %>%
    distinct(commodity) %>%
    mutate(commodity_id = row_number())
  filtered <- filtered %>% left_join(id_map, by = "commodity")
}

if (!"market_id" %in% names(filtered)) {
  mkt_map <- filtered %>%
    distinct(market) %>%
    mutate(market_id = row_number())
  filtered <- filtered %>% left_join(mkt_map, by = "market")
}

# ---------------------------------------------------------------------------
# 7. Standardise to one row per food-market-month
#    (keep median price if duplicates exist)
# ---------------------------------------------------------------------------
cat("\n5. Aggregating to one row per commodity-market-month ...\n")

filtered <- filtered %>%
  mutate(year_month = floor_date(date, "month"))

dup_check <- filtered %>%
  group_by(commodity_id, market_id, year_month) %>%
  summarise(n_obs = n(), .groups = "drop") %>%
  filter(n_obs > 1)

cat(sprintf("   Duplicate commodity-market-month combinations: %d\n", nrow(dup_check)))

clean <- filtered %>%
  group_by(commodity_id, commodity, market_id, market, admin1, admin2,
           year_month) %>%
  summarise(
    price    = median(price, na.rm = TRUE),
    n_merged = n(),
    .groups  = "drop"
  ) %>%
  rename(date = year_month)

# ---------------------------------------------------------------------------
# 8. Insert missing calendar months per food-market series
# ---------------------------------------------------------------------------
cat("\n6. Inserting missing calendar months ...\n")

all_series <- clean %>% distinct(commodity_id, market_id)

fill_calendar <- function(series_key, df) {
  series <- df %>%
    filter(commodity_id == series_key$commodity_id,
           market_id    == series_key$market_id)

  if (nrow(series) < 2) return(series %>% mutate(month_inserted = FALSE))

  full_months <- seq.Date(min(series$date), max(series$date), by = "month")
  expanded <- tibble(date = full_months) %>%
    left_join(series, by = "date") %>%
    mutate(
      commodity_id  = series_key$commodity_id,
      market_id     = series_key$market_id,
      commodity     = series$commodity[1],
      market        = series$market[1],
      admin1        = series$admin1[1],
      admin2        = series$admin2[1],
      month_inserted = is.na(price)
    )
  return(expanded)
}

clean_full <- purrr::map_dfr(
  split(all_series, seq(nrow(all_series))),
  fill_calendar,
  df = clean
)

n_inserted <- sum(clean_full$month_inserted, na.rm = TRUE)
cat(sprintf("   Calendar months inserted (price = NA): %d\n", n_inserted))

# ---------------------------------------------------------------------------
# 9. Compute monthly changes and flag spikes
# ---------------------------------------------------------------------------
cat("\n7. Computing monthly changes and flagging price spikes ...\n")

clean_full <- clean_full %>%
  arrange(commodity_id, market_id, date) %>%
  group_by(commodity_id, market_id) %>%
  mutate(
    prev_price          = lag(price),
    prev_date           = lag(date),
    month_gap           = as.integer(round(as.numeric(date - prev_date) / 30.44)),
    monthly_change_pct  = ifelse(month_gap == 1 & !is.na(prev_price),
                                 (price - prev_price) / prev_price * 100,
                                 NA_real_),
    absolute_change_pct = abs(monthly_change_pct),
    # Flag — do NOT remove; genuine spikes are important to research
    spike_flag          = !is.na(absolute_change_pct) &
                          absolute_change_pct > SPIKE_THRESHOLD_PCT
  ) %>%
  ungroup() %>%
  select(-prev_price, -prev_date, -month_gap)

n_spikes <- sum(clean_full$spike_flag, na.rm = TRUE)
cat(sprintf("   Price spike flags (>%d%% change): %d\n",
            SPIKE_THRESHOLD_PCT, n_spikes))

# ---------------------------------------------------------------------------
# 10. Assess food-market coverage and select eligible series
# ---------------------------------------------------------------------------
cat("\n8. Assessing series coverage ...\n")

series_coverage <- clean_full %>%
  group_by(commodity_id, commodity, market_id, market, admin1, admin2) %>%
  summarise(
    first_month      = min(date, na.rm = TRUE),
    last_month       = max(date, na.rm = TRUE),
    total_months     = n(),
    observed_months  = sum(!is.na(price)),
    missing_months   = sum(is.na(price)),
    pct_coverage     = round(sum(!is.na(price)) / n() * 100, 1),
    n_spikes         = sum(spike_flag, na.rm = TRUE),
    is_eligible      = observed_months >= MIN_MONTHS_REQUIRED,
    .groups          = "drop"
  ) %>%
  arrange(desc(observed_months))

cat(sprintf("   Total food-market series: %d\n", nrow(series_coverage)))
cat(sprintf("   Eligible series (≥%d months): %d\n",
            MIN_MONTHS_REQUIRED,
            sum(series_coverage$is_eligible)))

# Restrict cleaned dataset to eligible series
eligible_keys <- series_coverage %>%
  filter(is_eligible) %>%
  select(commodity_id, market_id)

clean_eligible <- clean_full %>%
  semi_join(eligible_keys, by = c("commodity_id", "market_id"))

cat(sprintf("   Rows in eligible series: %d\n", nrow(clean_eligible)))

# ---------------------------------------------------------------------------
# 11. Validity check — every row must have identifiable food/market/month
# ---------------------------------------------------------------------------
cat("\n9. Final validity check ...\n")

invalid_rows <- clean_eligible %>%
  filter(is.na(commodity_id) | is.na(market_id) | is.na(date))

if (nrow(invalid_rows) > 0) {
  warning(sprintf("%d rows failed validity check — inspect manually.",
                  nrow(invalid_rows)))
} else {
  cat("   [OK] All rows have identifiable commodity, market, and date.\n")
}

# ---------------------------------------------------------------------------
# 12. Build data quality summary
# ---------------------------------------------------------------------------
data_quality_summary <- tibble(
  metric  = c(
    "raw_rows",
    "rows_after_filter",
    "duplicate_combos_resolved",
    "calendar_months_inserted",
    "spike_flags",
    "total_series",
    "eligible_series",
    "final_rows"
  ),
  value   = c(
    nrow(raw),
    nrow(filtered),
    nrow(dup_check),
    n_inserted,
    n_spikes,
    nrow(series_coverage),
    sum(series_coverage$is_eligible),
    nrow(clean_eligible)
  ),
  notes   = c(
    "All rows in the Excel file",
    "After Retail/LKR/KG/commodity filter",
    "Aggregated to median price",
    "Price set to NA for inserted months",
    paste0("Month-over-month change > ", SPIKE_THRESHOLD_PCT, "% — NOT removed"),
    "Unique commodity-market pairs in eligible commodities",
    paste0("Series with ≥ ", MIN_MONTHS_REQUIRED, " observed months"),
    "Final cleaned rows (eligible series)"
  )
)

# ---------------------------------------------------------------------------
# 13. Save outputs
# ---------------------------------------------------------------------------
cat("\n10. Saving outputs ...\n")

# Cleaned prices (eligible series only, all months including inserted)
write_csv(clean_eligible %>%
            select(commodity_id, commodity, market_id, market,
                   admin1, admin2, date, price,
                   monthly_change_pct, absolute_change_pct,
                   spike_flag, month_inserted, n_merged),
          file.path(OUTPUT_DIR, "cleaned_food_prices.csv"))
cat(sprintf("   Saved: %s\n", file.path(OUTPUT_DIR, "cleaned_food_prices.csv")))

write_csv(series_coverage,
          file.path(OUTPUT_DIR, "series_coverage.csv"))
cat(sprintf("   Saved: %s\n", file.path(OUTPUT_DIR, "series_coverage.csv")))

write_csv(data_quality_summary,
          file.path(OUTPUT_DIR, "data_quality_summary.csv"))
cat(sprintf("   Saved: %s\n", file.path(OUTPUT_DIR, "data_quality_summary.csv")))

cat("\n=== Phase 2 Complete ===\n")
cat("Next step: Rscript analytics/02_descriptive_analysis.R\n")
