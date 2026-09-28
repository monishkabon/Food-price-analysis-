// src/components/PredictionCard.jsx
// Displays the next-month price instability prediction
import { useState, useEffect } from 'react';

function ProbabilityBar({ probability }) {
  const [width, setWidth] = useState(0);
  const pct = Math.round(probability * 100);
  const colour = pct >= 60 ? 'hsl(4,80%,62%)' : pct >= 35 ? 'hsl(42,95%,58%)' : 'hsl(147,65%,46%)';
  const label  = pct >= 60 ? 'High risk' : pct >= 35 ? 'Moderate' : 'Low risk';

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 80);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div className="prob-bar-container">
      <div className="prob-bar-header">
        <span>Probability of &gt;10% price swing</span>
        <strong style={{ color: colour }}>{pct}%</strong>
      </div>
      <div className="prob-bar-track">
        <div
          className="prob-bar-fill"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, hsl(147,65%,46%), ${colour})`,
          }}
        />
      </div>
      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
        <span className={`badge badge--${pct >= 60 ? 'red' : pct >= 35 ? 'gold' : 'green'}`}>
          {label}
        </span>
      </div>
      {pct >= 60 && (
        <p className="text-xs text-muted" style={{ marginTop: 8 }}>
          ℹ "High risk" means the model estimates a &gt;60% probability that the absolute price
          change will exceed 10%. This is distinct from the price-change threshold itself.
        </p>
      )}
    </div>
  );
}

export default function PredictionCard({ prediction, warnings = [], isMock = false }) {
  if (!prediction) return null;

  const {
    expected_absolute_change_pct,
    large_change_probability,
    large_change_threshold_pct,
    forecast_month,
    last_observed_month,
    model_version,
    disclaimer,
  } = prediction;

  return (
    <div className="prediction-card animate-fade-in-up">
      {isMock && (
        <div className="badge badge--mock" style={{ marginBottom: 'var(--sp-4)' }}>
          ⚠ MOCK — not a real prediction
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--sp-8)', flexWrap: 'wrap' }}>
        {/* Expected movement */}
        <div style={{ flex: 1, minWidth: 160 }}>
          <div className="card__title">Expected movement</div>
          <div className="prediction-card__headline">
            ±{Number(expected_absolute_change_pct).toFixed(1)}%
          </div>
          <div className="prediction-card__label">
            Forecast month: <strong>{forecast_month}</strong>
          </div>
          <div style={{ marginTop: 'var(--sp-3)', fontSize: 'var(--font-size-xs)', color: 'var(--clr-text-muted)' }}>
            Based on data through {last_observed_month}
          </div>
        </div>

        {/* Probability bar */}
        <div style={{ flex: 2, minWidth: 240 }}>
          <ProbabilityBar probability={large_change_probability} />
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div style={{
          marginTop: 'var(--sp-5)',
          padding: 'var(--sp-3) var(--sp-4)',
          background: 'hsla(42,95%,58%,0.08)',
          border: '1px solid hsla(42,95%,58%,0.25)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-xs)',
          color: 'var(--clr-accent-gold)',
        }}>
          {warnings.map((w, i) => <div key={i}>⚠ {w}</div>)}
        </div>
      )}

      <div className="prediction-card__divider" />

      {/* Disclaimer */}
      <div className="prediction-card__disclaimer">
        <strong>ℹ Important:</strong> {disclaimer}
      </div>

      <div style={{ marginTop: 'var(--sp-3)', fontSize: 'var(--font-size-xs)', color: 'var(--clr-text-muted)' }}>
        Model: {model_version} · Threshold: {large_change_threshold_pct}%
      </div>
    </div>
  );
}
