# =============================================================================
# api/run_api.R
# Purpose : Start the R Plumber API.
# Run     : Rscript api/run_api.R
# =============================================================================

library(plumber)

# Resolve path to plumber.R relative to project root
api_file <- file.path("api", "plumber.R")
if (!file.exists(api_file)) {
  stop("Cannot find api/plumber.R. Run this script from the project root:\n",
       "  Rscript api/run_api.R")
}

HOST <- Sys.getenv("API_HOST", unset = "0.0.0.0")
PORT <- as.integer(Sys.getenv("API_PORT", unset = "8000"))

cat(sprintf("=== Food Price Volatility API ===\n"))
cat(sprintf("Starting on http://%s:%d\n", HOST, PORT))
cat("Swagger docs: http://localhost:", PORT, "/__docs__/\n", sep = "")
cat("Health check: http://localhost:", PORT, "/api/health\n\n", sep = "")

pr <- plumb(api_file)

pr$run(
  host   = HOST,
  port   = PORT,
  debug  = FALSE,
  docs   = TRUE,
  quiet  = FALSE
)
