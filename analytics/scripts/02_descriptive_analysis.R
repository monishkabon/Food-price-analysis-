# =============================================================================
# 02_descriptive_analysis.R  (Members 1 & 3)
# Purpose : Produce all descriptive visualisations from cleaned_food_prices.csv.
# Run     : Rscript analytics/02_descriptive_analysis.R
# Outputs : analytics/outputs/plots/*.png
# =============================================================================

suppressPackageStartupMessages({
  library(dplyr)
  library(ggplot2)
  library(scales)
  library(patchwork)
  library(tidyr)
  library(lubridate)
  library(readr)
  library(zoo)
})

cat("=== Phase 3a: Descriptive Analysis ===\n\n")

CLEAN_CANDIDATES <- c(
  file.path("analytics", "outputs", "data", "cleaned_food_prices.csv"),
  file.path("analytics", "outputs", "cleaned_food_prices.csv")
)
CLEAN_FILE <- CLEAN_CANDIDATES[file.exists(CLEAN_CANDIDATES)][1]
PLOT_DIR   <- file.path("analytics", "outputs", "plots")
dir.create(PLOT_DIR, recursive = TRUE, showWarnings = FALSE)

if (is.na(CLEAN_FILE) || !file.exists(CLEAN_FILE)) {
  stop("Run analytics/scripts/01_data_cleaning.R first.\nMissing: cleaned_food_prices.csv")
}

df <- read_csv(CLEAN_FILE, show_col_types = FALSE) %>%
  mutate(date = as.Date(date))

