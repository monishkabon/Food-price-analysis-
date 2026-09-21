# =============================================================================
# utils/feature_builder.R
# Purpose : Single authoritative source for feature construction.
#           Sourced by BOTH training scripts and the API.
#           Never compute features differently in two places.
# =============================================================================

# ---------------------------------------------------------------------------
# build_features()
# Input  : A data frame with columns:
#            commodity_id, market_id, date (Date), price (numeric)
#            The frame must be sorted by commodity_id, market_id, date.
# Output : The same frame with additional columns:
#            monthly_change_pct, absolute_change_pct,
#            lag_change_1, rolling_volatility_3m,
#            mean_absolute_change_3m, month_of_year,
#            log_price, log_change
#          And (when outcomes are available):
#            target_month, next_absolute_change_pct, next_large_change
# ---------------------------------------------------------------------------

build_features <- function(df,
                           large_change_threshold_pct = 10,
                           min_consecutive = 3) {

  if (!requireNamespace("dplyr",   quietly = TRUE)) stop("dplyr required")
  if (!requireNamespace("zoo",     quietly = TRUE)) stop("zoo required")
  if (!requireNamespace("lubridate", quietly = TRUE)) stop("lubridate required")

  library(dplyr)
  library(zoo)
  library(lubridate)

  # Ensure sorted
  df <- df %>%
    arrange(commodity_id, market_id, date)

  # Helper: safe lag that returns NA when the previous row is a different series
  # or when there is a calendar gap
  df <- df %>%
    group_by(commodity_id, market_id) %>%
    mutate(
      # Log price for volatility computation
      log_price = log(price),

      # Monthly % change (current month vs prior month)
      # Set to NA if the gap to prior row is not exactly 1 month
      prev_date      = lag(date),
      month_gap      = as.integer(round(as.numeric(date - prev_date) / 30.44)),
      monthly_change_pct = ifelse(
        !is.na(prev_date) & month_gap == 1,
        (price - lag(price)) / lag(price) * 100,
        NA_real_
      ),
      absolute_change_pct = abs(monthly_change_pct),

      # Log change (for rolling volatility)
      log_change = ifelse(
        !is.na(prev_date) & month_gap == 1,
        log_price - lag(log_price),
        NA_real_
      )
    ) %>%
    ungroup()

  # Rolling statistics (window = 3, require at least 2 obs)
  df <- df %>%
    group_by(commodity_id, market_id) %>%
    mutate(
      # Lag 1 of absolute change
      lag_change_1 = lag(absolute_change_pct, 1),

      # 3-month rolling SD of log changes (volatility proxy)
      rolling_volatility_3m = rollapplyr(
        log_change, width = 3, FUN = sd, fill = NA, na.rm = TRUE, partial = 2
      ),

      # 3-month rolling mean of absolute changes
      mean_absolute_change_3m = rollapplyr(
        absolute_change_pct, width = 3, FUN = mean, fill = NA, na.rm = TRUE, partial = 2
      ),

      # Seasonal feature
      month_of_year = month(date)
    ) %>%
    ungroup()

  # Target variables (shift absolute_change_pct forward by one row)
  df <- df %>%
    group_by(commodity_id, market_id) %>%
    mutate(
      target_month             = lead(date, 1),
      next_absolute_change_pct = lead(absolute_change_pct, 1),
      next_large_change        = as.integer(
        !is.na(next_absolute_change_pct) &
          next_absolute_change_pct > large_change_threshold_pct
      )
    ) %>%
    ungroup()

  # Mark rows usable for supervised training vs inference-only
  df <- df %>%
    mutate(
      is_inference_only = is.na(next_absolute_change_pct),
      # Require min_consecutive prior non-NA log_changes for rolling features
      has_sufficient_history = !is.na(mean_absolute_change_3m) &
                               !is.na(lag_change_1)
    )

  # Clean up intermediary columns
  df <- df %>%
    select(-prev_date, -month_gap)

  return(df)
}


# ---------------------------------------------------------------------------
# get_predictor_names()
# Returns the canonical list of predictor column names for modelling.
# Must be kept in sync with the feature engineering logic above.
# ---------------------------------------------------------------------------

get_predictor_names <- function() {
  c(
    "lag_change_1",
    "rolling_volatility_3m",
    "mean_absolute_change_3m",
    "month_of_year",
    "absolute_change_pct"    # current month's magnitude
  )
}


# ---------------------------------------------------------------------------
# prepare_latest_row()
# Given a history data frame for a single food-market series (already
# feature-enriched with build_features()), extract the most recent row
# that can be used for inference.
# Returns a named list ready for prediction, or an error message string.
# ---------------------------------------------------------------------------

prepare_latest_row <- function(series_df) {
  # Must already have features built
  required_cols <- c("has_sufficient_history", get_predictor_names(), "date", "price")
  missing <- setdiff(required_cols, names(series_df))
  if (length(missing) > 0) {
    return(list(
      ok    = FALSE,
      error = paste("Missing columns:", paste(missing, collapse = ", "))
    ))
  }

  latest <- series_df %>%
    filter(has_sufficient_history) %>%
    arrange(desc(date)) %>%
    slice(1)

  if (nrow(latest) == 0) {
    return(list(
      ok    = FALSE,
      error = "Insufficient history to compute rolling features (need at least 3 consecutive months)."
    ))
  }

  list(
    ok   = TRUE,
    row  = latest,
    last_observed_month = format(latest$date, "%Y-%m"),
    forecast_month      = format(latest$date + months(1), "%Y-%m")
  )
}
