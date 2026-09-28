import { z } from 'zod';
import type { Features, RiskLevel } from '../types';

const districts:Record<string,string[]> = { Western:['Colombo','Gampaha'], Central:['Kandy','Matale'], Southern:['Galle','Matara'] };
const markets:Record<string,string[]> = { Colombo:['Pettah','Narahenpita'], Gampaha:['Gampaha Central','Negombo'], Kandy:['Kandy Central','Katugastota'], Matale:['Dambulla','Matale'], Galle:['Galle Central','Ambalangoda'], Matara:['Matara Central','Weligama'] };
export const getDistricts = (province:string) => districts[province] ?? [];
export const getMarkets = (district:string) => markets[district] ?? [];
export const getRiskLevel = (value:number):RiskLevel => value < 5 ? 'Low' : value < 10 ? 'Moderate' : 'High';
export const changedScenarioFields = (base:Features, alternative:Features) => (Object.keys(base) as Array<keyof Features>).filter(key => base[key] !== alternative[key]);
export const isForecastStale = (generated:unknown, current:unknown) => JSON.stringify(generated) !== JSON.stringify(current);
export const buildForecastSchema = () => z.object({
  category:z.string().min(1,'Select a category'), commodity:z.string().min(1,'Select a commodity'), province:z.string().min(1,'Select a province'), district:z.string().min(1,'Select a district'), market:z.string().min(1,'Select a market'), priceType:z.string().min(1,'Select a price type'), forecastPeriod:z.coerce.number().min(1).max(12),
  features:z.object({ inflation:z.coerce.number().min(0).max(100), exchangeRate:z.coerce.number().positive(), fuelPrice:z.coerce.number().positive(), rainfall:z.coerce.number().min(0) })
});
export const money = (value:number) => new Intl.NumberFormat('en-LK',{style:'currency',currency:'LKR',minimumFractionDigits:2}).format(value).replace('LKR','Rs.');
export const pct = (value:number) => `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
