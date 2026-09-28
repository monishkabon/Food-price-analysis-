import type {
  CommodityItem,
  EwdssPredictionRequest,
  EwdssPredictionResponse,
  HistoricalPricePoint,
  MarketItem,
  MetadataResponse,
  ModelGovernanceResponse,
  ModelInfoResponse,
  OverviewResponse,
  PredictionRequest,
  PredictionResponse,
  PricePoint,
  VolatilityHistoryPoint,
} from '../types';
import {
  ewdssCommodities,
  ewdssMarkets,
  getPriceHistory,
  getVolatilityHistory,
  metadata,
  modelGovernanceData,
  modelInfo,
  overview,
  predict,
  predictEwdss,
  trend,
} from '../mocks/data';

const mode = import.meta.env.VITE_API_MODE ?? 'mock';
const base = import.meta.env.VITE_API_BASE_URL ?? '/api';

async function live<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) {
    throw new Error((await response.json().catch(() => null))?.message ?? 'The data service could not complete this request.');
  }
  return response.json();
}

const delay = <T>(value: T, ms = 200) => new Promise<T>(resolve => setTimeout(() => resolve(value), ms));

export const api = {
  // Existing endpoints preserved
  metadata: (): Promise<MetadataResponse> => (mode === 'live' ? live('/metadata') : delay(metadata)),
  overview: (): Promise<OverviewResponse> => (mode === 'live' ? live('/overview') : delay(overview)),
  prices: (): Promise<PricePoint[]> => (mode === 'live' ? live('/prices') : delay(trend)),
  predict: (body: PredictionRequest): Promise<PredictionResponse> =>
    mode === 'live' ? live('/predict', { method: 'POST', body: JSON.stringify(body) }) : delay(predict(body)),
  modelInfo: (): Promise<ModelInfoResponse> => (mode === 'live' ? live('/model/info') : delay(modelInfo)),
  health: (): Promise<{ status: string }> => (mode === 'live' ? live('/health') : delay({ status: 'healthy', version: 'v1.0.0' })),

  // EWDSS Agricultural Commodity Procurement Early-Warning & Decision Support System endpoints
  getFoods: (): Promise<CommodityItem[]> => (mode === 'live' ? live('/foods') : delay(ewdssCommodities)),
  getMarkets: (): Promise<MarketItem[]> => (mode === 'live' ? live('/markets') : delay(ewdssMarkets)),
  getPredictions: (payload: EwdssPredictionRequest): Promise<EwdssPredictionResponse> =>
    mode === 'live'
      ? live('/predictions', { method: 'POST', body: JSON.stringify(payload) })
      : delay(predictEwdss(payload), 250),
  getPriceHistory: (commodity_id: string, market_id: string): Promise<HistoricalPricePoint[]> =>
    mode === 'live'
      ? live(`/prices/history?commodity_id=${encodeURIComponent(commodity_id)}&market_id=${encodeURIComponent(market_id)}`)
      : delay(getPriceHistory(commodity_id, market_id)),
  getVolatilityHistory: (commodity_id: string, market_id: string): Promise<VolatilityHistoryPoint[]> =>
    mode === 'live'
      ? live(`/volatility/history?commodity_id=${encodeURIComponent(commodity_id)}&market_id=${encodeURIComponent(market_id)}`)
      : delay(getVolatilityHistory(commodity_id, market_id)),
  getModelPerformance: (): Promise<ModelGovernanceResponse> =>
    mode === 'live' ? live('/models/performance') : delay(modelGovernanceData),
};

