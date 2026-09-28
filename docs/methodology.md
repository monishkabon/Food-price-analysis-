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

| Model | Target | Mechanism | Strategic Purpose in Procurement |
|---|---|---|---|
| Rolling-average baseline | `next_absolute_change_pct` | Trailing 3-month mean | Benchmark — robust to post-crisis disinflation |
| Multiple Linear Regression | `next_absolute_change_pct` | Parametric OLS | Captures extreme volatility on perishable produce |
| Ridge Regression (L2) | `next_absolute_change_pct` | L2 coefficient shrinkage | Regularization under correlated features |
| LASSO Regression (L1) | `next_absolute_change_pct` | L1 feature selection | Prunes redundant predictors (retained `mean_absolute_change_3m`) |
| Stepwise Selection (AIC) | `next_absolute_change_pct` | Bidirectional AIC search | Contrast with LASSO; retains saturated feature set |
| Logistic Regression | `next_large_change` | Binary Logit GLM | Calibrated probability of severe price shock (>10%) |

---

## 8. Evaluation Metrics & Decision Optimization

| Output | Metric | Mathematical Definition | Procurement Significance |
|---|---|---|---|
| Movement magnitude | MAE | $\frac{1}{n} \sum \|y - \hat{y}\|$ | Linear average deviation in percentage points |
| Movement magnitude | RMSE | $\sqrt{\frac{1}{n} \sum (y - \hat{y})^2}$ | Quadratic penalty for extreme price spikes |
| Movement magnitude | Out-of-sample $R^2_{oos}$ | $1 - \frac{\sum (y - \hat{y})^2}{\sum (y - \bar{y}_{train})^2}$ | Variance explained relative to historical training mean |
| Event probability | Brier Score | $\frac{1}{n} \sum (p_i - z_i)^2$ | Reliability and calibration of shock probabilities |
| Event discrimination| ROC-AUC | Area under ROC curve | True Positive vs False Positive trade-off (Test: 0.8391) |
| Alert optimization | Cost-Asymmetric Cutoff | $\min_p [4.0(FN) + 1.0(FP)]$ | Shifts cutoff from $0.50$ to $p^* = 0.25$, cutting costs by $30.5\%$ |

---

## 9. Verification of Statistical Assumptions

Classical OLS assumptions were empirically audited using formal diagnostics on the trained MLR specification:
- **Multicollinearity:** $\text{Max VIF} = 13.64$ on `mean_absolute_change_3m` and $12.53$ on `rolling_volatility_3m`. LASSO resolved this by eliminating the redundant volatility feature.
- **Homoscedasticity:** Studentized Breusch-Pagan test rejected constant variance ($BP = 331.32, p < 10^{-60}$). Residual variance widens with price instability.
- **Normality of Residuals:** Shapiro-Wilk test rejected Gaussian errors ($W = 0.6684, p < 10^{-60}$) due to extreme positive price spikes (+206% maximum residual). Standard OLS intervals underestimate tail risk.
- **Panel Autocorrelation:** Durbin-Watson statistic ($DW = 2.20$) indicates localized panel stability, but clustered errors exist across provincial economic centres.

---

## 10. Operational Two-Tier Procurement Architecture

To translate statistical models into supply chain decisions, retail operations adopt a **Two-Tier Architecture**:
1. **Tier 1 (Continuous Baseline):** Use the **3-Month Rolling Average** (Test MAE: $7.74\%$) for monthly working capital allocation and baseline supplier contract pricing on stable staples (Rice, Lentils).
2. **Tier 2 (Tactical Early Warning):** Deploy **Logistic Regression at $p^* = 0.25$** (Recall: $80.9\%$, Precision: $56.1\%$) to trigger emergency forward contracting, supplier diversification, and safety stock releases on high-risk produce (Tomatoes, Onions, Potatoes).

---

## 11. Plain-Language Description for End Users

> This tool estimates how much a food price is likely to **move** next month — not whether it will rise or fall. A prediction of "8%" means the model expects the price to change by roughly 8% in either direction. The probability figure answers the question "How likely is a large price swing (>10%)?" When the shock probability reaches **25% or higher**, procurement teams should immediately lock in forward contracts or release safety stock to avert store stockouts.
