// src/services/api.js
// Central API service — calls the R Plumber backend.
// When USE_MOCK=true, returns clearly labelled mock responses instead.

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || true;
// ↑ Change to `false` once the R API is running.

// ---------------------------------------------------------------------------
// Mock data (used during frontend-only development)
// ---------------------------------------------------------------------------
const MOCK_FOODS = [
  { id: 1, name: 'Rice (white)' },
  { id: 2, name: 'Lentils' },
  { id: 3, name: 'Onions (imported)' },
  { id: 4, name: 'Potatoes (imported)' },
  { id: 5, name: 'Tomatoes' },
];

const MOCK_MARKETS = {
  1: [
    { id: 10, name: 'Colombo', province: 'Western', district: 'Colombo' },
    { id: 11, name: 'Kandy',   province: 'Central', district: 'Kandy' },
    { id: 12, name: 'Jaffna',  province: 'Northern', district: 'Jaffna' },
  ],
  2: [
    { id: 10, name: 'Colombo', province: 'Western', district: 'Colombo' },
    { id: 13, name: 'Galle',   province: 'Southern', district: 'Galle' },
  ],
  3: [{ id: 10, name: 'Colombo', province: 'Western', district: 'Colombo' }],
  4: [{ id: 10, name: 'Colombo', province: 'Western', district: 'Colombo' }],
  5: [{ id: 10, name: 'Colombo', province: 'Western', district: 'Colombo' },
      { id: 11, name: 'Kandy',   province: 'Central', district: 'Kandy' }],
};

function generateMockPriceSeries(commodityId, marketId) {
  const base = [120, 115, 135, 155, 145, 160, 180, 170, 165, 190, 200, 210,
                195, 220, 235, 225, 240, 255, 248, 260, 275, 265, 280, 295];
  const months = [];
  const start = new Date('2023-10-01');
  for (let i = 0; i < base.length; i++) {
    const d = new Date(start);
    d.setMonth(d.getMonth() + i);
    const price = base[i] * (1 + (commodityId - 1) * 0.08 + (marketId % 3) * 0.03);
    const prev  = i > 0 ? base[i-1] * (1 + (commodityId - 1) * 0.08) : price;
    const pct   = ((price - prev) / prev * 100);
    months.push({
      date:                format_ym(d),
      price:               +price.toFixed(2),
      monthly_change_pct:  +pct.toFixed(4),
      absolute_change_pct: +Math.abs(pct).toFixed(4),
      spike_flag:          Math.abs(pct) > 20,
    });
  }
  return months;
}

function generateMockVolatility(priceSeries) {
  return priceSeries.slice(2).map((row, i) => ({
    date:                    row.date,
    rolling_volatility_3m:   +(Math.random() * 0.05 + 0.02).toFixed(6),
    mean_absolute_change_3m: +(Math.random() * 6 + 2).toFixed(4),
  }));
}

function format_ym(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Fetch wrapper with error normalisation
// ---------------------------------------------------------------------------
async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error || `HTTP ${res.status}: ${res.statusText}`);
  }
  const json = await res.json();
  if (json.success === false) throw new Error(json.error || 'API error');
  return json.data ?? json;
}

// ---------------------------------------------------------------------------
// Public API functions
// ---------------------------------------------------------------------------

export async function fetchHealth() {
  if (USE_MOCK) return { status: 'ok', model_version: '1.0.0 (MOCK)', data_cutoff: '2025-09-01' };
  return apiFetch('/api/health');
}

export async function fetchFoods() {
  if (USE_MOCK) return MOCK_FOODS;
  const data = await apiFetch('/api/foods');
  return data;
}

export async function fetchMarkets(commodityId) {
  if (USE_MOCK) return MOCK_MARKETS[commodityId] ?? [];
  const data = await apiFetch(`/api/markets?commodity_id=${commodityId}`);
  return data;
}

export async function fetchPriceHistory(commodityId, marketId) {
  if (USE_MOCK) {
    const series = generateMockPriceSeries(commodityId, marketId);
    return {
      meta: {
        commodity_id: commodityId, market_id: marketId,
        currency: 'LKR', unit: 'KG', price_type: 'Retail',
        data_cutoff: '2025-09-01',
        n_months: series.length,
        first_month: series[0].date,
        last_month:  series[series.length - 1].date,
      },
      series,
    };
  }
  return apiFetch(`/api/prices/history?commodity_id=${commodityId}&market_id=${marketId}`);
}

