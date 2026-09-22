# =============================================================================
# analytics/run_pipeline.R
# Purpose : Master execution script for the entire analytics pipeline.
#           Runs scripts 01 through 06 sequentially from project root.
# Run     : Rscript analytics/run_pipeline.R
# =============================================================================

cat("================================================================\n")
cat("Starting Food Price Volatility Analytics Pipeline\n")
cat("Project : IT3081 Statistical Modelling (2026-DS-12)\n")
cat("Time    : ", format(Sys.time(), "%Y-%m-%d %H:%M:%S"), "\n")
cat("================================================================\n\n")

scripts <- c(
  "analytics/scripts/01_data_cleaning.R",
  "analytics/scripts/02_descriptive_analysis.R",
  "analytics/scripts/03_feature_engineering.R",
  "analytics/scripts/04_statistical_inference.R",
  "analytics/scripts/05_model_training.R",
  "analytics/scripts/06_model_evaluation.R"
)

pipeline_start <- Sys.time()

for (i in seq_along(scripts)) {
  s <- scripts[i]
  cat(sprintf("\n>>> [%d/%d] Running %s ...\n", i, length(scripts), s))
  start_t <- Sys.time()
  
  status <- tryCatch({
    source(s)
    TRUE
  }, error = function(e) {
    cat(sprintf("\n[ERROR] Step %d failed: %s\n", i, conditionMessage(e)))
    FALSE
  })
  
  if (!status) {
    stop(sprintf("Pipeline halted at step %d (%s).", i, s))
  }
  
  duration <- round(as.numeric(difftime(Sys.time(), start_t, units = "secs")), 1)
  cat(sprintf(">>> [%d/%d] Finished %s in %s seconds.\n", i, length(scripts), s, duration))
}

total_duration <- round(as.numeric(difftime(Sys.time(), pipeline_start, units = "secs")), 1)
cat("\n================================================================\n")
cat(sprintf("Pipeline completed successfully in %s seconds.\n", total_duration))
cat("Outputs available in:\n")
cat("  - analytics/outputs/data/     (Clean & modelling datasets)\n")
cat("  - analytics/outputs/models/   (Serialized model_bundle.rds)\n")
cat("  - analytics/outputs/reports/  (Inference report & evaluation metrics)\n")
cat("  - analytics/outputs/plots/    (Visualisation charts)\n")
cat("Next: Start the API server with:\n")
cat("  Rscript api/run_api.R\n")
cat("================================================================\n")
