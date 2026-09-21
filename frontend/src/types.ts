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
