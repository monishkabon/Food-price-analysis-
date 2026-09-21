# Methodology Document — Food Price Volatility Prediction

**Project:** 2026-DS-12 — Predicting Regional Staple Food Price Volatility in Sri Lanka  
**Module:** IT3081 Statistical Modelling, SLIIT  
**Data cutoff:** September 2025  
**Document version:** 1.0  

---

## 1. Prediction Targets

### 1.1 Primary Target — Movement Magnitude (Continuous)

We predict the **absolute percentage price change** in the next calendar month:

$$
y_{t+1} = \left|\frac{P_{t+1} - P_t}{P_t}\right| \times 100
$$

| Property | Value |
|---|---|
| Variable name | `next_absolute_change_pct` |
| Type | Continuous, non-negative (%) |
| Interpretation | Size of price movement regardless of direction |
| Domain | [0, ∞) — constrained to ≥ 0 in post-processing |

This measures **price instability**, not price direction. A value of 10 means the price moved 10% up or down compared with the previous month.

### 1.2 Secondary Target — Large-Movement Indicator (Binary)

We predict whether the next month's absolute change exceeds a threshold θ:

$$
z_{t+1} = \mathbf{1}\left[y_{t+1} > \theta\right]
$$

| Property | Value |
|---|---|
| Variable name | `next_large_change` |
| Type | Binary (0 / 1) |
| Threshold θ (provisional) | **10%** |
| Interpretation | 1 = "price instability alert month", 0 = "stable month" |

The 10% threshold is provisional and will be reviewed against the empirical distribution of `next_absolute_change_pct` in Phase 3. A threshold calibrated to the 75th percentile of historical absolute changes may be adopted if 10% proves too rare or too common in this dataset.

---

## 2. Forecast Horizon

| Property | Value |
|---|---|
| Horizon | 1 calendar month ahead |
| Input window | Features computed from months up to and including month *t* |
| Prediction for | Month *t+1* |
| Lag requirement | At least 3 consecutive prior months needed to compute rolling features |

---

## 3. Units and Scope

| Dimension | Scope |
|---|---|
| Price type | Retail only |
| Currency | LKR (Sri Lankan Rupee) |
| Unit | KG (kilogram) |
| Commodities | Rice (white), Lentils, Onions (imported), Potatoes (imported), Tomatoes |
| Geography | All markets present in the WFP dataset with sufficient coverage |

---

## 4. Data Source and Cutoff

| Property | Value |
|---|---|
| Dataset | WFP Food Prices — Sri Lanka (HDX) |
| File | `wfp_food_prices_lka.xlsx` |
| Temporal coverage | January 2004 – September 2025 |
| **Data cutoff** | **September 2025** |
| Application type | **Historical prototype** — not a live forecasting service |

> **Important:** Because the dataset ends in September 2025, predictions labelled "next-month" refer to the month immediately following the most recent observed month in each food–market series. The application must display this cutoff prominently in the UI.

---

## 5. Chronological Data Split

| Split | Target month range | Purpose |
|---|---|---|
| Training | Up to December 2024 | Model fitting |
| Validation | January 2025 – March 2025 | Hyperparameter selection |
| Test | April 2025 – September 2025 | Final held-out evaluation |
| Inference rows | October 2025 (no observed outcome) | Prediction only, not used for training |

Rows without a known `next_absolute_change_pct` (i.e., the latest row per food–market) are kept in the modelling dataset as **inference-only rows** and are excluded from all supervised training and evaluation.

---

## 6. Feature Engineering Principles

1. All lags and rolling statistics are computed **within** the same food–market series. No cross-series contamination is permitted.
2. A gap in the monthly series (missing month) means the adjacent months **cannot** be treated as consecutive. Lagged features across a gap are set to `NA`.
3. No future information may appear in any predictor column. The feature for month *t* uses only data available by the end of month *t*.

---

## 7. Model Candidate Summary

| Model | Target | Purpose |
|---|---|---|
| Rolling-average baseline | `next_absolute_change_pct` | Benchmark — no modelling |
| Multiple Linear Regression | `next_absolute_change_pct` | Interpretable continuous prediction |
| Ridge Regression | `next_absolute_change_pct` | Handles correlated predictors |
| Logistic Regression | `next_large_change` | Probability of instability alert |

---

## 8. Evaluation Metrics

| Output | Metric | Description |
|---|---|---|
| Movement magnitude | MAE | Mean absolute error in percentage points |
| Movement magnitude | RMSE | Root mean squared error in percentage points |
| Event probability | Brier score | Calibration of predicted probabilities |
| Alert decision | Precision | Of months flagged as high-risk, fraction correctly flagged |
| Alert decision | Recall | Of truly high-risk months, fraction correctly identified |
| Alert decision | Confusion matrix | Full breakdown at a 0.5 probability cutoff |

---

## 9. Plain-Language Description for End Users

> This tool estimates how much a food price is likely to **move** next month — not whether it will rise or fall. A prediction of "8%" means the model expects the price to change by roughly 8% in either direction. The probability figure answers the question "How likely is a large price swing (>10%)?" This helps procurement teams decide how frequently to review supplier contracts.
