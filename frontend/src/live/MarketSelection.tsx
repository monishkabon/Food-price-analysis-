import { AsyncPanel } from '../components/AsyncPanel';
import type { useMarketSelection } from './useMarketSelection';

export function MarketSelection({ context }: { context: ReturnType<typeof useMarketSelection> }) {
  const { foods, markets, food, market, selectFood, selectMarket } = context;
  return <section className="filter-band">
    <div className="filter-title">Choose a food and market</div>
    <AsyncPanel loading={foods.isLoading} error={foods.error} onRetry={() => foods.refetch()}>
      <div className="filters live-filters">
        <label>Commodity<select value={food?.id ?? ''} onChange={event => selectFood(event.target.value)} disabled={!foods.data?.length}>
          {!foods.data?.length && <option value="">No foods available</option>}
          {foods.data?.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>
        <label>Market<select value={market?.id ?? ''} onChange={event => selectMarket(event.target.value)} disabled={!markets.data?.length || markets.isError}>
          {!markets.data?.length && <option value="">{markets.isFetching ? 'Loading markets...' : 'No markets available'}</option>}
          {markets.data?.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select></label>
      </div>
      {market && <p className="live-caption">{market.district} · {market.province}</p>}
      {markets.error && <AsyncPanel loading={false} error={markets.error} onRetry={() => markets.refetch()}>{null}</AsyncPanel>}
    </AsyncPanel>
  </section>;
}
