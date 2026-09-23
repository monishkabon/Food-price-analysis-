import { afterEach, describe, expect, it, vi } from 'vitest';
import { backend } from './plumber';

function reply(body: unknown, status = 200) {
  const fetch = vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });
  vi.stubGlobal('fetch', fetch);
  return fetch;
}
afterEach(() => vi.unstubAllGlobals());

describe('R Plumber API contract', () => {
  it('unwraps scalar arrays in health without changing dataset arrays', async () => {
    reply({ status: ['ok'], api_ready: [true], model_version: ['1.0.0'], data_cutoff: ['2025-09-01'] });
    expect(await backend.health()).toEqual({ status: 'ok', api_ready: true, model_version: '1.0.0', data_cutoff: '2025-09-01' });
    reply({ success: [true], data: [{ id: 108, name: 'Lentils' }] });
    expect(await backend.foods()).toEqual([{ id: 108, name: 'Lentils' }]);
  });

  it('keeps omitted R NA values unavailable instead of treating them as zero', async () => {
    reply({ success: [true], data: {
      meta: { commodity_id: [108], market_id: [360], currency: ['LKR'], unit: ['KG'], price_type: ['Retail'], data_cutoff: ['2025-09-01'], n_months: [1], first_month: ['2023-06'], last_month: ['2023-06'] },
      series: [{ date: '2023-06', price: 287.35, spike_flag: false }],
    } });
    const result = await backend.history({ commodity_id: 108, market_id: 360 });
    expect(result.series).toEqual([{ date: '2023-06', price: 287.35, spike_flag: false, monthly_change_pct: null, absolute_change_pct: null }]);
  });

  it('sends the selected IDs to the real prediction route and preserves warnings', async () => {
    const fetch = reply({ success: [true], warnings: ['Short history.'], data: {
      commodity_id: [114], market_id: [361], last_observed_month: ['2025-09'], forecast_month: ['2025-10'],
      expected_absolute_change_pct: [18.97], large_change_probability: [0.1151], large_change_threshold_pct: [10],
      model_version: ['1.0.0'], data_cutoff: ['2025-09-01'], disclaimer: ['Movement size only.'],
    } });
    const selection = { commodity_id: 114, market_id: 361 };
    const result = await backend.predict(selection);
    expect(fetch).toHaveBeenCalledWith('/api/predictions', expect.objectContaining({ method: 'POST', body: JSON.stringify(selection) }));
    expect(result.large_change_probability).toBe(0.1151);
    expect(result.warnings).toEqual(['Short history.']);
    expect(result).not.toHaveProperty('predictedPrice');
  });

  it('shows the backend validation message for a rejected selection', async () => {
    reply({ success: [false], error: ['commodity_id 999999 not found.'] }, 404);
    await expect(backend.markets(999999)).rejects.toThrow('commodity_id 999999 not found.');
  });

  it('recognizes a false success flag even when HTTP reports success', async () => {
    reply({ success: [false], error: ['API not ready.'] });
    await expect(backend.foods()).rejects.toThrow('API not ready.');
  });

  it('does not replace unavailable backend data with demo results', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(backend.foods()).rejects.toThrow('Could not reach the backend');
  });

  it('rejects an incompatible API response', async () => {
    reply({ categories: { Rice: ['Samba'] } });
    await expect(backend.foods()).rejects.toThrow('unexpected response format');
  });
});
