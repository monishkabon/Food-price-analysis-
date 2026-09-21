# =============================================================================
# 04_statistical_inference.R  (Member 2)
# Purpose : Formal hypothesis testing for three research questions.
#           Dependence-aware (food/market clustering) methods used throughout.
# Run     : Rscript analytics/04_statistical_inference.R
# Outputs : analytics/outputs/statistical_results.csv
#           analytics/outputs/statistical_report.txt
# =============================================================================

suppressPackageStartupMessages({
  library(dplyr)
  library(tidyr)
  library(readr)
  library(lubridate)
  library(lme4)
  library(ggplot2)
  library(scales)
})

cat("=== Phase 4: Statistical Inference ===\n\n")

MODEL_FILE  <- file.path("analytics", "outputs", "modelling_dataset.csv")
OUTPUT_DIR  <- file.path("analytics", "outputs")
PLOT_DIR    <- file.path("analytics", "outputs", "plots")
dir.create(PLOT_DIR, recursive = TRUE, showWarnings = FALSE)

if (!file.exists(MODEL_FILE)) {
  stop("Run analytics/03_feature_engineering.R first.\nMissing: ", MODEL_FILE)
}

df <- read_csv(MODEL_FILE, show_col_types = FALSE) %>%
  mutate(date = as.Date(date)) %>%
  filter(split %in% c("train", "validation", "test"),
         has_sufficient_history,
         !is.na(next_absolute_change_pct))

cat(sprintf("Inference dataset: %d rows\n\n", nrow(df)))

# --------------------------------------------------------------------------
# Dark theme (shared with descriptive analysis)
# --------------------------------------------------------------------------
theme_food <- function() {
  theme_minimal(base_size = 12) +
    theme(
      plot.background  = element_rect(fill = "#1a1a2e", colour = NA),
      panel.background = element_rect(fill = "#16213e", colour = NA),
      panel.grid.major = element_line(colour = "#2a2a4a"),
      panel.grid.minor = element_blank(),
      plot.title       = element_text(colour = "#e2e8f0", face = "bold", size = 14),
      plot.subtitle    = element_text(colour = "#94a3b8", size = 10),
      plot.caption     = element_text(colour = "#64748b", size = 8),
      axis.text        = element_text(colour = "#94a3b8"),
      axis.title       = element_text(colour = "#cbd5e1"),
      legend.background = element_rect(fill = "#1e293b", colour = NA),
      legend.text      = element_text(colour = "#cbd5e1"),
      legend.title     = element_text(colour = "#e2e8f0"),
      strip.text       = element_text(colour = "#e2e8f0", face = "bold"),
      strip.background = element_rect(fill = "#0f3460", colour = NA)
    )
}

# Collection for all results
results_list <- list()

# ===========================================================================
# QUESTION 1: Do foods differ in price instability?
# Method: Kruskal-Wallis test (non-parametric; relaxes normality assumption)
#         Post-hoc: Dunn's pairwise test
#         Effect size: Eta-squared (rank-based)
# Note  : Observations are clustered within markets and time. We acknowledge
#         this as a limitation and recommend a mixed-model robustness check.
# ===========================================================================
cat("--- Q1: Do foods differ in price instability? ---\n")

kw_test <- kruskal.test(next_absolute_change_pct ~ commodity, data = df)

cat(sprintf("  Kruskal-Wallis: χ²(%d) = %.3f, p = %.4f\n",
            kw_test$parameter, kw_test$statistic, kw_test$p.value))

# Eta-squared (rank-based effect size)
n_total <- nrow(df)
k       <- length(unique(df$commodity))
eta_sq  <- (kw_test$statistic - k + 1) / (n_total - k)
cat(sprintf("  Eta-squared (rank-based): %.4f\n", eta_sq))

