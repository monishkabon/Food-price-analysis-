export type RiskLevel = 'Low' | 'Moderate' | 'High';
export interface Selection { category:string; commodity:string; province:string; district:string; market:string; priceType:string }
export interface Features { inflation:number; exchangeRate:number; fuelPrice:number; rainfall:number }
export interface PredictionRequest extends Selection { forecastPeriod:number; features:Features }
export interface PredictionResponse { predictionId:string; modelVersion:string; generatedAt:string; currency:string; unit:string; latestObservedPrice:number; latestObservationDate:string; predictedPrice:number; expectedChangeAbsolute:number; expectedChangePercent:number; predictionInterval:{level:number;lower:number;upper:number}; volatility:{value:number;unit:string;level:RiskLevel}; forecastSeries:Array<{date:string;predicted:number;lower:number;upper:number}> }
export interface MetadataResponse { categories:Record<string,string[]>; provinces:Record<string,string[]>; markets:Record<string,string[]>; priceTypes:string[]; dateRange:{min:string;max:string} }
export interface PricePoint { date:string; price:number; regional?:number }
export interface OverviewResponse { kpis:Array<{label:string;value:string;change:string;trend:'up'|'down'|'flat'}>; trend:PricePoint[]; risks:Array<{commodity:string;market:string;price:number;change:number;risk:RiskLevel}>; updatedAt:string }
export interface ModelInfoResponse { family:string; version:string; trainingPeriod:string; metrics:Array<{name:string;value:string}>; variables:string[]; validation:string; assumptions:string[]; limitations:string[]; volatilityMethod:string }
export interface ApiError { code:string; message:string; details?:string }

export interface CommodityItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentPrice: number;
  riskLevel: RiskLevel;
  riskProbability: number;
  expectedMovement: number;
}

export interface MarketItem {
  id: string;
  name: string;
  district: string;
  province: string;
  marketType: string;
}

export interface EwdssPredictionRequest {
  commodity_id: string;
  market_id: string;
}

export interface EwdssPredictionResponse {
  commodity_id: string;
  commodity_name: string;
  market_id: string;
  market_name: string;
  risk_probability: number;
  risk_level: RiskLevel;
  expected_movement_pct: number;
  expected_movement_abs: number;
  current_price: number;
  predicted_price: number;
  warning_flags: string[];
  cost_optimal_cutoff: number;
  recommendation: {
    action: string;
    level: 'low' | 'moderate' | 'high';
    summary: string;
    details: string[];
    forward_contract_months?: string;
    buffer_stock_days?: number;
    cash_buffer_pct?: number;
    hedging_ratio?: string;
    sourcing_advice?: string;
  };
  model_diagnostics: {
    trailing_3m_volatility: number;
    dominant_predictor: string;
    baseline_mae: number;
    mlr_mae: number;
    lasso_sparsity: string;
  };
}

export interface HistoricalPricePoint {
  date: string;
  month_label: string;
  price: number;
  mom_change_pct: number;
  is_spike: boolean;
  spike_label?: string;
  volume_index?: number;
}

export interface VolatilityHistoryPoint {
  date: string;
  month_label: string;
  volatility_3m: number;
  threshold_10pct: number;
  alert_cutoff_25pct: number;
  risk_level: RiskLevel;
}

export interface ModelGovernanceResponse {
  logistic: {
    precision: number;
    recall: number;
    calibrated_recall: number;
    accuracy: number;
    brier_score: number;
    roc_auc: number;
    cost_reduction_pct: number;
    cost_fn: number;
    cost_fp: number;
  };
  continuous_benchmarks: {
    baseline_mae: number;
    ridge_mae: number;
    mlr_mae: number;
    mlr_rmse: number;
    mlr_r2_oos: number;
    lasso_mae: number;
  };
  structural_limitations: Array<{
    title: string;
    description: string;
    mitigation: string;
    severity: 'Critical' | 'Severe' | 'Moderate';
  }>;
  assumption_violations: Array<{
    assumption: string;
    diagnostic_test: string;
    statistic: string;
    verdict: string;
  }>;
}

