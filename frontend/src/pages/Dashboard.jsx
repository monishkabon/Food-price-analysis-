// src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import FoodMarketSelector from '../components/FoodMarketSelector';
import PriceHistoryChart from '../components/PriceHistoryChart';
import VolatilityChart from '../components/VolatilityChart';
import { LoadingState, EmptyState, ErrorState, MockBanner } from '../components/StatusBanner';
import { useApi } from '../hooks/useApi';
import { fetchPriceHistory, fetchVolatilityHistory, USE_MOCK } from '../services/api';

export default function Dashboard() {
  const [selection, setSelection] = useState({ commodityId: null, marketId: null });
  const { commodityId, marketId } = selection;
  const hasSelection = commodityId && marketId;

  const {
    data: historyData,
    loading: loadingHistory,
    error: historyError,
    refetch: refetchHistory,
  } = useApi(
    () => fetchPriceHistory(commodityId, marketId),
    [commodityId, marketId],
    { skip: !hasSelection }
  );

  const {
    data: volData,
    loading: loadingVol,
    error: volError,
  } = useApi(
    () => fetchVolatilityHistory(commodityId, marketId),
    [commodityId, marketId],
    { skip: !hasSelection }
  );

  const series = historyData?.series ?? [];
  const meta   = historyData?.meta ?? {};
  const latestRow = series[series.length - 1];
  const prevRow   = series[series.length - 2];

  const priceDiff = latestRow && prevRow
    ? ((latestRow.price - prevRow.price) / prevRow.price * 100)
    : null;

  return (
    <div className="animate-fade-in">
      {USE_MOCK && <MockBanner />}

      <div className="page-header">
        <h1>Price Dashboard</h1>
        <p>Select a food item and market to explore historical prices and volatility.</p>
      </div>

      <FoodMarketSelector selection={selection} onSelectionChange={setSelection} />

      {/* Stats row */}
      {hasSelection && !loadingHistory && latestRow && (
        <div className="stat-grid mb-6 animate-fade-in-up">
          <div className="card">
            <div className="card__title">Latest price</div>
            <div className="card__value">LKR {Number(latestRow.price).toFixed(2)}</div>
            <div className="card__sub">{meta.unit} · Retail · {latestRow.date}</div>
          </div>

          <div className="card">
            <div className="card__title">Monthly change</div>
            <div className="card__value" style={{
              color: priceDiff >= 0 ? 'var(--clr-accent-green)' : 'var(--clr-accent-red)',
            }}>
              {priceDiff != null ? `${priceDiff >= 0 ? '+' : ''}${priceDiff.toFixed(2)}%` : '—'}
            </div>
            <div className="card__sub">{prevRow?.date} → {latestRow.date}</div>
          </div>

          <div className="card">
            <div className="card__title">Data coverage</div>
            <div className="card__value">{meta.n_months}</div>
            <div className="card__sub">months ({meta.first_month} – {meta.last_month})</div>
          </div>

          <div className="card">
            <div className="card__title">Data cutoff</div>
            <div className="card__value" style={{ fontSize: 'var(--font-size-xl)', color: 'var(--clr-accent-gold)' }}>
              {meta.data_cutoff}
            </div>
            <div className="card__sub">Historical prototype only</div>
          </div>
        </div>
      )}

      {!hasSelection && (
        <EmptyState
          icon="🥬"
          title="Select a food item and market"
          description="Choose a commodity and market from the dropdowns above to view price history and volatility charts."
        />
      )}

      {hasSelection && loadingHistory && <LoadingState message="Loading price history…" />}

      {hasSelection && historyError && (
        <ErrorState message={historyError} onRetry={refetchHistory} />
      )}

      {hasSelection && !loadingHistory && !historyError && series.length === 0 && (
        <EmptyState
          icon="📭"
          title="No data available"
          description="No price records were found for this food–market combination. Try selecting a different market."
        />
      )}

      {/* Charts */}
      {hasSelection && !loadingHistory && series.length > 0 && (
        <div className="flex-col gap-6 animate-fade-in-up">
          {/* Price history */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
              <div>
                <div className="card__title">Historical Retail Price</div>
                <div className="text-sm text-muted">LKR per KG · monthly observations</div>
              </div>
              {latestRow?.spike_flag && (
                <span className="badge badge--gold">⚠ Recent spike flagged</span>
              )}
            </div>
            <PriceHistoryChart series={series} dataCutoff={meta.data_cutoff} />
          </div>

          {/* Volatility */}
          <div className="card">
            <div style={{ marginBottom: 'var(--sp-4)' }}>
              <div className="card__title">3-Month Rolling Volatility</div>
              <div className="text-sm text-muted">Standard deviation of log price changes · higher = more volatile</div>
            </div>
            {loadingVol && <LoadingState message="Loading volatility…" />}
            {volError  && <ErrorState message={volError} />}
            {!loadingVol && !volError && (
              <VolatilityChart series={volData?.series ?? []} />
            )}
          </div>

          {/* Spike table */}
          {series.filter(r => r.spike_flag).length > 0 && (
            <div className="card">
              <div className="card__title" style={{ marginBottom: 'var(--sp-4)' }}>
                Price Spike Flags ({series.filter(r => r.spike_flag).length} months with &gt;50% change)
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="perf-table">
                  <thead>
                    <tr><th>Month</th><th>Price (LKR)</th><th>Monthly Δ%</th></tr>
                  </thead>
                  <tbody>
                    {series.filter(r => r.spike_flag).map(r => (
                      <tr key={r.date}>
                        <td>{r.date}</td>
                        <td>{Number(r.price).toFixed(2)}</td>
                        <td style={{ color: 'var(--clr-accent-gold)', fontWeight: 600 }}>
                          {Number(r.monthly_change_pct).toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