# Descriptive statistics per commodity
food_stats <- df %>%
  group_by(commodity) %>%
  summarise(
    n              = n(),
    mean_y         = round(mean(next_absolute_change_pct), 3),
    median_y       = round(median(next_absolute_change_pct), 3),
    sd_y           = round(sd(next_absolute_change_pct), 3),
    pct_large      = round(mean(next_large_change) * 100, 2),
    .groups        = "drop"
  )
cat("\n  Commodity descriptive stats:\n")
print(food_stats)

# Pairwise Wilcoxon (Bonferroni adjusted)
pairwise_result <- pairwise.wilcox.test(
  df$next_absolute_change_pct,
  df$commodity,
  p.adjust.method = "bonferroni"
)
cat("\n  Pairwise Wilcoxon p-values (Bonferroni):\n")
print(pairwise_result$p.value)

# Save Q1 results
results_list[["Q1_kruskal"]] <- tibble(
  question    = "Q1: Food effect on instability",
  test        = "Kruskal-Wallis",
  statistic   = round(kw_test$statistic, 4),
  df          = kw_test$parameter,
  p_value     = round(kw_test$p.value, 6),
  effect_size = round(eta_sq, 4),
  effect_type = "Eta-squared (rank-based)",
  conclusion  = ifelse(kw_test$p.value < 0.05,
                       "Significant food effect on price instability",
                       "No significant food effect detected")
)

# Q1 visualisation
p_q1 <- ggplot(df, aes(x = reorder(commodity, next_absolute_change_pct,
                                    FUN = median),
                        y = next_absolute_change_pct,
                        fill = commodity)) +
  geom_violin(alpha = 0.6, colour = NA) +
  geom_boxplot(width = 0.15, alpha = 0.9, outlier.colour = "#fb923c",
               outlier.size = 0.8) +
  coord_flip() +
  scale_fill_manual(values = c("#38bdf8","#fb923c","#4ade80","#f472b6","#a78bfa")) +
  scale_y_continuous(labels = label_percent(scale = 1)) +
  labs(
    title    = "Q1: Distribution of Next-Month Absolute Price Change by Commodity",
    subtitle = sprintf("Kruskal-Wallis: χ²(%d)=%.2f, p=%.4f, η²=%.3f",
                       kw_test$parameter, kw_test$statistic,
                       kw_test$p.value, eta_sq),
    x = NULL, y = "Next-Month Absolute Price Change (%)"
  ) +
  theme_food() + theme(legend.position = "none")

ggsave(file.path(PLOT_DIR, "08_q1_food_instability.png"),
       p_q1, width = 12, height = 5, dpi = 150, bg = "#1a1a2e")
cat("  Plot saved: 08_q1_food_instability.png\n")

# ===========================================================================
# QUESTION 2: Do markets differ in price instability after controlling for food?
# Method: Linear Mixed-Effects Model
#         Fixed: market (via grouping), Commodity (control)
#         Random: (1 | market_id:commodity_id) — cross-level clustering
#         We compare a null model (only food) vs a market model (food + market)
# ===========================================================================
cat("\n--- Q2: Do markets differ after controlling for food? ---\n")

# Null model (food only)
m_null <- lmer(next_absolute_change_pct ~ commodity + (1 | market_id),
               data = df, REML = FALSE)

# Market model (food + market fixed effect — use admin1 as proxy to keep df manageable)
m_market <- lmer(next_absolute_change_pct ~ commodity + admin1 + (1 | market_id),
                 data = df, REML = FALSE)

anova_q2 <- anova(m_null, m_market)
cat("\n  LRT: Null vs Market model:\n")
print(anova_q2)

lrt_chisq <- anova_q2$Chisq[2]
lrt_df    <- anova_q2$Df[2]
lrt_p     <- anova_q2$`Pr(>Chisq)`[2]

# Conditional R² (variance explained) using approximation
var_components <- as.data.frame(VarCorr(m_market))
var_fixed  <- var(predict(m_market))
var_random <- var_components$vcov[1]
var_resid  <- attr(VarCorr(m_market), "sc")^2
r2_marginal    <- var_fixed / (var_fixed + var_random + var_resid)
r2_conditional <- (var_fixed + var_random) / (var_fixed + var_random + var_resid)

