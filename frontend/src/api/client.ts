import type { MetadataResponse, ModelInfoResponse, OverviewResponse, PredictionRequest, PredictionResponse, PricePoint } from '../types';
import { metadata, modelInfo, overview, predict, trend } from '../mocks/data';
// These price-level scenarios are demo-only. Real R endpoints live in plumber.ts.
const delay=<T>(value:T)=>new Promise<T>(resolve=>setTimeout(()=>resolve(value),250));
export const api={
  metadata:():Promise<MetadataResponse>=>delay(metadata),
  overview:():Promise<OverviewResponse>=>delay(overview),
  prices:():Promise<PricePoint[]>=>delay(trend),
  predict:(body:PredictionRequest):Promise<PredictionResponse>=>delay(predict(body)),
  modelInfo:():Promise<ModelInfoResponse>=>delay(modelInfo),
  health:():Promise<{status:string}>=>delay({status:'operational'})
};
