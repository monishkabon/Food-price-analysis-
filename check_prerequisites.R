# =============================================================================
# check_prerequisites.R
# Purpose : Verify R version and all required packages are available.
#           Run this script first before any other analytics or API script.
# =============================================================================

cat("=== Food Price Volatility Analysis — Prerequisite Check ===\n\n")

# --- 1. R version -------------------------------------------------------
r_version <- as.numeric(paste(R.Version()$major,
                               sub("\\..*", "", R.Version()$minor),
                               sep = "."))
cat(sprintf("R version : %s.%s\n", R.Version()$major, R.Version()$minor))
if (r_version < 4.3) {
  warning("R >= 4.3 is recommended. Some packages may not install correctly.")
} else {
  cat("  [OK] R version is sufficient\n")
}

# --- 2. Required packages -----------------------------------------------
required_packages <- c(
  # Data handling
  "readxl", "dplyr", "tidyr", "lubridate", "stringr", "purrr",
  # Visualisation
  "ggplot2", "scales", "patchwork",
  # Statistical modelling
  "glmnet", "caret", "lme4",
  # API
  "plumber", "jsonlite",
  # Utilities
  "zoo", "tibble", "readr"
)

cat("\nChecking required packages:\n")
missing_packages <- character(0)

for (pkg in required_packages) {
  if (requireNamespace(pkg, quietly = TRUE)) {
    cat(sprintf("  [OK] %s\n", pkg))
  } else {
    cat(sprintf("  [MISSING] %s\n", pkg))
    missing_packages <- c(missing_packages, pkg)
  }
}

# --- 3. Dataset file ----------------------------------------------------
cat("\nChecking dataset file:\n")
data_path <- file.path("dataset", "wfp_food_prices_lka.xlsx")
if (file.exists(data_path)) {
  cat(sprintf("  [OK] %s found\n", data_path))
} else {
  cat(sprintf("  [MISSING] %s not found — place the WFP Excel file in dataset/\n",
              data_path))
}

# --- 4. Output directories ---------------------------------------------
cat("\nCreating output directories (if not present):\n")
dirs_to_create <- c(
  "analytics/outputs",
  "analytics/outputs/plots",
  "analytics/utils"
)
for (d in dirs_to_create) {
  dir.create(d, recursive = TRUE, showWarnings = FALSE)
  cat(sprintf("  [OK] %s\n", d))
}

# --- 5. Summary ---------------------------------------------------------
cat("\n=== Summary ===\n")
if (length(missing_packages) == 0) {
  cat("All packages are installed. You are ready to run the analytics pipeline.\n")
  cat("Recommended execution order:\n")
  cat("  Rscript analytics/01_data_cleaning.R\n")
  cat("  Rscript analytics/02_descriptive_analysis.R\n")
  cat("  Rscript analytics/03_feature_engineering.R\n")
  cat("  Rscript analytics/04_statistical_inference.R\n")
  cat("  Rscript analytics/05_model_training.R\n")
  cat("  Rscript analytics/06_model_evaluation.R\n")
  cat("  Rscript api/run_api.R\n")
} else {
  cat(sprintf("%d package(s) are missing. Install them with:\n",
              length(missing_packages)))
  cat(sprintf('  install.packages(c(%s))\n',
              paste(sprintf('"%s"', missing_packages), collapse = ", ")))
}