cat(sprintf("  Marginal R² (fixed effects only) : %.4f\n", r2_marginal))
cat(sprintf("  Conditional R² (fixed + random)  : %.4f\n", r2_conditional))

results_list[["Q2_market"]] <- tibble(
  question    = "Q2: Market effect after controlling for food",
  test        = "LRT (LME null vs market model)",
  statistic   = round(lrt_chisq, 4),
  df          = lrt_df,
  p_value     = round(lrt_p, 6),
  effect_size = round(r2_marginal, 4),
  effect_type = "Marginal R² (LME)",
  conclusion  = ifelse(lrt_p < 0.05,
                       "Significant market-level variation in instability",
                       "No significant market effect detected after food control")
)

# ===========================================================================
# QUESTION 3: Does recent volatility predict large price movements?
# Method: Logistic regression (binary outcome)
#         Predictor: rolling_volatility_3m
#         Control: commodity (as factor)
#         Reports OR, CI and effect size (Nagelkerke R²)
# ===========================================================================
cat("\n--- Q3: Does recent volatility predict large price movements? ---\n")

df_q3 <- df %>% filter(!is.na(rolling_volatility_3m))

# Null logistic model
logit_null <- glm(next_large_change ~ commodity,
                  data = df_q3, family = binomial(link = "logit"))

# Full logistic model
logit_full <- glm(next_large_change ~ rolling_volatility_3m + commodity,
                  data = df_q3, family = binomial(link = "logit"))

# LRT
lrt_logit <- anova(logit_null, logit_full, test = "Chisq")
cat("\n  LRT Logistic (null vs volatility):\n")
print(lrt_logit)

# Odds ratio with 95% CI for rolling_volatility_3m
coef_vol  <- coef(logit_full)["rolling_volatility_3m"]
se_vol    <- summary(logit_full)$coefficients["rolling_volatility_3m", "Std. Error"]
OR        <- exp(coef_vol)
CI_lower  <- exp(coef_vol - 1.96 * se_vol)
CI_upper  <- exp(coef_vol + 1.96 * se_vol)
p_vol     <- summary(logit_full)$coefficients["rolling_volatility_3m", "Pr(>|z|)"]

cat(sprintf("\n  rolling_volatility_3m: OR = %.3f [%.3f, %.3f], p = %.4f\n",
            OR, CI_lower, CI_upper, p_vol))

# Nagelkerke pseudo R²
ll_null <- logLik(logit_null)
ll_full <- logLik(logit_full)
n_q3    <- nrow(df_q3)
nagelkerke_r2 <- (1 - exp((2/n_q3) * (ll_null - ll_full))) /
                 (1 - exp((2/n_q3) * ll_null))
cat(sprintf("  Nagelkerke R²: %.4f\n", nagelkerke_r2))

results_list[["Q3_volatility"]] <- tibble(
  question    = "Q3: Recent volatility predicts large movements",
  test        = "Logistic regression LRT",
  statistic   = round(lrt_logit$Deviance[2], 4),
  df          = lrt_logit$Df[2],
  p_value     = round(lrt_logit$`Pr(>Chi)`[2], 6),
  effect_size = round(nagelkerke_r2, 4),
  effect_type = "Nagelkerke pseudo-R²",
  conclusion  = paste0(
    sprintf("OR=%.3f [%.3f,%.3f] for rolling_volatility_3m; ", OR, CI_lower, CI_upper),
    ifelse(p_vol < 0.05, "statistically significant predictor.", "not significant.")
  )
)

# Q3 visualisation — probability curve
cat("  Saving Q3 plot ...\n")
vol_seq <- data.frame(
  rolling_volatility_3m = seq(min(df_q3$rolling_volatility_3m, na.rm = TRUE),
                               max(df_q3$rolling_volatility_3m, na.rm = TRUE),
                               length.out = 200),
  commodity = names(sort(table(df_q3$commodity), decreasing = TRUE))[1]
)
vol_seq$prob <- predict(logit_full, newdata = vol_seq, type = "response")

