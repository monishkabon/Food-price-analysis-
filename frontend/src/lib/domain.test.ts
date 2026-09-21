import { describe, expect, it } from 'vitest';
import { buildForecastSchema, changedScenarioFields, getDistricts, getMarkets, getRiskLevel, isForecastStale } from './domain';

describe('domain rules', () => {
  it('limits districts and markets to their parent selections', () => {
    expect(getDistricts('Western')).toEqual(['Colombo', 'Gampaha']);
    expect(getMarkets('Colombo')).toEqual(['Pettah', 'Narahenpita']);
  });
  it('rejects incomplete and non-positive forecast inputs', () => {
    const result = buildForecastSchema().safeParse({ category: '', commodity: '', province: '', district: '', market: '', priceType: '', forecastPeriod: 0, features: { inflation: -1, exchangeRate: 0, fuelPrice: 0, rainfall: -2 } });
    expect(result.success).toBe(false);
  });
  it('detects scenario changes and forecast staleness', () => {
    const base = { inflation: 5.2, exchangeRate: 302, fuelPrice: 311, rainfall: 120 };
    expect(changedScenarioFields(base, { ...base, fuelPrice: 340 })).toEqual(['fuelPrice']);
    expect(isForecastStale(base, { ...base, rainfall: 121 })).toBe(true);
  });
  it('maps volatility boundaries to understandable risk levels', () => {
    expect(getRiskLevel(4.9)).toBe('Low');
    expect(getRiskLevel(5)).toBe('Moderate');
    expect(getRiskLevel(10)).toBe('High');
  });
});
