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

export const metadata:MetadataResponse = { categories:{ Rice:['Red Nadu','White Nadu','Samba'], Vegetables:['Tomato','Carrot','Beans'], Pulses:['Red Lentils','Green Gram'] }, provinces:{ Western:['Colombo','Gampaha'], Central:['Kandy','Matale'], Southern:['Galle','Matara'] }, markets:{ Colombo:['Pettah','Narahenpita'], Gampaha:['Gampaha Central','Negombo'], Kandy:['Kandy Central','Katugastota'], Matale:['Dambulla','Matale'], Galle:['Galle Central','Ambalangoda'], Matara:['Matara Central','Weligama'] }, priceTypes:['Wholesale','Retail'], dateRange:{min:'2024-01-01',max:'2026-09-20'} };
const labels=['Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep'];
export const trend:PricePoint[] = labels.map((date,i)=>({date,price:[205,211,219,226,231,228,235,239,236,245,249,252][i],regional:[201,208,216,222,226,225,231,236,234,240,244,248][i]}));
export const overview:OverviewResponse = { kpis:[{label:'Average market price',value:'Rs. 242.50',change:'+4.2%',trend:'up'},{label:'Most volatile item',value:'Tomato',change:'12.8%',trend:'up'},{label:'Markets monitored',value:'12',change:'3 provinces',trend:'flat'},{label:'Forecast confidence',value:'86%',change:'+2.1%',trend:'up'}], trend, risks:[{commodity:'Tomato',market:'Dambulla',price:328,change:12.8,risk:'High'},{commodity:'Red Nadu',market:'Pettah',price:252,change:7.4,risk:'Moderate'},{commodity:'Red Lentils',market:'Kandy Central',price:346,change:4.1,risk:'Low'},{commodity:'Carrot',market:'Narahenpita',price:290,change:-2.7,risk:'Low'}], updatedAt:'2026-09-20T18:30:00+05:30' };
export const modelInfo:ModelInfoResponse = { family:'Gradient Boosted Regression',version:'FPI-R 2.4.1',trainingPeriod:'January 2021 - August 2026',metrics:[{name:'MAE',value:'Rs. 8.42/kg'},{name:'RMSE',value:'Rs. 12.17/kg'},{name:'MAPE',value:'4.8%'},{name:'Coverage (90%)',value:'88.6%'}],variables:['Historical market price','Inflation rate','LKR/USD exchange rate','Fuel price','Monthly rainfall','Seasonality','Location and market type'],validation:'Rolling-origin cross-validation over 18 monthly windows.',assumptions:['Input economic indicators remain within observed historical ranges.','Market structure and collection methods remain broadly consistent.'],limitations:['Extreme weather or policy shocks may fall outside learned patterns.','Forecasts support procurement judgment; they are not purchasing instructions.'],volatilityMethod:'Rolling 8-week coefficient of variation. Low <5%, Moderate 5-10%, High >=10%.' };

export function predict(req:PredictionRequest):PredictionResponse {
  const latest=req.commodity==='Tomato'?328:252;
  const pressure=(req.features.inflation-5.2)*.7+(req.features.fuelPrice-311)*.025+(req.features.exchangeRate-302)*.06-(req.features.rainfall-120)*.012;
  const change=6.8+pressure;
  const predicted=+(latest*(1+change/100)).toFixed(2);
  const vol=+(Math.abs(change)*1.15).toFixed(1);
  return {predictionId:`demo-${Date.now()}`,modelVersion:'FPI-R 2.4.1',generatedAt:new Date().toISOString(),currency:'LKR',unit:'kg',latestObservedPrice:latest,latestObservationDate:'2026-09-20',predictedPrice:predicted,expectedChangeAbsolute:+(predicted-latest).toFixed(2),expectedChangePercent:+change.toFixed(1),predictionInterval:{level:90,lower:+(predicted*.92).toFixed(2),upper:+(predicted*1.08).toFixed(2)},volatility:{value:vol,unit:'%',level:vol<5?'Low':vol<10?'Moderate':'High'},forecastSeries:Array.from({length:req.forecastPeriod},(_,i)=>({date:`Month ${i+1}`,predicted:+(latest+(predicted-latest)*(i+1)/req.forecastPeriod).toFixed(2),lower:+((latest+(predicted-latest)*(i+1)/req.forecastPeriod)*.92).toFixed(2),upper:+((latest+(predicted-latest)*(i+1)/req.forecastPeriod)*1.08).toFixed(2)}))};
}

