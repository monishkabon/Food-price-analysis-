// src/components/PerformanceTable.jsx
// Model performance comparison table + confusion matrix

function MetricCell({ value, baseline, higherIsBetter = false }) {
  if (value == null || baseline == null) return <td className="perf-table td">{value?.toFixed(3) ?? '—'}</td>;
  const better = higherIsBetter ? value > baseline : value < baseline;
  return (
    <td className={better ? 'metric--better' : 'metric--worse'}>
      {value.toFixed(3)}
    </td>
  );
}

export function ContinuousPerformanceTable({ rows = [] }) {
  const baseline = rows.find(r => r.model === 'Baseline');
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="perf-table">
        <thead>
          <tr>
            <th>Model</th>
            <th>MAE (pp)</th>
            <th>RMSE (pp)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.model}>
              <td style={{ fontWeight: row.model === 'Ridge' ? 700 : 400 }}>
                {row.model}
                {row.model === 'Ridge' && (
                  <span className="badge badge--green" style={{ marginLeft: 8, fontSize: 10 }}>Selected</span>
                )}
              </td>
              {row.model === 'Baseline' ? (
                <>
                  <td>{row.mae?.toFixed(3)}</td>
                  <td>{row.rmse?.toFixed(3)}</td>
                </>
              ) : (
                <>
                  <MetricCell value={row.mae}  baseline={baseline?.mae}  />
                  <MetricCell value={row.rmse} baseline={baseline?.rmse} />
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-muted" style={{ marginTop: 8 }}>
        pp = percentage points. Lower is better. Values in green beat the baseline.
      </p>
    </div>
  );
}

export function BinaryPerformanceTable({ metrics }) {
  if (!metrics) return null;
  const rows = [
    { label: 'Brier score',     value: metrics.brier_score?.toFixed(3), note: 'lower = better calibrated' },
    { label: 'Precision',       value: metrics.precision?.toFixed(3),   note: '' },
    { label: 'Recall',          value: metrics.recall?.toFixed(3),      note: '' },
    { label: 'F1',              value: metrics.f1?.toFixed(3),          note: '' },
    { label: 'Accuracy',        value: metrics.accuracy?.toFixed(3),    note: '' },
  ];
  return (
    <table className="perf-table">
      <thead>
        <tr><th>Metric</th><th>Value</th><th>Notes</th></tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.label}>
            <td>{r.label}</td>
            <td><strong>{r.value}</strong></td>
            <td className="text-xs text-muted">{r.note}</td>
          </tr>
        ))}
        <tr>
          <td colSpan={3} style={{ paddingTop: 8 }}>
            <span className="text-xs text-muted">
              Classification threshold: P ≥ {metrics.prob_cutoff} → large change alert ·
              Price-change threshold: {metrics.threshold_pct}%
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function ConfusionMatrix({ metrics }) {
  if (!metrics) return null;
  const { tp, fp, fn, tn } = metrics;
  return (
    <div>
      <div className="text-xs text-muted" style={{ marginBottom: 12 }}>
        Predicted → across | Actual → down
      </div>
      <div className="confusion-matrix">
        <div className="cm-cell cm-cell--tp">
          <div className="cm-cell__value">{tp}</div>
          <div className="cm-cell__label">True Positive</div>
        </div>
        <div className="cm-cell cm-cell--fp">
          <div className="cm-cell__value">{fp}</div>
          <div className="cm-cell__label">False Positive</div>
        </div>
        <div className="cm-cell cm-cell--fn">
          <div className="cm-cell__value">{fn}</div>
          <div className="cm-cell__label">False Negative</div>
        </div>
        <div className="cm-cell cm-cell--tn">
          <div className="cm-cell__value">{tn}</div>
          <div className="cm-cell__label">True Negative</div>
        </div>
      </div>
    </div>
  );
}

export function PerFoodTable({ rows = [] }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="perf-table">
        <thead>
          <tr>
            <th>Commodity</th>
            <th>n (test)</th>
            <th>Ridge MAE</th>
            <th>Baseline MAE</th>
            <th>Brier (logit)</th>
            <th>% large (actual)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.commodity}>
              <td style={{ fontWeight: 500 }}>{r.commodity}</td>
              <td>{r.n}</td>
              <td className={r.mae_ridge < r.mae_baseline ? 'metric--better' : ''}>
                {r.mae_ridge?.toFixed(2)}
              </td>
              <td>{r.mae_baseline?.toFixed(2)}</td>
              <td>{r.brier_logit?.toFixed(3)}</td>
              <td>{r.pct_large_true?.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
