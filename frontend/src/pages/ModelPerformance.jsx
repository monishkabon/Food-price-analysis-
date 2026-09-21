// src/pages/ModelPerformance.jsx
import { useApi } from '../hooks/useApi';
import { fetchModelPerformance, USE_MOCK } from '../services/api';
import {
  ContinuousPerformanceTable,
  BinaryPerformanceTable,
  ConfusionMatrix,
  PerFoodTable,
} from '../components/PerformanceTable';
import { LoadingState, ErrorState, MockBanner } from '../components/StatusBanner';

export default function ModelPerformance() {
  const { data, loading, error, refetch } = useApi(fetchModelPerformance, []);

  return (
    <div className="animate-fade-in">
      {USE_MOCK && <MockBanner />}

      <div className="page-header">
        <h1>Model Performance</h1>
        <p>
          Held-out test set evaluation for all candidate models.
          {data && ` Test period: ${data.test_period?.start} to ${data.test_period?.end} (n = ${data.n_test}).`}
        </p>
      </div>

      {loading && <LoadingState message="Loading evaluation results…" />}
      {error  && <ErrorState message={error} onRetry={refetch} />}

      {data && (
        <div className="flex-col gap-6">

          {/* Version & period */}
          <div className="card" style={{ padding: 'var(--sp-4) var(--sp-6)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-6)' }}>
              <div>
                <span className="text-xs text-muted">Model version</span>
                <div className="fw-600">{data.model_version}</div>
              </div>
              <div>
                <span className="text-xs text-muted">Training cutoff</span>
                <div className="fw-600">December 2024</div>
              </div>
              <div>
                <span className="text-xs text-muted">Validation period</span>
                <div className="fw-600">Jan–Mar 2025</div>
              </div>
              <div>
                <span className="text-xs text-muted">Test period</span>
                <div className="fw-600">{data.test_period?.start} → {data.test_period?.end}</div>
              </div>
              <div>
                <span className="text-xs text-muted">Large-change threshold</span>
                <div className="fw-600">{data.large_change_threshold_pct}% absolute change</div>
              </div>
            </div>
          </div>

          {/* Continuous models */}
          <div className="card">
            <div className="card__title" style={{ marginBottom: 'var(--sp-4)' }}>
              Continuous Models — Predicting Movement Magnitude
            </div>
            <ContinuousPerformanceTable rows={data.continuous} />
            <p className="text-xs text-muted" style={{ marginTop: 'var(--sp-4)' }}>
              <strong>Target:</strong> |ΔP%| next month. Ridge is the production model; it is selected
              over MLR to handle correlated predictors and constrain negative outputs to 0.
            </p>
          </div>

          {/* Binary model */}
          <div className="grid-2" style={{ alignItems: 'start' }}>
            <div className="card">
              <div className="card__title" style={{ marginBottom: 'var(--sp-4)' }}>
                Logistic Regression — Classification Metrics
              </div>
              <BinaryPerformanceTable metrics={data.binary} />
              <p className="text-xs text-muted" style={{ marginTop: 'var(--sp-4)' }}>
                <strong>Target:</strong> P(|ΔP%| &gt; {data.large_change_threshold_pct}% next month).
                Brier score measures calibration; lower = better.
              </p>
            </div>
            <div className="card">
              <div className="card__title" style={{ marginBottom: 'var(--sp-4)' }}>
                Confusion Matrix (P ≥ {data.binary?.prob_cutoff} = alert)
              </div>
              <ConfusionMatrix metrics={data.binary} />
              <div className="text-xs text-muted" style={{ marginTop: 'var(--sp-4)' }}>
                <div><strong>TP</strong> — Correctly flagged large-change months</div>
                <div><strong>FP</strong> — False alarms</div>
                <div><strong>FN</strong> — Missed large-change months (higher risk)</div>
                <div><strong>TN</strong> — Correctly identified stable months</div>
              </div>
            </div>
          </div>

          {/* Per-commodity */}
          <div className="card">
            <div className="card__title" style={{ marginBottom: 'var(--sp-4)' }}>
              Per-Commodity Breakdown (Test Set)
            </div>
            <PerFoodTable rows={data.per_commodity} />
            <p className="text-xs text-muted" style={{ marginTop: 'var(--sp-4)' }}>
              Ridge MAE in green = better than baseline for that commodity.
              "% large (actual)" is the observed rate of large-change months in the test set.
            </p>
          </div>

          {/* Limitations */}
          <div className="card" style={{
            background:  'hsla(225, 22%, 11%, 0.5)',
            borderColor: 'hsla(220,20%,40%,0.2)',
          }}>
            <div className="card__title" style={{ marginBottom: 'var(--sp-3)' }}>
              Limitations
            </div>
            <ul style={{ paddingLeft: 20 }}>
              {data.limitations?.map((l, i) => (
                <li key={i} className="text-sm text-muted" style={{ marginBottom: 6 }}>{l}</li>
              ))}
            </ul>
            <div style={{
              marginTop: 'var(--sp-5)',
              padding: 'var(--sp-4)',
              background: 'hsla(42,95%,58%,0.06)',
              border: '1px solid hsla(42,95%,58%,0.2)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--clr-accent-gold)',
            }}>
              <strong>Academic note:</strong> Observations within the same food–market series are
              temporally correlated. Performance metrics assume test-set independence, which slightly
              inflates apparent accuracy. Future work should use time-series cross-validation.
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
