import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarDays, SlidersHorizontal } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { AsyncPanel } from '../components/AsyncPanel';
import { PriceTrend, RegionBars } from '../components/Charts';
import { FilterPanel } from '../components/FilterPanel';
import { PageHeader } from '../components/PageHeader';
import { useSelection } from '../hooks/useSelection';

export function MarketExplorer() {
  const meta = useQuery({ queryKey: ['metadata'], queryFn: api.metadata });
  const prices = useQuery({ queryKey: ['prices'], queryFn: api.prices });
  const [selection, setSelection] = useSelection();
  const query = new URLSearchParams(Object.entries(selection)).toString();
  return <>
    <PageHeader eyebrow="Historical intelligence" title="Market Explorer" description="Compare movement, seasonality, and regional price differences." action={<Link className="button primary" to={`/forecast?${query}`}>Use in forecast <ArrowRight/></Link>}/>
    <AsyncPanel loading={meta.isLoading} error={meta.error} onRetry={() => meta.refetch()}>{meta.data && <section className="filter-band"><div className="filter-title"><SlidersHorizontal/><span>Market filters</span></div><FilterPanel metadata={meta.data} value={selection} onChange={setSelection}/><div className="date-pill"><CalendarDays/>Jan 2025 - Sep 2026</div></section>}</AsyncPanel>
    <section className="explorer-grid">
      <article className="panel span-2"><div className="panel-head"><div><span className="overline">Observed price</span><h2>{selection.commodity} in {selection.market}</h2></div><span className="unit">LKR / kg</span></div><AsyncPanel loading={prices.isLoading} error={prices.error}>{prices.data && <PriceTrend data={prices.data}/>}</AsyncPanel></article>
      <article className="panel"><div className="panel-head"><div><span className="overline">Regional comparison</span><h2>Average by market</h2></div></div><RegionBars/></article>
      <article className="panel"><div className="panel-head"><div><span className="overline">Seasonal index</span><h2>Recurring movement</h2></div></div><div className="season-grid">{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((month,index) => <div key={month} style={{'--heat': `${20 + Math.abs(6-index)*8}%`} as React.CSSProperties}><span>{month}</span><strong>{92 + index*2}</strong></div>)}</div></article>
      <article className="panel"><div className="panel-head"><div><span className="overline">Distribution</span><h2>Price range</h2></div></div><div className="distribution"><div className="boxplot"><i/><b/><i/></div><div className="quartiles"><span>Low<strong>Rs. 211</strong></span><span>Median<strong>Rs. 238</strong></span><span>High<strong>Rs. 268</strong></span></div></div></article>
    </section>
  </>;
}