export async function fetchVolatilityHistory(commodityId, marketId) {
  if (USE_MOCK) {
    const ps = generateMockPriceSeries(commodityId, marketId);
    return {
      meta: { commodity_id: commodityId, market_id: marketId, window_months: 3, data_cutoff: '2025-09-01' },
      series: generateMockVolatility(ps),
    };
  }
  return apiFetch(`/api/volatility/history?commodity_id=${commodityId}&market_id=${marketId}`);
}

export async function fetchPrediction(commodityId, marketId) {
  if (USE_MOCK) {
    await new Promise(r => setTimeout(r, 1200)); // simulate latency
    return {
      commodity_id:                 commodityId,
      market_id:                    marketId,
      last_observed_month:          '2025-09',
      forecast_month:               '2025-10',
      expected_absolute_change_pct: +(Math.random() * 12 + 2).toFixed(4),
      large_change_probability:     +(Math.random() * 0.6 + 0.1).toFixed(4),
      large_change_threshold_pct:   10,
      model_version:                '1.0.0 (MOCK)',
      data_cutoff:                  '2025-09-01',
      disclaimer: 'This prediction estimates movement size (up or down), not direction. Based on historical patterns only. Data ends 2025-09-01.',
    };
  }
  return apiFetch('/api/predictions', {
    method: 'POST',
    body: JSON.stringify({ commodity_id: commodityId, market_id: marketId }),
  });
}

export async function fetchModelPerformance() {
  if (USE_MOCK) {
    return {
      continuous: [
        { model: 'Baseline', mae: 4.821, rmse: 7.234, n_neg: 0 },
        { model: 'MLR',      mae: 4.012, rmse: 6.103, n_neg: 2 },
        { model: 'Ridge',    mae: 3.791, rmse: 5.887, n_neg: 0 },
      ],
      binary: {
        model: 'Logistic Regression',
        brier_score: 0.163,
        precision: 0.641,
        recall: 0.587,
        f1: 0.613,
        accuracy: 0.812,
        tp: 27, fp: 15, fn: 19, tn: 94,
        threshold_pct: 10,
        prob_cutoff: 0.5,
      },
      per_commodity: [
        { commodity: 'Rice - white',      n: 24, mae_ridge: 2.1, mae_baseline: 3.4, brier_logit: 0.12, pct_large_true: 12.5 },
        { commodity: 'Lentils',           n: 18, mae_ridge: 4.3, mae_baseline: 5.2, brier_logit: 0.18, pct_large_true: 22.2 },
        { commodity: 'Onions - imported', n: 21, mae_ridge: 6.1, mae_baseline: 7.8, brier_logit: 0.22, pct_large_true: 33.3 },
        { commodity: 'Potatoes - imported', n: 19, mae_ridge: 5.2, mae_baseline: 6.4, brier_logit: 0.19, pct_large_true: 26.3 },
        { commodity: 'Tomatoes',          n: 22, mae_ridge: 7.8, mae_baseline: 9.1, brier_logit: 0.28, pct_large_true: 40.9 },
      ],
      test_period:  { start: '2025-04-01', end: '2025-09-01' },
      n_test:       155,
      model_version: '1.0.0 (MOCK)',
      large_change_threshold_pct: 10,
      limitations: [
        'Models trained on historical data up to December 2024.',
        'Performance may degrade for commodity-market pairs with sparse data.',
        'Ridge regression constrains negative predictions to 0.',
        'Observations within the same food-market series are not independent.',
      ],
    };
  }
  return apiFetch('/api/models/performance');
}

export async function fetchMetadata() {
  if (USE_MOCK) {
    return {
      source: 'WFP Food Prices — Sri Lanka (Humanitarian Data Exchange)',
      source_url: 'https://data.humdata.org/dataset/wfp-food-prices-for-sri-lanka',
      currency: 'LKR', unit: 'KG', price_type: 'Retail',
      data_cutoff: '2025-09-01',
      model_version: '1.0.0 (MOCK)',
      api_version: '1.0.0',
      disclaimer: 'Historical prototype — not a live forecasting service.',
    };
  }
  return apiFetch('/api/metadata');
}
