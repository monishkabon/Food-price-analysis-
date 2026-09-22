# =============================================================================
# api/plumber.R  (Member 4)
# Purpose : R Plumber API — 8 endpoints serving the React frontend.
# Run     : Rscript api/run_api.R
# =============================================================================

# Plumber evaluates this file with api/ as the working directory.
PROJ_ROOT <- normalizePath("..", mustWork = TRUE)

BUNDLE_PATH  <- file.path(PROJ_ROOT, "analytics", "outputs", "model_bundle.rds")
CLEANED_PATH <- file.path(PROJ_ROOT, "analytics", "outputs", "cleaned_food_prices.csv")
EVAL_PATH    <- file.path(PROJ_ROOT, "analytics", "outputs", "evaluation_results.csv")
PFOOD_PATH   <- file.path(PROJ_ROOT, "analytics", "outputs", "per_food_evaluation.csv")
FEATURE_SRC  <- file.path(PROJ_ROOT, "analytics", "utils", "feature_builder.R")

suppressPackageStartupMessages({
  library(plumber)
  library(dplyr)
  library(readr)
  library(jsonlite)
  library(lubridate)
  library(caret)
  library(glmnet)
})

source(FEATURE_SRC)
source(file.path(PROJ_ROOT, "api", "middleware", "validators.R"))

# ---------------------------------------------------------------------------
# Load assets at startup (not per-request)
# ---------------------------------------------------------------------------
BUNDLE  <- NULL
PRICES  <- NULL
API_READY <- FALSE

load_assets <- function() {
  tryCatch({
    BUNDLE  <<- readRDS(BUNDLE_PATH)
    PRICES  <<- read_csv(CLEANED_PATH, show_col_types = FALSE) %>%
                  mutate(date = as.Date(date))
    API_READY <<- TRUE
    message("[API] Assets loaded successfully. Version: ", BUNDLE$version)
  }, error = function(e) {
    message("[API] WARNING: Could not load assets — ", conditionMessage(e))
    message("[API] Run the analytics pipeline first:")
    message("[API]   Rscript analytics/01_data_cleaning.R")
    message("[API]   ...through...")
    message("[API]   Rscript analytics/06_model_evaluation.R")
  })
}

load_assets()

# ---------------------------------------------------------------------------
# CORS filter (allow React dev server)
# ---------------------------------------------------------------------------
#* @filter cors
function(req, res) {
  res$setHeader("Access-Control-Allow-Origin",  "*")
  res$setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
  res$setHeader("Access-Control-Allow-Headers", "Content-Type")
  if (req$REQUEST_METHOD == "OPTIONS") {
    res$status <- 204
    return(list())
  }
  plumber::forward()
}

# ===========================================================================
# GET /api/health
# ===========================================================================
#* @get /api/health
#* @tag system
#* @serializer json
function(res) {
  list(
    status      = ifelse(API_READY, "ok", "degraded"),
    api_ready   = API_READY,
    model_version = if (!is.null(BUNDLE)) BUNDLE$version else NULL,
    data_cutoff   = if (!is.null(BUNDLE)) BUNDLE$data_cutoff else NULL,
    timestamp   = format(Sys.time(), "%Y-%m-%dT%H:%M:%SZ")
  )
}

# ===========================================================================
# GET /api/foods
# ===========================================================================
#* @get /api/foods
#* @tag data
#* @serializer json
function(res) {
  if (!API_READY) return(json_error(res, 503, "API not ready — run the analytics pipeline first."))

  foods <- PRICES %>%
    filter(!is.na(price)) %>%
    distinct(commodity_id, commodity) %>%
    arrange(commodity) %>%
    rename(id = commodity_id, name = commodity)

  json_ok(foods)
}

# ===========================================================================
# GET /api/markets?commodity_id=...
# ===========================================================================
#* @get /api/markets
#* @param commodity_id:int The commodity ID to filter markets by
#* @tag data
#* @serializer json
function(commodity_id, res) {
  if (!API_READY) return(json_error(res, 503, "API not ready."))

  cid <- suppressWarnings(as.integer(commodity_id))
  if (is.na(cid)) return(json_error(res, 400, "commodity_id must be an integer."))
  if (!cid %in% BUNDLE$known_commodity_ids) {
    return(json_error(res, 404, sprintf("commodity_id %d not found.", cid)))
  }

  markets <- PRICES %>%
    filter(commodity_id == cid, !is.na(price)) %>%
    distinct(market_id, market, admin1, admin2) %>%
    arrange(market) %>%
    rename(id = market_id, name = market, province = admin1, district = admin2)

  json_ok(markets)
}

