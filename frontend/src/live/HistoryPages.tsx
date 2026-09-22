import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { backend } from '../api/plumber';
import { AsyncPanel } from '../components/AsyncPanel';
import { PriceTrend } from '../components/Charts';
import { PageHeader } from '../components/PageHeader';
import { money, pct } from '../lib/domain';
import { MarketSelection } from './MarketSelection';
import { useMarketSelection } from './useMarketSelection';

function HistoryPage({ expanded = false }: { expanded?: boolean }) {
  const context = useMarketSelection();
  const { selection, food, market } = context;
  const metadata = useQuery({ queryKey: ['backend', 'metadata'], queryFn: backend.metadata });
  const history = useQuery({
    queryKey: ['backend', 'history', selection],
    queryFn: () => backend.history(selection!), enabled: !!selection,
  });
  const volatility = useQuery({
    queryKey: ['backend', 'volatility', selection],
    queryFn: () => backend.volatility(selection!), enabled: expanded && !!selection,
  });
  const data = history.data;
  const latest = data?.series.at(-1);
  const latestVolatility = volatility.data?.series.at(-1);
  return <>
    <PageHeader eyebrow="WFP historical data" title={expanded ? 'Market Explorer' : 'Food Price Overview'}
      description="Explore the observed monthly prices used by your R models."
      action={<Link className="button primary" to={`/forecast${context.search}`}>Create forecast <ArrowRight /></Link>} />
    <MarketSelection context={context} />
    <AsyncPanel loading={metadata.isLoading} error={metadata.error} onRetry={() => metadata.refetch()}>
      {metadata.data && <div className="decision-note live-note"><p><strong>Historical dataset · through {metadata.data.data_cutoff}</strong>{metadata.data.disclaimer}</p></div>}
    </AsyncPanel>
    {selection && <AsyncPanel loading={history.isLoading} error={history.error} onRetry={() => history.refetch()}>
      {data && latest ? <>
        <section className="metrics">
          <article className="metric"><p>Latest observed price</p><strong>{money(latest.price)}</strong><span>{data.meta.unit} · {data.meta.price_type} · {latest.date}</span></article>
          <article className="metric"><p>Monthly price change</p><strong>{latest.monthly_change_pct === null ? 'Unavailable' : pct(latest.monthly_change_pct)}</strong><span>Observed change from the preceding month</span></article>
          <article className="metric"><p>Observed months</p><strong>{data.meta.n_months}</strong><span>{data.meta.first_month} – {data.meta.last_month}</span></article>
          <article className="metric"><p>Available markets</p><strong>{context.markets.data?.length ?? 0}</strong><span>For {food?.name}</span></article>
        </section>
        <article className="panel live-section">
          <div className="panel-head"><div><span className="overline">Observed price history</span><h2>{food?.name} in {market?.name}</h2></div><span className="unit">{data.meta.currency} / {data.meta.unit} · {data.meta.price_type}</span></div>
          <PriceTrend data={data.series} />
        </article>
        {expanded && <AsyncPanel loading={volatility.isLoading} error={volatility.error} onRetry={() => volatility.refetch()}>
          {latestVolatility ? <section className="result-cards">
            <article><span>3-month rolling volatility · {latestVolatility.date}</span><strong>{latestVolatility.rolling_volatility_3m.toFixed(4)}</strong><p className="live-caption">Standard deviation of log price changes.</p></article>
            <article><span>3-month mean absolute change · {latestVolatility.date}</span><strong>{latestVolatility.mean_absolute_change_3m.toFixed(2)}%</strong><p className="live-caption">Average movement size in the rolling window.</p></article>
          </section> : volatility.data && <p>No complete rolling-volatility window is available for this series.</p>}
        </AsyncPanel>}
        <article className="panel table-panel live-section">
          <div className="panel-head"><h2>{expanded ? 'Monthly observations' : 'Recent observations'}</h2></div>
          <div className="table-wrap live-history-table"><table><thead><tr><th>Month</th><th>Price ({data.meta.currency}/{data.meta.unit})</th><th>Monthly change</th><th>Spike flag</th></tr></thead>
            <tbody>{(expanded ? [...data.series] : data.series.slice(-6)).reverse().map(row => <tr key={row.date}><td>{row.date}</td><td>{money(row.price)}</td><td>{row.monthly_change_pct === null ? 'Unavailable' : pct(row.monthly_change_pct)}</td><td>{row.spike_flag ? 'Flagged' : 'None'}</td></tr>)}</tbody>
          </table></div>
        </article>
      </> : data && <p>No observations are available for this selection.</p>}
    </AsyncPanel>}
  </>;
}

export function LiveOverview() { return <HistoryPage />; }
export function LiveMarketExplorer() { return <HistoryPage expanded />; }
