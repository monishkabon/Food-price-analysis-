import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { backend } from '../api/plumber';
import { AsyncPanel } from '../components/AsyncPanel';
import { PageHeader } from '../components/PageHeader';
import { MarketSelection } from './MarketSelection';
import { useMarketSelection } from './useMarketSelection';

export function LiveForecast() {
  const context = useMarketSelection();
  const mutation = useMutation({ mutationFn: backend.predict });
  const result = mutation.data;
  const stale = !!result && (result.commodity_id !== context.selection?.commodity_id || result.market_id !== context.selection?.market_id);
  return <>
    <PageHeader eyebrow="R model prediction" title="Movement Forecast"
      description="Estimate next-month price movement size and the probability of a large change using observed price history." />
    <div className="forecast-layout">
      <form className="panel forecast-form" onSubmit={event => {
        event.preventDefault();
        if (context.selection) mutation.mutate(context.selection);
      }}>
        <div className="panel-head"><h2>Forecast context</h2></div>
        <MarketSelection context={context} />
        <div className="decision-note live-note"><p><strong>One month after the latest usable observation</strong>The model estimates movement size in either direction. It does not provide a future price, prediction interval, or economic scenario forecast.</p></div>
        <button className="button primary full" disabled={!context.selection || mutation.isPending || context.markets.isError}>
          <Sparkles />{mutation.isPending ? 'Generating forecast...' : 'Generate forecast'}
        </button>
      </form>
      <section className="results" aria-live="polite">
        <div className="results-heading"><h2>Forecast result</h2></div>
        <AsyncPanel loading={mutation.isPending} error={mutation.error}>
          {stale && <div className="stale-notice">Selection changed. Generate a new forecast for this food and market.</div>}
          {result && !stale ? <div className="result-stack">
            <p className="live-caption">{context.food?.name} · {context.market?.name} · Forecast for {result.forecast_month}</p>
            <article className="prediction-hero">
              <div><span>Expected absolute movement</span><strong>{result.expected_absolute_change_pct.toFixed(2)}%</strong><p>Ridge regression · magnitude in either direction</p></div>
              <div className="change-block"><span>Probability of movement &gt; {result.large_change_threshold_pct}%</span><strong>{result.large_change_probability === null ? 'Unavailable' : `${(result.large_change_probability * 100).toFixed(2)}%`}</strong><p>Logistic regression</p></div>
            </article>
            <div className="result-cards">
              <article><span>Last usable observation</span><strong>{result.last_observed_month}</strong></article>
              <article><span>Forecast month</span><strong>{result.forecast_month}</strong></article>
              <article><span>Model version</span><strong>{result.model_version}</strong></article>
              <article><span>Dataset cutoff</span><strong>{result.data_cutoff}</strong></article>
            </div>
            <div className="decision-note"><p>{result.disclaimer}</p></div>
            {result.warnings.length > 0 && <div className="stale-notice" role="status"><ul>{result.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul></div>}
            <Link className="button secondary full live-section" to="/model-insights">Review model performance</Link>
          </div> : !mutation.error && <div className="empty-result"><Sparkles /><h2>Your forecast will appear here</h2><p>Select a food and market, then generate a forecast using the R backend.</p></div>}
        </AsyncPanel>
      </section>
    </div>
  </>;
}