// -------------------------------------------------------------
// Executive EWDSS Agricultural Commodity Datasets & Models
// -------------------------------------------------------------

export const ewdssCommodities: CommodityItem[] = [
  {
    id: 'tomatoes',
    name: 'Tomatoes',
    category: 'Perishable Produce',
    unit: 'LKR/KG',
    currentPrice: 345.0,
    riskLevel: 'High',
    riskProbability: 74.2,
    expectedMovement: 26.4,
  },
  {
    id: 'onions_imported',
    name: 'Onions Imported',
    category: 'Imported Tubers',
    unit: 'LKR/KG',
    currentPrice: 275.0,
    riskLevel: 'Moderate',
    riskProbability: 42.5,
    expectedMovement: 8.15,
  },
  {
    id: 'potatoes_imported',
    name: 'Potatoes Imported',
    category: 'Imported Tubers',
    unit: 'LKR/KG',
    currentPrice: 245.0,
    riskLevel: 'Moderate',
    riskProbability: 36.8,
    expectedMovement: 6.4,
  },
  {
    id: 'rice_white',
    name: 'Rice White',
    category: 'Staple Grain',
    unit: 'LKR/KG',
    currentPrice: 218.0,
    riskLevel: 'Low',
    riskProbability: 11.4,
    expectedMovement: 1.62,
  },
  {
    id: 'lentils',
    name: 'Lentils',
    category: 'Imported Pulses',
    unit: 'LKR/KG',
    currentPrice: 312.0,
    riskLevel: 'Low',
    riskProbability: 8.6,
    expectedMovement: 1.31,
  },
];

export const ewdssMarkets: MarketItem[] = [
  {
    id: 'colombo_city',
    name: 'Colombo City',
    district: 'Colombo',
    province: 'Western',
    marketType: 'Retail Metropolitan Centre',
  },
  {
    id: 'pettah',
    name: 'Pettah',
    district: 'Colombo',
    province: 'Western',
    marketType: 'National Wholesale Terminal',
  },
  {
    id: 'kurunegala',
    name: 'Kurunegala',
    district: 'Kurunegala',
    province: 'North Western',
    marketType: 'Agrarian Commercial Hub',
  },
  {
    id: 'kandy',
    name: 'Kandy',
    district: 'Kandy',
    province: 'Central',
    marketType: 'Highland Distribution Corridor',
  },
  {
    id: 'anuradhapura',
    name: 'Anuradhapura',
    district: 'Anuradhapura',
    province: 'North Central',
    marketType: 'Paddy & Dry Zone Exchange',
  },
];

const marketMultipliers: Record<string, number> = {
  colombo_city: 1.04,
  pettah: 0.97,
  kurunegala: 0.98,
  kandy: 1.02,
  anuradhapura: 0.95,
};