# ===========================================================================
# GET /api/prices/history?commodity_id=...&market_id=...
# ===========================================================================
#* @get /api/prices/history
#* @param commodity_id:int
#* @param market_id:int
#* @tag data
#* @serializer json
function(commodity_id, market_id, res) {
  if (!API_READY) return(json_error(res, 503, "API not ready."))

  v <- validate_ids(commodity_id, market_id, BUNDLE)
  if (!v$ok) return(json_error(res, v$status, v$error))

  history <- PRICES %>%
    filter(commodity_id == v$commodity_id, market_id == v$market_id,
           !is.na(price)) %>%
    select(date, price, monthly_change_pct, absolute_change_pct, spike_flag) %>%
    arrange(date) %>%
    mutate(
      date                = format(date, "%Y-%m"),
      price               = round(price, 2),
      monthly_change_pct  = round(monthly_change_pct, 4),
      absolute_change_pct = round(absolute_change_pct, 4)
    )

  if (nrow(history) == 0) {
    return(json_error(res, 404,
      sprintf("No price history for commodity_id=%d, market_id=%d.",
              v$commodity_id, v$market_id)))
  }

  meta <- list(
    commodity_id  = v$commodity_id,
    market_id     = v$market_id,
    currency      = "LKR",
    unit          = "KG",
    price_type    = "Retail",
    data_cutoff   = BUNDLE$data_cutoff,
    n_months      = nrow(history),
    first_month   = history$date[1],
    last_month    = history$date[nrow(history)]
  )

  json_ok(list(meta = meta, series = history))
}

# ===========================================================================
# GET /api/volatility/history?commodity_id=...&market_id=...
# ===========================================================================
#* @get /api/volatility/history
#* @param commodity_id:int
#* @param market_id:int
#* @tag data
#* @serializer json
function(commodity_id, market_id, res) {
  if (!API_READY) return(json_error(res, 503, "API not ready."))

  v <- validate_ids(commodity_id, market_id, BUNDLE)
  if (!v$ok) return(json_error(res, v$status, v$error))

  series <- PRICES %>%
    filter(commodity_id == v$commodity_id, market_id == v$market_id,
           !is.na(price)) %>%
    arrange(date)

  if (nrow(series) < 3) {
    return(json_error(res, 422,
      "Insufficient data to compute rolling volatility (need ≥ 3 months)."))
  }

  enriched <- build_features(series %>%
                               select(commodity_id, market_id, date, price))

  vol_series <- enriched %>%
    filter(!is.na(rolling_volatility_3m)) %>%
    select(date, rolling_volatility_3m, mean_absolute_change_3m) %>%
    mutate(
      date                    = format(date, "%Y-%m"),
      rolling_volatility_3m   = round(rolling_volatility_3m, 6),
      mean_absolute_change_3m = round(mean_absolute_change_3m, 4)
    )

  json_ok(list(
    meta   = list(commodity_id = v$commodity_id, market_id = v$market_id,
                  window_months = 3, data_cutoff = BUNDLE$data_cutoff),
    series = vol_series
  ))
}