p_q3 <- ggplot() +
  geom_jitter(data = df_q3, aes(x = rolling_volatility_3m, y = next_large_change),
              alpha = 0.15, height = 0.03, colour = "#94a3b8", size = 0.8) +
  geom_line(data = vol_seq, aes(x = rolling_volatility_3m, y = prob),
            colour = "#38bdf8", linewidth = 1.4) +
  scale_y_continuous(labels = label_percent(), breaks = c(0, 0.25, 0.5, 0.75, 1)) +
  labs(
    title    = "Q3: Probability of Large Price Movement vs Rolling Volatility",
    subtitle = sprintf("Logistic regression (controlling for commodity) · OR=%.2f [%.2f,%.2f] · p=%.4f",
                       OR, CI_lower, CI_upper, p_vol),
    x = "3-Month Rolling Volatility (SD of Log Changes)",
    y = "P(Next-month change > 10%)"
  ) +
  theme_food()

ggsave(file.path(PLOT_DIR, "09_q3_volatility_logit.png"),
       p_q3, width = 10, height = 5, dpi = 150, bg = "#1a1a2e")
cat("  Plot saved: 09_q3_volatility_logit.png\n")

# ---------------------------------------------------------------------------
# Save combined statistical results
# ---------------------------------------------------------------------------
cat("\n=== Saving statistical results ...\n")

all_results <- bind_rows(results_list)
write_csv(all_results, file.path(OUTPUT_DIR, "statistical_results.csv"))
cat(sprintf("   Saved: %s\n", file.path(OUTPUT_DIR, "statistical_results.csv")))

# Plain-text report
report_path <- file.path(OUTPUT_DIR, "statistical_report.txt")
sink(report_path)
cat("STATISTICAL INFERENCE REPORT\n")
cat("Food Price Volatility Analysis — IT3081 (2026-DS-12)\n")
cat(rep("=", 60), "\n\n")

cat("Q1: DO FOODS DIFFER IN PRICE INSTABILITY?\n")
cat(sprintf("  Kruskal-Wallis: chi2(%d)=%.3f, p=%.4f\n",
            kw_test$parameter, kw_test$statistic, kw_test$p.value))
cat(sprintf("  Effect size (eta²): %.4f\n", eta_sq))
cat(sprintf("  Conclusion: %s\n\n", results_list$Q1_kruskal$conclusion))

cat("Q2: DO MARKETS DIFFER AFTER CONTROLLING FOR FOOD?\n")
cat(sprintf("  LRT: chi2(%d)=%.3f, p=%.4f\n", lrt_df, lrt_chisq, lrt_p))
cat(sprintf("  Marginal R²=%.4f | Conditional R²=%.4f\n",
            r2_marginal, r2_conditional))
cat(sprintf("  Conclusion: %s\n\n", results_list$Q2_market$conclusion))

cat("Q3: DOES RECENT VOLATILITY PREDICT LARGE MOVEMENTS?\n")
cat(sprintf("  OR=%.3f [%.3f, %.3f], p=%.4f\n", OR, CI_lower, CI_upper, p_vol))
cat(sprintf("  Nagelkerke R²=%.4f\n", nagelkerke_r2))
cat(sprintf("  Conclusion: %s\n\n", results_list$Q3_volatility$conclusion))

cat("LIMITATIONS\n")
cat("  - Temporal autocorrelation within food-market series not fully accounted for.\n")
cat("  - Random effects model uses market_id; smaller markets may be underpowered.\n")
cat("  - Kruskal-Wallis treats observations as independent; future work should\n")
cat("    use GEE or cluster-robust standard errors.\n")
sink()

cat(sprintf("   Report: %s\n", report_path))
cat("\n=== Phase 4 Complete ===\n")
cat("Next step: Rscript analytics/05_model_training.R\n")