export function predictEwdss(req: EwdssPredictionRequest): EwdssPredictionResponse {
  const commodity = ewdssCommodities.find(c => c.id === req.commodity_id) ?? ewdssCommodities[0];
  const market = ewdssMarkets.find(m => m.id === req.market_id) ?? ewdssMarkets[0];
  const multiplier = marketMultipliers[market.id] ?? 1.0;

  const currentPrice = +(commodity.currentPrice * multiplier).toFixed(2);
  const movementPct = commodity.expectedMovement;
  const expectedMovementAbs = +((currentPrice * movementPct) / 100).toFixed(2);
  const predictedPrice = +(currentPrice + expectedMovementAbs).toFixed(2);

  // Warning flags logic
  const warningFlags: string[] = [];
  if (commodity.id === 'tomatoes') {
    warningFlags.push('Preceding Month Volatility Spike Detected');
    warningFlags.push('Central Highland Monsoon Supply Shock');
    warningFlags.push('Cost-Optimal Cutoff Triggered (p* ≥ 0.25)');
  } else if (commodity.id === 'onions_imported') {
    warningFlags.push('Preceding Month Volatility Spike Detected');
    warningFlags.push('Seasonal Export Quota Tightening');
    warningFlags.push('Cost-Optimal Cutoff Triggered (p* ≥ 0.25)');
  } else if (commodity.id === 'potatoes_imported') {
    warningFlags.push('Preceding Month Volatility Spike Detected');
    warningFlags.push('Import Freight & Tariff Fluctuations');
    warningFlags.push('Cost-Optimal Cutoff Triggered (p* ≥ 0.25)');
  } else if (commodity.id === 'rice_white') {
    warningFlags.push('Standard Seasonal Fluctuation');
    warningFlags.push('Macro Disinflation Regime Active');
    warningFlags.push('Maha Harvest Buffer Stabilized');
  } else {
    warningFlags.push('Standard Seasonal Fluctuation');
    warningFlags.push('Steady Import Supply Flow');
  }

  // Prescriptive decision engine rules based on Risk Probability
  let recommendation: EwdssPredictionResponse['recommendation'];

  if (commodity.riskProbability < 25) {
    recommendation = {
      action: 'LOW RISK — Maintain standard spot-market replenishment.',
      level: 'low',
      summary: `Minimal price instability expected (${movementPct > 0 ? '+' : ''}${movementPct.toFixed(2)}%). Stable supply conditions warrant standard spot procurement schedules without forward lock premiums.`,
      details: [
        'Maintain routine spot-market replenishment with vetted primary suppliers.',
        'Keep standard 10-day buffer inventory at retail store stockrooms.',
        'No cash reserve expansion required; working capital can remain deployed elsewhere.',
        'Baseline 3-Month Moving Average heuristic is optimal (Test MAE: 1.31% - 1.62%).',
      ],
      forward_contract_months: 'Standard Spot Replenishment',
      buffer_stock_days: 10,
      cash_buffer_pct: 0,
      hedging_ratio: '100% Spot Purchasing',
      sourcing_advice: `Execute routine purchase orders via ${market.name} wholesale counters and direct millers in Polonnaruwa/Anuradhapura.`,
    };
  } else if (commodity.riskProbability <= 50) {
    recommendation = {
      action: 'MODERATE RISK — Monitor weekly price revisions; establish 10% cash buffer.',
      level: 'moderate',
      summary: `Moderate volatility risk (${commodity.riskProbability}% probability of >10% price jump). Cost-optimal cutoff (p* = 0.25) is breached. Increased procurement scrutiny is required.`,
      details: [
        'Shift purchasing review cadence from bi-weekly to strict weekly price revisions.',
        'Establish an immediate 10% dedicated cash buffer to absorb short-term wholesale fluctuations.',
        'Stagger 30 to 60-day bilateral supplier agreements to hedge against currency and tariff adjustments.',
        'Expand central warehouse buffer inventory from 10 days to 18-21 days.',
      ],
      forward_contract_months: '30 - 60 Days Staggered',
      buffer_stock_days: 18,
      cash_buffer_pct: 10,
      hedging_ratio: '55% Forward / 45% Spot',
      sourcing_advice: `Negotiate staggered volume quotas through Pettah terminal importers and Peliyagoda logistics hub.`,
    };
  } else {
    recommendation = {
      action: 'HIGH RISK ALERT — Do not purchase on spot. Lock 3-6 month forward supplier contracts immediately or draw down central warehouse safety stock.',
      level: 'high',
      summary: `CRITICAL PRICE SURGE ALERT (${commodity.riskProbability}% probability of severe spike >10%). Expected price increase: +${movementPct.toFixed(2)}%. Immediate procurement risk mitigation mandated.`,
      details: [
        'IMMEDIATE FREEZE on open spot-market purchasing at retail district levels.',
        'Lock 3-6 month forward volume contracts with regional producers and wholesale aggregators.',
        'Draw down central warehouse safety buffer stock to insulate retail gross margins from wholesale inflation.',
        'Activate dynamic retail shelf pricing collars to prevent shelf margin compression.',
      ],
      forward_contract_months: '3 - 6 Months Locked Bilateral',
      buffer_stock_days: 28,
      cash_buffer_pct: 25,
      hedging_ratio: '80% Forward Locked / 20% Safety Stock Drawdown',
      sourcing_advice: `Bypass local retail markets immediately. Execute direct farmgate procurement and truckload arbitrage at Dambulla Dedicated Economic Centre.`,
    };
  }

  return {
    commodity_id: commodity.id,
    commodity_name: commodity.name,
    market_id: market.id,
    market_name: market.name,
    risk_probability: commodity.riskProbability,
    risk_level: commodity.riskLevel,
    expected_movement_pct: movementPct,
    expected_movement_abs: expectedMovementAbs,
    current_price: currentPrice,
    predicted_price: predictedPrice,
    warning_flags: warningFlags,
    cost_optimal_cutoff: 0.25,
    recommendation,
    model_diagnostics: {
      trailing_3m_volatility: commodity.id === 'tomatoes' ? 22.8 : commodity.id.includes('onions') ? 8.4 : commodity.id.includes('potatoes') ? 7.6 : 2.1,
      dominant_predictor: 'mean_absolute_change_3m (LASSO beta = +3.61)',
      baseline_mae: commodity.id === 'tomatoes' ? 22.86 : commodity.id.includes('lentils') ? 1.31 : 1.62,
      mlr_mae: commodity.id === 'tomatoes' ? 20.87 : commodity.id.includes('lentils') ? 6.47 : 6.03,
      lasso_sparsity: '85.7% feature elimination under 1-SE rule',
    },
  };
}

