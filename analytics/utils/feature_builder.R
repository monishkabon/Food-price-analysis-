# =============================================================================
# analytics/utils/feature_builder.R
# Purpose : Shared feature-generation logic used by the analytics pipeline and
#           the Plumber API for price-change modelling.
# =============================================================================

suppressPackageStartupMessages({
    library(dplyr)
    library(tidyr)
    library(lubridate)
    library(zoo)
})

# ---------------------------------------------------------------------------
# Feature builder
# ---------------------------------------------------------------------------
# Builds a canonical modelling frame for a food-market series with:
#   - lag-based price-change features
#   - rolling volatility and rolling mean absolute change
#   - next-month target variables for prediction
#   - series suitability flags used by the model pipeline
# ---------------------------------------------------------------------------
build_features <- function(df,
                           large_change_threshold_pct = 10,
                           min_consecutive = 3) {
    if (is.null(df) || nrow(df) == 0) {
        return(tibble())
    }

    required_cols <- c("commodity_id", "market_id", "date", "price")
    missing_cols <- setdiff(required_cols, names(df))
    if (length(missing_cols) > 0) {
        stop(
            "Missing required columns in feature builder: ",
            paste(missing_cols, collapse = ", ")
        )
    }

    series <- df %>%
        mutate(
            date = as.Date(date),
            price = as.numeric(price)
        ) %>%
        arrange(commodity_id, market_id, date) %>%
        group_by(commodity_id, market_id) %>%
        mutate(
            monthly_change_pct = ifelse(
                !is.na(price) & !is.na(lag(price)) & lag(price) != 0,
                100 * (price - lag(price)) / lag(price),
                NA_real_
            ),
            absolute_change_pct = abs(monthly_change_pct),
            log_price = ifelse(!is.na(price) & price > 0, log(price), NA_real_),
            log_change = ifelse(!is.na(log_price) & !is.na(lag(log_price)),
                log_price - lag(log_price),
                NA_real_
            ),
            lag_change_1 = lag(monthly_change_pct, 1),
            rolling_volatility_3m = zoo::rollapplyr(
                monthly_change_pct,
                width = 3,
                FUN = function(x) {
                    x <- x[!is.na(x)]
                    if (length(x) < 2) {
                        return(NA_real_)
                    }
                    sd(x, na.rm = TRUE)
                },
                fill = NA_real_,
                align = "right"
            ),
            mean_absolute_change_3m = zoo::rollapplyr(
                absolute_change_pct,
                width = 3,
                FUN = function(x) {
                    x <- x[!is.na(x)]
                    if (length(x) == 0) {
                        return(NA_real_)
                    }
                    mean(x, na.rm = TRUE)
                },
                fill = NA_real_,
                align = "right"
            ),
            month_of_year = as.integer(format(date, "%m")),
            target_month = as.integer(format(date, "%m")),
            next_absolute_change_pct = abs(lead(monthly_change_pct, 1)),
            next_large_change = ifelse(!is.na(next_absolute_change_pct),
                next_absolute_change_pct > large_change_threshold_pct,
                FALSE
            ),
            n_obs = n(),
            has_sufficient_history = n_obs >= max(12L, min_consecutive + 1L),
            is_inference_only = has_sufficient_history & is.na(next_absolute_change_pct),
            .groups = "drop"
        ) %>%
        ungroup()

    series <- series %>%
        mutate(next_large_change = ifelse(is.na(next_absolute_change_pct), FALSE, next_large_change))

    series
}

# ---------------------------------------------------------------------------
# Predictor list used by model training and API preprocessing
# ---------------------------------------------------------------------------
get_predictor_names <- function() {
    c(
        "log_price",
        "log_change",
        "lag_change_1",
        "rolling_volatility_3m",
        "mean_absolute_change_3m",
        "month_of_year",
        "target_month",
        "absolute_change_pct"
    )
}

# ---------------------------------------------------------------------------
# Prepare the latest row from an enriched series for one-step forecasting
# ---------------------------------------------------------------------------
prepare_latest_row <- function(enriched_df) {
    if (is.null(enriched_df) || nrow(enriched_df) == 0) {
        return(list(ok = FALSE, error = "No data available for prediction."))
    }

    df <- enriched_df %>%
        arrange(date) %>%
        filter(!is.na(price))

    if (nrow(df) == 0) {
        return(list(ok = FALSE, error = "No usable price observations."))
    }

    latest <- df %>% slice(n())
    if (nrow(latest) == 0) {
        return(list(ok = FALSE, error = "Could not identify the latest row."))
    }

    forecast_month <- as.Date(latest$date) %m+% months(1)
    list(
        ok = TRUE,
        row = latest,
        last_observed_month = format(as.Date(latest$date), "%Y-%m"),
        forecast_month = format(forecast_month, "%Y-%m")
    )
}
