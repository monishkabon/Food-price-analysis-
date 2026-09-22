# Food Price Analysis
 SM Project
 Y3S1 
 2026-DS-12

## Predicting Regional Staple Food Price Volatility for Optimized Retail Procurement in Sri Lanka

A statistical consultancy project evaluating regional commodity price dynamics, market integration, and predictive forecasting to optimize supply chain procurement for a national retail chain.

---

## 1. Project Overview & Business Problem

National supermarket chains and food distributors in Sri Lanka operate within fragmented regional supply chains subject to acute price volatility. The wholesale and retail prices of agricultural staples (such as rice, grains, and vegetables) fluctuate significantly due to seasonal harvest cycles (Maha and Yala), localized weather events, transportation costs between provinces, and currency adjustments.

Operating without an evidence-based statistical forecasting framework leaves procurement leadership exposed to critical operational risks:
* Purchasing inventory during peak market price surges, eroding retail operating margins.
* Facing unexpected stockouts during localized supply disruptions.
* Failing to capture arbitrage opportunities across administrative districts (`admin1` and `admin2`).

This project serves as an independent statistical consultancy engagement designed to transform granular, historical market-level price data into an actionable procurement strategy and early-warning framework for senior retail leadership.

---

## 2. Consultancy Objectives

* **Descriptive Diagnostics:** Analyze historical pricing trends, distributions, and outlier shocks across Sri Lankan markets and commodity categories.
* **Statistical Inference:** Conduct rigorous hypothesis testing—including Two-Sample $t$-tests and One-Way ANOVA—to determine whether price disparities across administrative provinces (`admin1`), districts (`admin2`), and harvest periods are statistically significant.
* **Predictive Statistical Modelling:** Train and validate regularized linear models (Ridge, LASSO, Elastic Net) and Generalized Linear Models (GLMs) to predict commodity price levels and forecast high-volatility price shocks.
* **Critical Methodological Evaluation:** Critically evaluate the applicability of Experimental Design (CRD vs. RCBD), Principal Component Analysis (PCA), Bayesian decision-making, and Time Series forecasting (ARIMA) within food supply chains.
* **Strategic Industry Innovation:** Design an automated "Procurement Early-Warning & Arbitrage Framework" supported by industry expert validation to improve forward contracting and stock buffer allocations.

---

## 3. Data Source

* **Dataset Name:** World Food Programme (WFP) Food Prices for Sri Lanka
* **Source Repository:** [Humanitarian Data Exchange (HDX) - WFP Sri Lanka Dataset](https://data.humdata.org/dataset/wfp-food-prices-for-sri-lanka/resource/3638f0d6-9969-48cf-a919-1d879d037ec6)
* **Temporal Coverage:** Multi-year monthly time series (2004 – Present)
* **Geographic Hierarchy:** Administrative Level 1 (Provinces), Administrative Level 2 (Districts), and Local Consumer Markets

### Primary Schema Attributes

| Column Name | Data Type | Description |
| :--- | :--- | :--- |
| `date` | Date / String | Transaction record date (`YYYY-MM-DD` / `M/D/YYYY`) |
| `year`, `month` | Integer | Temporal markers for seasonal and trend disaggregation |
| `admin1` | Categorical | First-level administrative boundary (e.g., Western, Central, Northern) |
| `admin2` | Categorical | Second-level administrative boundary / District (e.g., Colombo, Kurunegala) |
| `market`, `market_id` | Categorical / Int | Specific physical market center and corresponding identifier |
| `latitude`, `longitude`| Numeric | Geospatial coordinates of the monitored market center |
| `category` | Categorical | High-level commodity classification (e.g., cereals and tubers, vegetables) |
| `commodity`, `commodity_id` | Categorical / Int | Specific food item (e.g., Rice (red nadu), Wheat flour) |
| `unit` | Categorical | Measurement unit of transaction (e.g., KG, L) |
| `pricetype` | Categorical | Trade level classification (`Retail` vs. `Wholesale`) |
| `currency` | Categorical | Denominated currency (`LKR`) |
| `price` | Continuous Numeric | Local commodity price per unit in Sri Lankan Rupees (LKR) |
| `usdprice` | Continuous Numeric | Normalized commodity price in US Dollars (USD) |

---

## 4. Project Roadmap & Deliverable Structure

This repository is structured around the 12 core tasks of the Statistical Innovation Consulting Challenge:

* **Task 1: Understanding the Industry Problem** — Sector background, corporate scenario, and consultancy objectives.
* **Task 2: Research Landscape** — Systematic review of 15+ peer-reviewed studies evaluating econometric price modeling and agricultural supply chains.
* **Task 3: Dataset Understanding & Descriptive Analysis** — Missing value assessment, outlier detection, distribution visualizations, and initial business takeaways.
* **Task 4: Statistical Inference** — Formal hypothesis testing (ANOVA across provinces, Welch’s $t$-tests for seasonal spreads, variance ratio tests).
* **Task 5: Predictive Statistical Modelling** — Multiple Linear Regression, Best Subset Selection, LASSO/Ridge shrinkage, and Logistic Regression for binary volatility spikes.
* **Task 6: Critical Evaluation of Experimental Design** — Methodological review of Completely Randomized Design (CRD) versus Randomized Complete Block Design (RCBD) for future pricing trials.
* **Task 7: Critical Evaluation of PCA** — Dimensionality reduction assessment on correlated commodity baskets.
* **Task 8: Critical Evaluation of Bayesian Statistical Methods** — Applicability of Naïve Bayes and Bayesian Regression with informative priors.
* **Task 9: Time Series Analysis** — Theoretical framework for ARIMA, seasonal decomposition, and autoregressive forecasting.
* **Task 10: Industry Innovation Proposal** — Conceptual architecture for an interactive Procurement Decision Support Dashboard.
* **Task 11: Industry Expert Validation** — Qualitative feedback and critique from supply chain and retail professionals.
* **Task 12: Final Consultancy Recommendations** — Strategic, operational, risk-mitigation, and ethical roadmaps for executive management.

---