// -------------------------------------------------------------
// Historical Price Series & Historical Spikes (>50% MoM)
// -------------------------------------------------------------

const monthlyDates = [
  { ym: '2024-01', label: 'Jan 24' },
  { ym: '2024-02', label: 'Feb 24' },
  { ym: '2024-03', label: 'Mar 24' },
  { ym: '2024-04', label: 'Apr 24' },
  { ym: '2024-05', label: 'May 24' },
  { ym: '2024-06', label: 'Jun 24' },
  { ym: '2024-07', label: 'Jul 24' },
  { ym: '2024-08', label: 'Aug 24' },
  { ym: '2024-09', label: 'Sep 24' },
  { ym: '2024-10', label: 'Oct 24' },
  { ym: '2024-11', label: 'Nov 24' },
  { ym: '2024-12', label: 'Dec 24' },
  { ym: '2025-01', label: 'Jan 25' },
  { ym: '2025-02', label: 'Feb 25' },
  { ym: '2025-03', label: 'Mar 25' },
  { ym: '2025-04', label: 'Apr 25' },
  { ym: '2025-05', label: 'May 25' },
  { ym: '2025-06', label: 'Jun 25' },
  { ym: '2025-07', label: 'Jul 25' },
  { ym: '2025-08', label: 'Aug 25' },
  { ym: '2025-09', label: 'Sep 25' },
];

