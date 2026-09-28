import { test, expect, type Page } from '@playwright/test';

const health = { status: ['ok'], api_ready: [true], model_version: ['1.0.0'], data_cutoff: ['2025-09-01'] };
const metadata = { source: ['WFP Food Prices'], source_url: ['https://data.humdata.org/'], currency: ['LKR'], unit: ['KG'], price_type: ['Retail'], data_cutoff: ['2025-09-01'], model_version: ['1.0.0'], disclaimer: ['Historical prototype. Data ends September 2025.'] };
const performance = {
  continuous: [{ model: 'Baseline', mae: 11.7006, rmse: 19.9617 }, { model: 'Ridge', mae: 20.3896, rmse: 23.6103 }],
  binary: [{ model: 'Logistic Regression', brier_score: 0.1098, precision: 0.8168, recall: 0.877, f1: 0.8458, accuracy: 0.8682, tp: 107, fp: 24, fn: 15, tn: 150, prob_cutoff: 0.5 }],
  per_commodity: [{ commodity: 'Lentils', n: 150, mae_ridge: 17.3348, mae_baseline: 1.2626, brier_logit: 0.0113, pct_large_true: 0 }],
  test_period: { start: ['2025-04-01'], end: ['2025-09-01'] }, n_test: [296], model_version: ['1.0.0'], large_change_threshold_pct: [10], limitations: ['Observations within a series are not independent.'],
};

async function mockBackend(page: Page) {
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const url = new URL(route.request().url());
    const cid = Number(url.searchParams.get('commodity_id') || 108);
    const mid = Number(url.searchParams.get('market_id') || 360);
    let data: unknown;
    switch (url.pathname) {
      case '/api/health': return route.fulfill({ json: health });
      case '/api/metadata': return route.fulfill({ json: metadata });
      case '/api/foods': data = [{ id: 108, name: 'Lentils' }, { id: 114, name: 'Tomatoes' }]; break;
      case '/api/markets': data = cid === 108 ? [{ id: 360, name: 'Ampara', province: 'Eastern', district: 'Ampara' }] : [{ id: 361, name: 'Batticaloa', province: 'Eastern', district: 'Batticaloa' }]; break;
      case '/api/prices/history': data = {
        meta: { commodity_id: [cid], market_id: [mid], currency: ['LKR'], unit: ['KG'], price_type: ['Retail'], data_cutoff: ['2025-09-01'], n_months: [2], first_month: ['2025-08'], last_month: ['2025-09'] },
        series: [{ date: '2025-08', price: 280, spike_flag: false }, { date: '2025-09', price: 285, monthly_change_pct: 1.7857, absolute_change_pct: 1.7857, spike_flag: false }],
      }; break;
      case '/api/volatility/history': data = { meta: { window_months: [3], data_cutoff: ['2025-09-01'] }, series: [{ date: '2025-09', rolling_volatility_3m: 0.03, mean_absolute_change_3m: 2.5 }] }; break;
      case '/api/predictions': {
        const body = route.request().postDataJSON();
        data = { commodity_id: [body.commodity_id], market_id: [body.market_id], last_observed_month: ['2025-09'], forecast_month: ['2025-10'], expected_absolute_change_pct: [18.9727], large_change_probability: [0.1151], large_change_threshold_pct: [10], model_version: ['1.0.0'], data_cutoff: ['2025-09-01'], disclaimer: ['Movement size in either direction. Historical estimate.'] };
        break;
      }
      case '/api/models/performance': data = performance; break;
      default: return route.fulfill({ status: 404, json: { success: [false], error: ['Unexpected endpoint in test.'] } });
    }
    return route.fulfill({ json: { success: [true], data } });
  });
}

test('live forecast uses selected IDs and hides stale results after changing food', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/overview');
  await expect(page.getByText('Backend data', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Lentils in Ampara' })).toBeVisible();
  await page.getByRole('link', { name: /Create forecast/ }).click();
  const request = page.waitForRequest(request => request.url().endsWith('/api/predictions'));
  await page.getByRole('button', { name: 'Generate forecast' }).click();
  expect((await request).postDataJSON()).toEqual({ commodity_id: 108, market_id: 360 });
  await expect(page.getByText('18.97%', { exact: true })).toBeVisible();
  await expect(page.getByText('11.51%', { exact: true })).toBeVisible();
  await expect(page.getByText('Predicted price', { exact: true })).toHaveCount(0);
  await page.getByRole('combobox', { name: 'Commodity', exact: true }).selectOption('114');
  await expect(page.getByRole('combobox', { name: 'Market', exact: true })).toHaveValue('361');
  await expect(page.getByText(/Selection changed/)).toBeVisible();
  await expect(page.getByText('18.97%', { exact: true })).toHaveCount(0);
  const nextRequest = page.waitForRequest(request => request.url().endsWith('/api/predictions'));
  await page.getByRole('button', { name: 'Generate forecast' }).click();
  expect((await nextRequest).postDataJSON()).toEqual({ commodity_id: 114, market_id: 361 });
  await expect(page.getByText(/Tomatoes · Batticaloa/)).toBeVisible();
});

test('history preserves missing changes and evaluation displays actual model units', async ({ page }) => {
  await mockBackend(page);
  await page.goto('/market-explorer');
  await expect(page.getByRole('cell', { name: 'Unavailable', exact: true })).toBeVisible();
  await expect(page.getByText('0.0300', { exact: true })).toBeVisible();
  await page.goto('/model-insights');
  await expect(page.getByText('11.7006', { exact: true })).toBeVisible();
  await expect(page.getByText('86.82%', { exact: true })).toBeVisible();
  await expect(page.getByText('Baseline has the lowest MAE on this test set.')).toBeVisible();
  await page.goto('/scenarios');
  await expect(page.getByText('Economic scenario analysis is unavailable for the current R models.')).toBeVisible();
  await expect(page.getByRole('spinbutton')).toHaveCount(0);
});

test('backend errors are visible and never replaced with demo data', async ({ page }) => {
  await mockBackend(page);
  await page.route('**/api/foods', route => route.fulfill({ status: 503, json: { success: [false], error: ['API not ready.'] } }));
  await page.goto('/overview');
  await expect(page.getByText('API not ready.', { exact: true })).toBeVisible();
  await expect(page.getByText('Red Nadu', { exact: true })).toHaveCount(0);
});

test('running R backend supplies the same prediction through the frontend proxy', async ({ page }, testInfo) => {
  test.skip(process.env.TEST_REAL_BACKEND !== '1', 'Enable when the R API is running locally.');
  await page.goto('/overview');
  await expect(page.getByRole('heading', { name: 'Lentils in Ampara' })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('live-overview.png'), fullPage: true });
  await page.getByRole('link', { name: /Create forecast/ }).click();
  const response = page.waitForResponse(response => response.url().endsWith('/api/predictions'));
  await page.getByRole('button', { name: 'Generate forecast' }).click();
  const json = await (await response).json();
  expect(json.success).toEqual([true]);
  await expect(page.getByText(`${json.data.expected_absolute_change_pct[0].toFixed(2)}%`, { exact: true })).toBeVisible();
  await expect(page.getByText(`${(json.data.large_change_probability[0] * 100).toFixed(2)}%`, { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('live-forecast.png'), fullPage: true });
  await page.goto('/model-insights');
  await expect(page.getByText('11.7006', { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('live-performance.png'), fullPage: true });
  await page.goto('/market-explorer');
  await expect(page.getByRole('heading', { name: 'Monthly observations' })).toBeVisible();
  await expect(page.getByText(/Standard deviation of log price changes/)).toBeVisible();
});
