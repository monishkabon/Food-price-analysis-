// src/components/FoodMarketSelector.jsx
import { useEffect } from 'react';
import { useApi } from '../hooks/useApi';
import { fetchFoods, fetchMarkets } from '../services/api';

export default function FoodMarketSelector({ selection, onSelectionChange }) {
  const { commodityId, marketId } = selection;

  const { data: foods, loading: loadingFoods } = useApi(fetchFoods, []);
  const { data: markets, loading: loadingMarkets } = useApi(
    () => fetchMarkets(commodityId),
    [commodityId],
    { skip: !commodityId }
  );

  // Reset market when commodity changes
  useEffect(() => {
    if (commodityId) onSelectionChange({ commodityId, marketId: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commodityId]);

  return (
    <div className="selector-row">
      <div className="field-group">
        <label htmlFor="commodity-select">Food item</label>
        <select
          id="commodity-select"
          value={commodityId ?? ''}
          onChange={e => onSelectionChange({
            commodityId: e.target.value ? Number(e.target.value) : null,
            marketId: null,
          })}
          disabled={loadingFoods}
        >
          <option value="">— Select a food item —</option>
          {foods?.map(f => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        {loadingFoods && <span className="text-xs text-muted" style={{marginTop: 4}}>Loading foods…</span>}
      </div>

      <div className="field-group">
        <label htmlFor="market-select">Market</label>
        <select
          id="market-select"
          value={marketId ?? ''}
          onChange={e => onSelectionChange({
            commodityId,
            marketId: e.target.value ? Number(e.target.value) : null,
          })}
          disabled={!commodityId || loadingMarkets}
        >
          <option value="">
            {!commodityId ? '— Select a food first —' : '— Select a market —'}
          </option>
          {markets?.map(m => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.district})
            </option>
          ))}
        </select>
        {loadingMarkets && <span className="text-xs text-muted" style={{marginTop: 4}}>Loading markets…</span>}
      </div>
    </div>
  );
}
