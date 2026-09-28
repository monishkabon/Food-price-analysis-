// src/pages/Forecast.jsx
import { useState, useEffect } from 'react';
import FoodMarketSelector from '../components/FoodMarketSelector';
import PredictionCard from '../components/PredictionCard';
import { LoadingState, EmptyState, MockBanner } from '../components/StatusBanner';
import { useApi, useManualApi } from '../hooks/useApi';
import { fetchPriceHistory, fetchPrediction, USE_MOCK } from '../services/api';

const MIN_MONTHS = 4;

export default function Forecast() {
  const [selection, setSelection] = useState({ commodityId: null, marketId: null });
  const [prediction, setPrediction] = useState(null);
  const [warnings, setWarnings]   = useState([]);
  const { commodityId, marketId } = selection;
  const hasSelection = commodityId && marketId;

  // Clear prediction when selection changes
  useEffect(() => {
    setPrediction(null);
    setWarnings([]);
  }, [commodityId, marketId]);

  // Check history sufficiency
  const { data: historyData, loading: loadingHistory } = useApi(
    () => fetchPriceHistory(commodityId, marketId),
    [commodityId, marketId],
    { skip: !hasSelection }
  );

  const series         = historyData?.series ?? [];
  const observedMonths = series.filter(r => r.price != null).length;
  const canPredict     = observedMonths >= MIN_MONTHS;

  const { loading: predicting, error: predError, trigger: runPrediction } = useManualApi(
    () => fetchPrediction(commodityId, marketId)
  );

  async function handlePredict() {
    try {
      const result = await runPrediction();
      setPrediction(result);
      // Warnings may come from the API or be inferred locally
      const w = [];
      if (observedMonths < 12) {
        w.push(`Only ${observedMonths} months of observed history — predictions are less reliable with short series.`);
      }
      if (series[series.length - 1]?.spike_flag) {
        w.push('The most recent month was flagged as a potential price spike. Prediction may be less reliable.');
      }
      setWarnings(w);
    } catch (_) {
      // error shown via predError
    }
  }

  return (
    <div className="animate-fade-in">
      {USE_MOCK && <MockBanner />}

      <div className="page-header">
        <h1>Price Forecast</h1>
        <p>Generate a next-month price instability prediction for a selected food–market pair.</p>
      </div>

      <FoodMarketSelector selection={selection} onSelectionChange={setSelection} />

      {!hasSelection && (
        <EmptyState
          icon="🔮"
          title="Select a food item and market"
          description="Choose a commodity and market above to check if prediction is available."
        />
      )}

      {hasSelection && loadingHistory && <LoadingState message="Checking data availability…" />}

      {hasSelection && !loadingHistory && (
        <>
          {/* Context card */}
          <div className="card mb-6" style={{
            background: 'hsla(225, 22%, 14%, 0.7)',
            borderColor: canPredict
              ? 'hsla(147,65%,46%,0.3)'
              : 'hsla(4,80%,62%,0.3)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div className="card__title">Data quality check</div>
                <div style={{ marginTop: 8 }}>
                  <span className={`badge badge--${canPredict ? 'green' : 'red'}`}>
                    {observedMonths} observed months
                  </span>
                  {!canPredict && (
                    <p className="text-sm text-muted" style={{ marginTop: 8 }}>
                      At least {MIN_MONTHS} consecutive observed months are required to compute rolling features.
                      This food–market combination currently has insufficient history for prediction.
                    </p>
                  )}
                </div>
              </div>
              <button
                id="generate-prediction-btn"
                className="btn btn-primary"
                onClick={handlePredict}
                disabled={!canPredict || predicting}
                style={{ alignSelf: 'flex-end', minWidth: 180 }}
              >
                {predicting ? (
                  <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Predicting…</>
                ) : (
                  '⚡ Generate prediction'
                )}
              </button>
            </div>
          </div>

          {predError && (
            <div className="error-state" style={{ marginBottom: 'var(--sp-6)' }}>
              <div className="error-state__icon">⚠️</div>
              <div>
                <div className="error-state__title">Prediction failed</div>
                <div className="error-state__msg">{predError}</div>
              </div>
            </div>
          )}

          {prediction && (
            <PredictionCard
              prediction={prediction}
              warnings={warnings}
              isMock={USE_MOCK}
            />
          )}

          {!prediction && !predicting && canPredict && (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--sp-10)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 'var(--sp-4)', opacity: 0.4 }}>⚡</div>
              <div className="text-secondary">
                Click <strong>Generate prediction</strong> above to run the model.
              </div>
              <div className="text-xs text-muted" style={{ marginTop: 8 }}>
                The Ridge regression model will estimate next-month price movement magnitude.
              </div>
            </div>
          )}

          {/* Methodology note — always visible */}
          <div className="card mt-6" style={{
            background:  'hsla(225, 22%, 11%, 0.5)',
            borderColor: 'hsla(220,20%,40%,0.2)',
          }}>
            <div className="card__title" style={{ marginBottom: 'var(--sp-3)' }}>
              About this prediction
            </div>
            <div className="flex-col gap-4">
              <div>
                <strong className="text-sm">What is being predicted?</strong>
                <p className="text-sm text-muted" style={{ marginTop: 4 }}>
                  The <em>absolute percentage price change</em> for the next calendar month —
                  i.e., how much the price is expected to <em>move</em>, regardless of direction.
                  A prediction of "8%" means the model expects a change of roughly 8% up or down.
                </p>
              </div>
              <div>
                <strong className="text-sm">What is the probability figure?</strong>
                <p className="text-sm text-muted" style={{ marginTop: 4 }}>
                  A separate logistic regression model estimates the probability that the absolute
                  change will exceed <strong>10%</strong> (the instability threshold). A probability
                  of 70% means 7 in 10 similar historical situations resulted in a change larger than
                  10%.
                </p>
              </div>
              <div>
                <strong className="text-sm">Limitations</strong>
                <ul className="text-sm text-muted" style={{ marginTop: 4, paddingLeft: 20 }}>
                  <li>Models are trained on data through December 2024 and tested through September 2025.</li>
                  <li>This is a <strong>historical prototype</strong> — not a live market signal.</li>
                  <li>The prediction does not account for sudden supply shocks or policy changes.</li>
                  <li>Short series ({`<`}12 months) yield less reliable predictions.</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