# ===========================================================================
# POST /api/predictions
# Body: { "commodity_id": int, "market_id": int }
# ===========================================================================
#* @post /api/predictions
#* @tag predictions
#* @serializer json
function(req, res) {
  if (!API_READY) return(json_error(res, 503, "API not ready."))

  # Parse body
  body <- tryCatch(jsonlite::fromJSON(req$postBody), error = function(e) NULL)
  if (is.null(body)) {
    return(json_error(res, 400, "Request body must be valid JSON with commodity_id and market_id."))
  }

  v <- validate_ids(body$commodity_id, body$market_id, BUNDLE)
  if (!v$ok) return(json_error(res, v$status, v$error))

  # Retrieve latest history for this series
  series <- PRICES %>%
    filter(commodity_id == v$commodity_id, market_id == v$market_id,
           !is.na(price)) %>%
    arrange(date)

  if (nrow(series) < 4) {
    return(json_error(res, 422,
      "Insufficient price history. Need at least 4 consecutive months."))
  }

  # Build features using the canonical feature builder
  enriched <- build_features(series %>%
                               select(commodity_id, market_id, date, price))

  prep <- prepare_latest_row(enriched)
  if (!prep$ok) return(json_error(res, 422, prep$error))

  latest_row <- prep$row

  # Apply preprocessing
  impute_fn_api <- function(row) {
    for (col in names(BUNDLE$impute_medians)) {
      if (col %in% names(row) && is.na(row[[col]])) {
        row[[col]] <- BUNDLE$impute_medians[[col]]
      }
    }
    row
  }
  latest_imputed <- impute_fn_api(latest_row)

  X_pred <- tryCatch(
    predict(BUNDLE$preproc_caret,
            latest_imputed %>% select(all_of(BUNDLE$predictors))) %>% as.matrix(),
    error = function(e) NULL
  )
  if (is.null(X_pred)) {
    return(json_error(res, 500, "Feature preprocessing failed. Check predictor schema."))
  }

  # Generate continuous prediction (Ridge)
  ridge_pred <- pmax(as.vector(predict(BUNDLE$ridge_model, newx = X_pred)), 0)

  # Generate probability prediction (Logistic)
  logit_prob <- tryCatch(
    predict(BUNDLE$logit_model, newdata = as.data.frame(X_pred),
            type = "response"),
    error = function(e) NA_real_
  )

  # Warnings
  warnings <- character(0)
  if (isTRUE(latest_row$spike_flag)) {
    warnings <- c(warnings, "The most recent month was flagged as a potential price spike. Prediction may be less reliable.")
  }
  if (nrow(series) < 12) {
    warnings <- c(warnings, sprintf("This series has only %d months of history. Predictions are less reliable with short histories.", nrow(series)))
  }

  json_ok(
    list(
      commodity_id                = v$commodity_id,
      market_id                   = v$market_id,
      last_observed_month         = prep$last_observed_month,
      forecast_month              = prep$forecast_month,
      expected_absolute_change_pct = round(ridge_pred, 4),
      large_change_probability    = round(as.numeric(logit_prob), 4),
      large_change_threshold_pct  = BUNDLE$large_change_threshold_pct,
      model_version               = BUNDLE$version,
      data_cutoff                 = BUNDLE$data_cutoff,
      disclaimer = paste(
        "This prediction estimates movement size (up or down), not direction.",
        "It is based on historical patterns and not a live market signal.",
        sprintf("Data ends %s.", BUNDLE$data_cutoff)
      )
    ),
    warnings = warnings
  )
}

# ===========================================================================
# GET /api/models/performance
# ===========================================================================
#* @get /api/models/performance
#* @tag models
#* @serializer json
function(res) {
  if (!API_READY) return(json_error(res, 503, "API not ready."))
  if (is.null(BUNDLE$test_performance)) {
    return(json_error(res, 404,
      "Evaluation results not yet available. Run analytics/06_model_evaluation.R."))
  }

  perf <- BUNDLE$test_performance

  json_ok(list(
    continuous       = perf$continuous,
    binary           = perf$binary,
    per_commodity    = perf$per_commodity,
    test_period      = perf$test_period,
    n_test           = perf$n_test,
    model_version    = BUNDLE$version,
    large_change_threshold_pct = BUNDLE$large_change_threshold_pct,
    limitations = c(
      "Models trained on historical data up to December 2024.",
      "Performance may degrade for commodity-market pairs with sparse data.",
      "Ridge regression constrains negative predictions to 0.",
      "Observations within the same food-market series are not independent."
    )
  ))
}

# ===========================================================================
# GET /api/metadata
# ===========================================================================
#* @get /api/metadata
#* @tag system
#* @serializer json
function(res) {
  list(
    source       = "WFP Food Prices — Sri Lanka (Humanitarian Data Exchange)",
    source_url   = "https://data.humdata.org/dataset/wfp-food-prices-for-sri-lanka",
    currency     = "LKR",
    unit         = "KG",
    price_type   = "Retail",
    data_cutoff  = if (!is.null(BUNDLE)) BUNDLE$data_cutoff else "unknown",
    model_version = if (!is.null(BUNDLE)) BUNDLE$version else "unknown",
    api_version  = "1.0.0",
    disclaimer   = paste(
      "This is a historical prototype built on data ending September 2025.",
      "It is not a live forecasting service."
    )
  )
}
