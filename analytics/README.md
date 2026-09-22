# Analytics Pipeline — Food Price Volatility Analysis

This directory contains the complete statistical analysis, feature engineering, and predictive modeling pipeline for **IT3081 Statistical Modelling (2026-DS-12)**.

---

## Directory Structure

```text
analytics/
├── run_pipeline.R                  # Master execution script (runs 01 through 06)
├── scripts/                        # Sequential pipeline scripts
│   ├── 01_data_cleaning.R          # Phase 2: Ingest, clean, validate WFP data
│   ├── 02_descriptive_analysis.R   # Phase 3a: Exploratory & trend visualisations
│   ├── 03_feature_engineering.R    # Phase 3b: Construct rolling features & targets
│   ├── 04_statistical_inference.R  # Phase 4: Hypothesis tests (Kruskal, LME, Logit)
│   ├── 05_model_training.R         # Phase 5: Train Baseline, MLR, Ridge, Logistic
│   └── 06_model_evaluation.R       # Phase 6: Held-out test evaluation & metrics
├── utils/
│   └── feature_builder.R           # Single authoritative source for feature calculation
└── outputs/
    ├── data/                       # Cleaned and feature-engineered datasets (.csv)
    │   ├── cleaned_food_prices.csv
    │   ├── data_quality_summary.csv
    │   ├── modelling_dataset.csv
    │   └── series_coverage.csv
    ├── models/                     # Trained and serialized model bundle (.rds)
    │   └── model_bundle.rds
    ├── reports/                    # Statistical reports and evaluation summaries
    │   ├── evaluation_results.csv
    │   ├── per_food_evaluation.csv
    │   ├── statistical_report.txt
    │   └── statistical_results.csv
    └── plots/                      # Publication-ready visualizations (.png)
        ├── 01_historical_prices.png
        ├── 02_monthly_change_distribution.png
        ├── 03_rolling_volatility.png
        ├── 04_commodity_comparison.png
        ├── 05_market_comparison.png
        ├── 06_coverage_heatmap.png
        ├── 07_seasonal_patterns.png
        ├── 08_q1_food_instability.png
        ├── 09_q3_volatility_logit.png
        ├── 10_mae_comparison.png
        ├── 11_ridge_pred_vs_actual.png
        ├── 12_logit_calibration.png
        └── 13_per_food_mae.png
```

---

## Execution Guide

### Prerequisites
From the project root, verify required packages:
```bash
Rscript check_prerequisites.R
```

### Run Entire Pipeline
To run all 6 phases end-to-end:
```bash
Rscript analytics/run_pipeline.R
```

### Run Individual Steps
```bash
Rscript analytics/scripts/01_data_cleaning.R
Rscript analytics/scripts/02_descriptive_analysis.R
Rscript analytics/scripts/03_feature_engineering.R
Rscript analytics/scripts/04_statistical_inference.R
Rscript analytics/scripts/05_model_training.R
Rscript analytics/scripts/06_model_evaluation.R
```

### Start API Service
Once the pipeline has completed:
```bash
Rscript api/run_api.R
```