export function getPriceHistory(commodity_id: string, market_id: string): HistoricalPricePoint[] {
  const mult = marketMultipliers[market_id] ?? 1.0;

  // Base trajectories from Jan 2024 - Sep 2025 with authentic historical shock dynamics
  let basePrices: number[];
  let spikeNotes: Record<number, string> = {};

  if (commodity_id === 'tomatoes') {
    // Highly perishable, extreme spikes in May 24 and Dec 24 (>50% MoM)
    basePrices = [
      175, 185, 178, 195, 320, 275, 220, 205, 235, 230, 255, 395,
      345, 290, 260, 275, 285, 295, 310, 328, 345,
    ];
    spikeNotes = {
      4: 'May 24 Monsoon Supply Destruction (+64.1% MoM)',
      11: 'Dec 24 Highland Crop Rupture (+54.9% MoM)',
    };
  } else if (commodity_id === 'onions_imported') {
    // Import tariff / export embargo shock in Feb 2024 (+56.5% MoM)
    basePrices = [
      198, 310, 285, 270, 260, 250, 245, 240, 250, 258, 262, 270,
      272, 268, 265, 260, 262, 265, 268, 270, 275,
    ];
    spikeNotes = {
      1: 'Feb 24 Regional Import Embargo & Tariff Surcharge (+56.6% MoM)',
    };
  } else if (commodity_id === 'potatoes_imported') {
    basePrices = [
      190, 205, 220, 225, 230, 235, 228, 225, 230, 232, 238, 245,
      242, 240, 236, 235, 238, 240, 242, 244, 245,
    ];
  } else if (commodity_id === 'rice_white') {
    // Very stable disinflation regime
    basePrices = [
      210, 212, 215, 216, 218, 217, 215, 216, 215, 217, 219, 220,
      219, 218, 216, 215, 216, 217, 218, 218, 218,
    ];
  } else {
    // Lentils - steady
    basePrices = [
      325, 324, 320, 318, 316, 315, 314, 312, 314, 315, 316, 315,
      314, 313, 312, 311, 312, 312, 313, 312, 312,
    ];
  }

  return basePrices.map((base, idx) => {
    const price = +(base * mult).toFixed(2);
    const prev = idx === 0 ? base : basePrices[idx - 1];
    const mom_change_pct = idx === 0 ? 0 : +(((base - prev) / prev) * 100).toFixed(2);
    const is_spike = mom_change_pct > 50;

    return {
      date: monthlyDates[idx].ym,
      month_label: monthlyDates[idx].label,
      price,
      mom_change_pct,
      is_spike,
      spike_label: is_spike ? spikeNotes[idx] ?? `Severe Spike: +${mom_change_pct.toFixed(1)}% MoM` : undefined,
      volume_index: +(100 + Math.sin(idx) * 15).toFixed(0),
    };
  });
}

export function getVolatilityHistory(commodity_id: string, market_id: string): VolatilityHistoryPoint[] {
  const mult = marketMultipliers[market_id] ?? 1.0;

  let baseVol: number[];
  if (commodity_id === 'tomatoes') {
    baseVol = [
      12.4, 14.8, 11.2, 19.5, 38.6, 29.4, 18.2, 14.5, 16.8, 15.2, 21.4, 35.8,
      27.2, 19.4, 15.1, 14.2, 16.5, 17.8, 19.2, 21.5, 23.4,
    ];
  } else if (commodity_id === 'onions_imported') {
    baseVol = [
      6.2, 28.5, 22.1, 14.2, 11.0, 8.4, 7.1, 6.5, 6.8, 7.2, 7.8, 8.5,
      7.9, 7.2, 6.8, 6.4, 6.9, 7.3, 7.8, 8.2, 8.5,
    ];
  } else if (commodity_id === 'potatoes_imported') {
    baseVol = [
      5.1, 6.4, 7.2, 7.5, 6.8, 6.2, 5.8, 5.4, 5.9, 6.1, 6.5, 7.2,
      6.8, 6.2, 5.9, 5.7, 6.2, 6.5, 6.9, 7.2, 7.6,
    ];
  } else if (commodity_id === 'rice_white') {
    baseVol = [
      2.8, 2.5, 2.4, 2.2, 2.1, 1.9, 1.8, 1.8, 1.9, 2.0, 2.1, 2.2,
      2.0, 1.9, 1.7, 1.6, 1.6, 1.7, 1.8, 1.7, 1.7,
    ];
  } else {
    baseVol = [
      2.1, 1.9, 1.8, 1.6, 1.5, 1.4, 1.4, 1.3, 1.4, 1.5, 1.5, 1.4,
      1.4, 1.3, 1.3, 1.2, 1.3, 1.3, 1.4, 1.3, 1.3,
    ];
  }

  return baseVol.map((vol, idx) => {
    const adjVol = +(vol * (mult > 1 ? 1.02 : 0.98)).toFixed(1);
    const risk_level = adjVol < 5 ? 'Low' : adjVol < 10 ? 'Moderate' : 'High';
    return {
      date: monthlyDates[idx].ym,
      month_label: monthlyDates[idx].label,
      volatility_3m: adjVol,
      threshold_10pct: 10,
      alert_cutoff_25pct: 25,
      risk_level,
    };
  });
}

