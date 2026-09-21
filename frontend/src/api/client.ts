import type { MetadataResponse, ModelInfoResponse, OverviewResponse, PredictionRequest, PredictionResponse, PricePoint } from '../types';
import { metadata, modelInfo, overview, predict, trend } from '../mocks/data';
const mode=import.meta.env.VITE_API_MODE ?? 'mock'; const base=import.meta.env.VITE_API_BASE_URL ?? '/api';
async function live<T>(path:string, init?:RequestInit):Promise<T>{ const response=await fetch(`${base}${path}`,{...init,headers:{'Content-Type':'application/json',...init?.headers}}); if(!response.ok) throw new Error((await response.json().catch(()=>null))?.message ?? 'The data service could not complete this request.'); return response.json(); }
const delay=<T>(value:T)=>new Promise<T>(resolve=>setTimeout(()=>resolve(value),250));
export const api={
  metadata:():Promise<MetadataResponse>=>mode==='live'?live('/metadata'):delay(metadata),
  overview:():Promise<OverviewResponse>=>mode==='live'?live('/overview'):delay(overview),
  prices:():Promise<PricePoint[]>=>mode==='live'?live('/prices'):delay(trend),
  predict:(body:PredictionRequest):Promise<PredictionResponse>=>mode==='live'?live('/predict',{method:'POST',body:JSON.stringify(body)}):delay(predict(body)),
  modelInfo:():Promise<ModelInfoResponse>=>mode==='live'?live('/model/info'):delay(modelInfo),
  health:():Promise<{status:string}>=>mode==='live'?live('/health'):delay({status:'operational'})
};
