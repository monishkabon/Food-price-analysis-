import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { backend } from '../api/plumber';

export function useMarketSelection() {
  const [params, setParams] = useSearchParams();
  const foods = useQuery({ queryKey: ['backend', 'foods'], queryFn: backend.foods });
  const food = foods.data?.find(item => item.id === Number(params.get('commodity_id'))) ?? foods.data?.[0];
  const markets = useQuery({
    queryKey: ['backend', 'markets', food?.id],
    queryFn: () => backend.markets(food!.id), enabled: !!food,
  });
  const market = markets.data?.find(item => item.id === Number(params.get('market_id'))) ?? markets.data?.[0];
  const selection = food && market ? { commodity_id: food.id, market_id: market.id } : null;
  return {
    food, market, foods, markets, selection,
    search: selection ? `?commodity_id=${selection.commodity_id}&market_id=${selection.market_id}` : '',
    selectFood: (id: string) => setParams({ commodity_id: id }),
    selectMarket: (id: string) => setParams({ commodity_id: String(food!.id), market_id: id }),
  };
}