# ---------------------------------------------------------------------------
# Theme — consistent dark-mode academic style
# ---------------------------------------------------------------------------
theme_food <- function() {
  theme_minimal(base_size = 12) +
    theme(
      plot.background  = element_rect(fill = "#1a1a2e", colour = NA),
      panel.background = element_rect(fill = "#16213e", colour = NA),
      panel.grid.major = element_line(colour = "#2a2a4a"),
      panel.grid.minor = element_blank(),
      plot.title       = element_text(colour = "#e2e8f0", face = "bold",
                                       size = 14, margin = margin(b = 8)),
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

PALETTE <- c(
  "#38bdf8", "#fb923c", "#4ade80", "#f472b6", "#a78bfa"
)

save_plot <- function(plot, filename, width = 12, height = 6) {
  path <- file.path(PLOT_DIR, filename)
  ggsave(path, plot, width = width, height = height, dpi = 150,
         bg = "#1a1a2e")
  cat(sprintf("   Saved: %s\n", path))
}

# ---------------------------------------------------------------------------
# 1. Historical price charts — one facet per commodity
# ---------------------------------------------------------------------------
cat("1. Historical price charts ...\n")

df_prices <- df %>% filter(!is.na(price))

p_price <- ggplot(df_prices, aes(x = date, y = price,
                                  colour = commodity, group = interaction(commodity, market))) +
  geom_line(alpha = 0.4, linewidth = 0.4) +
  stat_summary(aes(group = commodity), fun = median, geom = "line",
               linewidth = 1.2) +
  scale_colour_manual(values = PALETTE, name = "Commodity") +
  scale_y_continuous(labels = label_comma(prefix = "LKR ")) +
  scale_x_date(date_breaks = "2 years", date_labels = "%Y") +
  labs(
    title    = "Historical Retail Prices by Commodity — Sri Lanka",
    subtitle = "Thin lines = individual markets · Thick line = cross-market median · Retail, LKR/KG",
    x = NULL, y = "Price (LKR/KG)",
    caption  = "Source: WFP Food Prices (HDX) · Data cutoff: September 2025"
  ) +
  facet_wrap(~commodity, scales = "free_y", ncol = 2) +
  theme_food() +
  theme(legend.position = "none")

save_plot(p_price, "01_historical_prices.png", width = 14, height = 10)

# ---------------------------------------------------------------------------
# 2. Monthly % change distributions
# ---------------------------------------------------------------------------
cat("2. Monthly % change distributions ...\n")

df_change <- df %>% filter(!is.na(monthly_change_pct))

p_dist <- ggplot(df_change, aes(x = monthly_change_pct, fill = commodity)) +
  geom_histogram(bins = 50, alpha = 0.8, colour = NA) +
  geom_vline(xintercept = 0, colour = "#f1f5f9", linetype = "dashed", linewidth = 0.6) +
  scale_fill_manual(values = PALETTE) +
  scale_x_continuous(labels = label_percent(scale = 1)) +
  labs(
    title    = "Distribution of Monthly Price Changes",
    subtitle = "One observation per commodity-market-month · Retail LKR/KG",
    x = "Monthly Price Change (%)", y = "Count",
    caption  = "Source: WFP Food Prices (HDX)"
  ) +
  facet_wrap(~commodity, scales = "free_y", ncol = 2) +
  theme_food() +
  theme(legend.position = "none")

save_plot(p_dist, "02_monthly_change_distribution.png", width = 14, height = 10)

# ---------------------------------------------------------------------------
# 3. Rolling 3-month volatility charts
# ---------------------------------------------------------------------------
cat("3. Rolling volatility charts ...\n")

df_vol <- df %>%
  filter(!is.na(price)) %>%
  arrange(commodity_id, market_id, date) %>%
  group_by(commodity_id, commodity, market_id, market) %>%
  mutate(
    log_price   = log(price),
    log_change  = log_price - lag(log_price),
    rolling_vol = rollapplyr(log_change, width = 3, FUN = sd,
                             fill = NA, na.rm = TRUE, partial = 2)
  ) %>%
  ungroup()

p_vol <- df_vol %>%
  filter(!is.na(rolling_vol)) %>%
  ggplot(aes(x = date, y = rolling_vol, colour = commodity,
             group = interaction(commodity, market))) +
  geom_line(alpha = 0.35, linewidth = 0.4) +
  stat_summary(aes(group = commodity), fun = median, geom = "line",
               linewidth = 1.1) +
  scale_colour_manual(values = PALETTE, name = "Commodity") +
  scale_x_date(date_breaks = "2 years", date_labels = "%Y") +
  labs(
    title    = "3-Month Rolling Price Volatility (SD of Log Changes)",
    subtitle = "Higher values = more volatile period · Thin = market, Thick = median",
    x = NULL, y = "Rolling Volatility (SD log change)",
    caption  = "Source: WFP Food Prices (HDX) · Data cutoff: September 2025"
  ) +
  facet_wrap(~commodity, scales = "free_y", ncol = 2) +
  theme_food() +
  theme(legend.position = "none")

save_plot(p_vol, "03_rolling_volatility.png", width = 14, height = 10)

# ---------------------------------------------------------------------------
# 4. Cross-commodity comparison — median absolute change
# ---------------------------------------------------------------------------
cat("4. Cross-commodity volatility comparison ...\n")

commodity_summary <- df %>%
  filter(!is.na(absolute_change_pct)) %>%
  group_by(commodity) %>%
  summarise(
    median_abs_change = median(absolute_change_pct),
    mean_abs_change   = mean(absolute_change_pct),
    q75_abs_change    = quantile(absolute_change_pct, 0.75),
    pct_large         = mean(absolute_change_pct > 10) * 100,
    n_obs             = n(),
    .groups           = "drop"
  ) %>%
  arrange(desc(median_abs_change))

p_compare <- ggplot(commodity_summary,
                    aes(x = reorder(commodity, median_abs_change),
                        y = median_abs_change, fill = commodity)) +
  geom_col(width = 0.6, alpha = 0.9) +
  geom_errorbar(aes(ymin = median_abs_change, ymax = q75_abs_change),
                width = 0.25, colour = "#f1f5f9") +
  geom_text(aes(label = sprintf("%.1f%%\n(n=%d)", median_abs_change, n_obs)),
            hjust = -0.15, colour = "#e2e8f0", size = 3.2) +
  coord_flip() +
  scale_fill_manual(values = PALETTE) +
  scale_y_continuous(labels = label_percent(scale = 1),
                     expand = expansion(mult = c(0, 0.25))) +
  labs(
    title    = "Price Instability by Commodity",
    subtitle = "Bar = median absolute monthly change · Whisker extends to 75th percentile",
    x = NULL, y = "Absolute Monthly Change (%)",
    caption  = "Source: WFP Food Prices (HDX)"
  ) +
  theme_food() +
  theme(legend.position = "none")

save_plot(p_compare, "04_commodity_comparison.png", width = 10, height = 5)

# ---------------------------------------------------------------------------
# 5. Cross-market comparison (top 10 markets by data volume)
# ---------------------------------------------------------------------------
cat("5. Cross-market comparison ...\n")

top_markets <- df %>%
  filter(!is.na(price)) %>%
  count(market_id, market, sort = TRUE) %>%
  slice_head(n = 10) %>%
  pull(market_id)

market_summary <- df %>%
  filter(!is.na(absolute_change_pct), market_id %in% top_markets) %>%
  group_by(market) %>%
  summarise(
    median_abs_change = median(absolute_change_pct),
    q75               = quantile(absolute_change_pct, 0.75),
    n_obs             = n(),
    .groups           = "drop"
  ) %>%
  arrange(desc(median_abs_change))

p_market <- ggplot(market_summary,
                   aes(x = reorder(market, median_abs_change),
                       y = median_abs_change, fill = median_abs_change)) +
  geom_col(width = 0.6, alpha = 0.9) +
  scale_fill_gradient(low = "#38bdf8", high = "#f472b6") +
  geom_text(aes(label = sprintf("%.1f%%", median_abs_change)),
            hjust = -0.15, colour = "#e2e8f0", size = 3.2) +
  coord_flip() +
  scale_y_continuous(labels = label_percent(scale = 1),
                     expand = expansion(mult = c(0, 0.2))) +
  labs(
    title    = "Price Instability by Market (Top 10 by Volume)",
    subtitle = "Median absolute monthly price change across all commodities",
    x = NULL, y = "Absolute Monthly Change (%)",
    caption  = "Source: WFP Food Prices (HDX)"
  ) +
  theme_food() +
  theme(legend.position = "none")

save_plot(p_market, "05_market_comparison.png", width = 10, height = 5)

# ---------------------------------------------------------------------------
# 6. Data coverage heatmap — food x market
# ---------------------------------------------------------------------------
cat("6. Data coverage heatmap ...\n")

coverage_heat <- df %>%
  group_by(commodity, market) %>%
  summarise(pct_obs = mean(!is.na(price)) * 100, .groups = "drop")

p_heat <- ggplot(coverage_heat,
                 aes(x = market, y = commodity, fill = pct_obs)) +
  geom_tile(colour = "#1a1a2e") +
  scale_fill_gradient2(low = "#0f3460", mid = "#16213e", high = "#38bdf8",
                       midpoint = 50, name = "Coverage %") +
  geom_text(aes(label = sprintf("%.0f%%", pct_obs)),
            size = 2.5, colour = "#e2e8f0") +
  labs(
    title    = "Data Coverage by Commodity & Market",
    subtitle = "Percentage of months with an observed price",
    x = "Market", y = "Commodity",
    caption  = "Source: WFP Food Prices (HDX)"
  ) +
  theme_food() +
  theme(axis.text.x = element_text(angle = 45, hjust = 1, size = 8))

save_plot(p_heat, "06_coverage_heatmap.png", width = 14, height = 6)

# ---------------------------------------------------------------------------
# 7. Seasonal patterns — median price by month of year
# ---------------------------------------------------------------------------
cat("7. Seasonal patterns ...\n")

df_season <- df %>%
  filter(!is.na(price)) %>%
  mutate(month_name = factor(month(date, label = TRUE, abbr = TRUE),
                              levels = month.abb))

p_seasonal <- df_season %>%
  group_by(commodity, month_name) %>%
  summarise(median_price = median(price), .groups = "drop") %>%
  ggplot(aes(x = month_name, y = median_price,
             colour = commodity, group = commodity)) +
  geom_line(linewidth = 1) +
  geom_point(size = 2) +
  scale_colour_manual(values = PALETTE, name = "Commodity") +
  scale_y_continuous(labels = label_comma(prefix = "LKR ")) +
  labs(
    title    = "Seasonal Price Patterns (Median by Month of Year)",
    subtitle = "Pooled over all years and markets",
    x = "Month", y = "Median Price (LKR/KG)",
    caption  = "Source: WFP Food Prices (HDX)"
  ) +
  theme_food()

save_plot(p_seasonal, "07_seasonal_patterns.png", width = 12, height = 5)

# ---------------------------------------------------------------------------
# 8. Print business insights summary
# ---------------------------------------------------------------------------
cat("\n=== Business Insights Summary ===\n")
cat("\nCommodity Price Instability Ranking:\n")
print(commodity_summary %>%
        select(commodity, median_abs_change, pct_large, n_obs) %>%
        rename(`Commodity` = commodity,
               `Median |Δ%|` = median_abs_change,
               `% months with >10% change` = pct_large,
               `Observations` = n_obs))

cat("\nKey finding: Commodities with higher median absolute changes\n")
cat("require more frequent supplier contract reviews.\n")

cat("\n=== Phase 3a Complete ===\n")
cat("Next step: Rscript analytics/scripts/03_feature_engineering.R\n")
