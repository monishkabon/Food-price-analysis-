import { z } from 'zod';

export const isLiveMode = import.meta.env.VITE_API_MODE !== 'mock';
const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

// Plumber wraps scalar list fields in arrays; data-frame rows remain arrays.
const scalar = <T extends z.ZodType>(schema: T) =>
  z.union([schema, z.array(schema).length(1).transform(values => values[0])]);
const text = scalar(z.string());
const number = scalar(z.number());
const nullableNumber = scalar(z.number().nullable()).default(null);

const healthSchema = z.object({
  status: text,
  api_ready: scalar(z.boolean()),
  model_version: scalar(z.string().nullable()),
  data_cutoff: scalar(z.string().nullable()),
});
const metadataSchema = z.object({
  source: text, source_url: text, currency: text, unit: text,
  price_type: text, data_cutoff: text, model_version: text, disclaimer: text,
});
const foodSchema = z.object({ id: z.number(), name: z.string() });
const marketSchema = foodSchema.extend({ province: z.string(), district: z.string() });
const historySchema = z.object({
  meta: z.object({
    commodity_id: number, market_id: number, currency: text, unit: text,
    price_type: text, data_cutoff: text, n_months: number,
    first_month: text, last_month: text,
  }),
  series: z.array(z.object({
    date: z.string(), price: z.number(), monthly_change_pct: z.number().nullable().default(null),
    absolute_change_pct: z.number().nullable().default(null), spike_flag: z.boolean(),
  })),
});
const volatilitySchema = z.object({
  meta: z.object({ window_months: number, data_cutoff: text }),
  series: z.array(z.object({
    date: z.string(), rolling_volatility_3m: z.number(), mean_absolute_change_3m: z.number(),
  })),
});
const predictionSchema = z.object({
  commodity_id: number, market_id: number, last_observed_month: text,
  forecast_month: text, expected_absolute_change_pct: scalar(z.number().nonnegative()),
  large_change_probability: scalar(z.number().min(0).max(1).nullable()).default(null),
  large_change_threshold_pct: number, model_version: text, data_cutoff: text,
  disclaimer: text, warnings: z.array(z.string()).default([]),
});
const performanceSchema = z.object({
  continuous: z.array(z.object({ model: z.string(), mae: z.number(), rmse: z.number() })),
  binary: z.array(z.object({
    model: z.string(), brier_score: nullableNumber, precision: nullableNumber,
    recall: nullableNumber, f1: nullableNumber, accuracy: nullableNumber,
    tp: number, fp: number, fn: number, tn: number, prob_cutoff: number,
  })),
  per_commodity: z.array(z.object({
    commodity: z.string(), n: z.number(), mae_ridge: z.number(),
    mae_baseline: z.number(), brier_logit: z.number(), pct_large_true: z.number(),
  })),
  test_period: z.object({ start: text, end: text }), n_test: number,
  model_version: text, large_change_threshold_pct: number, limitations: z.array(z.string()),
});

const envelopeSchema = z.object({
  success: scalar(z.boolean()), data: z.unknown().optional(),
  error: text.optional(), warnings: z.array(z.string()).optional(),
});

async function request<T extends z.ZodType>(path: string, schema: T, init?: RequestInit): Promise<z.infer<T>> {
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...init, signal: AbortSignal.timeout(15_000),
      headers: { Accept: 'application/json', ...(init?.body ? { 'Content-Type': 'application/json' } : {}), ...init?.headers },
    });
  } catch {
    throw new Error('Could not reach the backend. Check that the R API is running on port 8000, then retry.');
  }
  const raw: unknown = await response.json().catch(() => null);
  const envelope = envelopeSchema.safeParse(raw);
  if (!response.ok || (envelope.success && !envelope.data.success)) {
    throw new Error(envelope.success && envelope.data.error
      ? envelope.data.error
      : `The backend could not complete this request (HTTP ${response.status}).`);
  }
  let payload = envelope.success ? envelope.data.data : raw;
  if (envelope.success && envelope.data.warnings && payload && typeof payload === 'object' && !Array.isArray(payload)) {
    payload = { ...payload, warnings: envelope.data.warnings };
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) throw new Error('The backend returned an unexpected response format. Check the API version.');
  return parsed.data;
}

export interface SeriesSelection { commodity_id: number; market_id: number }
const query = (selection: SeriesSelection) => new URLSearchParams({
  commodity_id: String(selection.commodity_id), market_id: String(selection.market_id),
}).toString();

export const backend = {
  health: () => request('/health', healthSchema),
  metadata: () => request('/metadata', metadataSchema),
  foods: () => request('/foods', z.array(foodSchema)),
  markets: (commodityId: number) => request(`/markets?commodity_id=${commodityId}`, z.array(marketSchema)),
  history: (selection: SeriesSelection) => request(`/prices/history?${query(selection)}`, historySchema),
  volatility: (selection: SeriesSelection) => request(`/volatility/history?${query(selection)}`, volatilitySchema),
  predict: (selection: SeriesSelection) => request('/predictions', predictionSchema, {
    method: 'POST', body: JSON.stringify(selection),
  }),
  performance: () => request('/models/performance', performanceSchema),
};

export type Food = z.infer<typeof foodSchema>;
export type Market = z.infer<typeof marketSchema>;
