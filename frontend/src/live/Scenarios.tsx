import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';

export function LiveScenarios() {
  return <>
    <PageHeader eyebrow="Model capabilities" title="Scenario Analysis" description="Economic scenario analysis is unavailable for the current R models." />
    <article className="panel"><h2>Historical price inputs</h2><p>The current models use historical price changes, rolling statistics, and month of year. They do not accept inflation, fuel prices, rainfall, or exchange-rate assumptions.</p><p>You can explore observed prices or request the next-month movement forecast for a food and market.</p><Link className="button primary" to="/forecast">Open movement forecast</Link></article>
  </>;
}
