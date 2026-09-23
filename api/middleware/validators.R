# =============================================================================
# api/middleware/validators.R
# Purpose : Request validation helpers used by plumber.R
# =============================================================================

# Load asset paths (resolved relative to API directory)
find_asset <- function(paths) {
  for (p in paths) {
    if (file.exists(p)) return(p)
  }
  return(paths[1])
}

BUNDLE_PATH  <- find_asset(c(
  file.path("..", "analytics", "outputs", "models", "model_bundle.rds"),
  file.path("..", "analytics", "outputs", "model_bundle.rds")
))
CLEANED_PATH <- find_asset(c(
  file.path("..", "analytics", "outputs", "data", "cleaned_food_prices.csv"),
  file.path("..", "analytics", "outputs", "cleaned_food_prices.csv")
))
EVAL_PATH    <- find_asset(c(
  file.path("..", "analytics", "outputs", "reports", "evaluation_results.csv"),
  file.path("..", "analytics", "outputs", "evaluation_results.csv")
))

# ---------------------------------------------------------------------------
# validate_ids()
# Returns list(ok=TRUE) or list(ok=FALSE, error="message")
# ---------------------------------------------------------------------------
validate_ids <- function(commodity_id, market_id, bundle) {
  cid <- suppressWarnings(as.integer(commodity_id))
  mid <- suppressWarnings(as.integer(market_id))

  if (is.na(cid)) {
    return(list(ok = FALSE, status = 400,
                error = "commodity_id must be an integer."))
  }
  if (is.na(mid)) {
    return(list(ok = FALSE, status = 400,
                error = "market_id must be an integer."))
  }
  if (!cid %in% bundle$known_commodity_ids) {
    return(list(ok = FALSE, status = 404,
                error = sprintf("commodity_id %d not found.", cid)))
  }
  if (!mid %in% bundle$known_market_ids) {
    return(list(ok = FALSE, status = 404,
                error = sprintf("market_id %d not found.", mid)))
  }

  combo_ok <- any(bundle$known_combos$commodity_id == cid &
                  bundle$known_combos$market_id    == mid)
  if (!combo_ok) {
    return(list(ok = FALSE, status = 422,
                error = sprintf(
                  "The combination commodity_id=%d + market_id=%d is not supported. ",
                  cid, mid
                ) %>% paste0("Call GET /api/markets?commodity_id=", cid,
                             " to list valid markets.")))
  }

  list(ok = TRUE, commodity_id = cid, market_id = mid)
}

# ---------------------------------------------------------------------------
# json_error()  — consistent error envelope
# ---------------------------------------------------------------------------
json_error <- function(res, status_code, message) {
  res$status <- status_code
  list(success = FALSE, error = message)
}

# ---------------------------------------------------------------------------
# json_ok()  — consistent success envelope
# ---------------------------------------------------------------------------
json_ok <- function(data, warnings = NULL) {
  result <- list(success = TRUE, data = data)
  if (!is.null(warnings) && length(warnings) > 0) {
    result$warnings <- warnings
  }
  result
}