// -------------------------------------------------------------
// Model Governance & Statistical Performance Benchmark Data
// -------------------------------------------------------------

export const modelGovernanceData: ModelGovernanceResponse = {
  logistic: {
    precision: 83.2,
    recall: 52.3,
    calibrated_recall: 80.9,
    accuracy: 81.0,
    brier_score: 0.1454,
    roc_auc: 0.8391,
    cost_reduction_pct: 30.5,
    cost_fn: 4.0,
    cost_fp: 1.0,
  },
  continuous_benchmarks: {
    baseline_mae: 7.74,
    ridge_mae: 11.45,
    mlr_mae: 9.50,
    mlr_rmse: 13.22,
    mlr_r2_oos: 0.4133,
    lasso_mae: 10.80,
  },
  structural_limitations: [
    {
      title: 'Temporal Autocorrelation & Regional Supply Clustering',
      description: 'Panel clustering across provincial supply corridors (Durbin-Watson DW = 2.20). Cold chain and transport bottlenecks between Dambulla and Colombo introduce localized covariance.',
      mitigation: 'Implement clustered standard errors and hierarchical market-level random intercepts in v1.1.0 update.',
      severity: 'Severe',
    },
    {
      title: 'Historical Dataset Cutoff & Macro Disinflation Break',
      description: 'Training window incorporates Sri Lanka’s 2022 currency devaluation (>80% LKR/USD drop) and 90%+ food inflation. The held-out test split (April–Sept 2025) experienced macroeconomic stabilization.',
      mitigation: 'Monthly rolling re-estimation window on the 1st of each calendar month to rapidly adapt model coefficients to disinflation regimes.',
      severity: 'Critical',
    },
    {
      title: 'Fixed-Effects Structure & Omission of Exogenous Real-Time Shocks',
      description: 'Model features currently rely on trailing price dispersion and lag vectors. Real-time satellite rainfall anomalies, diesel freight tariffs, and sudden import duty gazettes are not fully endogenized.',
      mitigation: 'Incorporate live API connectors for Central Bank of Sri Lanka (CBSL) exchange rates and CPC fuel indices.',
      severity: 'Moderate',
    },
    {
      title: 'Severe Heteroscedasticity & Right-Tail Price Explosions',
      description: 'Extreme non-normality (Shapiro-Wilk W = 0.668, p < 1e-60) and Breusch-Pagan error expansion (BP = 331.32, p < 1e-60). OLS severely underestimates tail price explosion risks.',
      mitigation: 'Decouple prediction architecture: use Logistic GLM for shock classification rather than relying on linear point estimates.',
      severity: 'Critical',
    },
  ],
  assumption_violations: [
    {
      assumption: '1. Multicollinearity',
      diagnostic_test: 'Variance Inflation Factor (VIF)',
      statistic: 'Max VIF = 13.64 (rolling vol vs MAD)',
      verdict: 'SEVERELY VIOLATED (Resolved via LASSO L1 pruning to single feature)',
    },
    {
      assumption: '2. Homoscedasticity of Errors',
      diagnostic_test: 'Studentized Breusch-Pagan Test',
      statistic: 'BP = 331.32, p = 1.23e-67',
      verdict: 'SEVERELY VIOLATED (Residual variance widens 8x during crisis shocks)',
    },
    {
      assumption: '3. Normality of Residuals',
      diagnostic_test: 'Shapiro-Wilk Test (n = 3,000)',
      statistic: 'W = 0.6684, p = 1.67e-60',
      verdict: 'SEVERELY VIOLATED (Extreme positive skewness up to +206.9% max)',
    },
    {
      assumption: '4. Independence of Errors',
      diagnostic_test: 'Durbin-Watson Test',
      statistic: 'DW = 2.1989, p = 1.00',
      verdict: 'BORDERLINE / PANEL CLUSTERED (Supply corridors create spatial covariance)',
    },
  ],
};

