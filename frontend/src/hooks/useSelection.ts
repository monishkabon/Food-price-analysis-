import { useSearchParams } from 'react-router-dom';
import type { Selection } from '../types';
export const defaultSelection:Selection={category:'Rice',commodity:'Red Nadu',province:'Western',district:'Colombo',market:'Pettah',priceType:'Wholesale'};
export function useSelection(){const [params,setParams]=useSearchParams();const value={...defaultSelection,...Object.fromEntries(Object.keys(defaultSelection).map(k=>[k,params.get(k)??defaultSelection[k as keyof Selection]]))} as Selection;const update=(next:Selection)=>setParams(new URLSearchParams(Object.entries(next)));return [value,update] as const;}
