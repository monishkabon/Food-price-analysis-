import React from 'react';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Coins,
  Compass,
  FileCheck,
  Layers,
  Lock,
  Percent,
  ShieldAlert,
  ShieldCheck,
  Truck,
  Warehouse,
} from 'lucide-react';
import type { EwdssPredictionResponse } from '../types';
import { RadialGauge } from './RadialGauge';

interface EarlyWarningActionPanelProps {
  prediction: EwdssPredictionResponse;
  isLoading?: boolean;
}

export function EarlyWarningActionPanel({ prediction, isLoading = false }: EarlyWarningActionPanelProps) {
  const {
    commodity_name,
    market_name,
    risk_probability,
    risk_level,
    expected_movement_pct,
    expected_movement_abs,
    current_price,
    predicted_price,
    warning_flags,
    recommendation,
    model_diagnostics,
  } = prediction;

  const isPositiveMovement = expected_movement_pct >= 0;
  const isHighRisk = risk_probability >= 50;
  const isModerateRisk = risk_probability >= 25 && risk_probability < 50;
  const isLowRisk = risk_probability < 25;

  const themeClass = isHighRisk ? 'theme-rose' : isModerateRisk ? 'theme-orange' : 'theme-green';

  return (
    <section className={`central-ewdss-panel ${themeClass} ${isLoading ? 'is-loading' : ''}`}>
      {/* Visual Sub-Header Indicator */}
      <div className="panel-header-strip">
        <div className="strip-left">
          <span className="strip-tag">CORE PREDICTIVE ENGINE</span>
          <h2 className="strip-title">
            Early-Warning &amp; Procurement Decision Support: <strong>{commodity_name}</strong> in{' '}
            <strong>{market_name}</strong>
          </h2>
        </div>
        <div className="strip-right">
          <span className="cutoff-tag">
            Cost-Optimal Threshold: <strong>p* = 0.25 (25%)</strong>
          </span>
          <span className="horizon-tag">Forward Horizon: Next 30 Days</span>
        </div>
      </div>

      <div className="central-grid">
        {/* LEFT COLUMN: Risk Probability & Price Movement Card */}
        <div className="risk-probability-card">
          <div className="card-top-header">
            <div>
              <span className="sub-overline">Probability Assessment</span>
              <h3 className="card-title">Next-Month Severe Spike Risk</h3>
            </div>
            <div className={`risk-badge-pill ${themeClass}`}>
              <span className="pill-dot" />
              <span>{risk_level} Risk Category</span>
            </div>
          </div>

          {/* Radial Gauge Display */}
          <div className="gauge-wrapper">
            <RadialGauge
              probability={risk_probability}
              size={200}
              strokeWidth={15}
              label="Severe Spike Probability"
              sublabel="Target: Movement > 10%"
            />
          </div>

          {/* Expected Price Movement Magnitude */}
          <div className="price-movement-block">
            <div className="movement-hero">
              <div className="movement-left">
                <span className="movement-label">Expected Movement Magnitude</span>
                <div className={`movement-value ${isPositiveMovement ? 'val-up' : 'val-down'}`}>
                  {isPositiveMovement ? <ArrowUpRight size={22} /> : <ArrowDownRight size={22} />}
                  <strong>
                    {isPositiveMovement ? '+' : ''}
                    {expected_movement_pct.toFixed(2)}%
                  </strong>
                  <span className="movement-abs">
                    ({isPositiveMovement ? '+' : ''}Rs. {Math.abs(expected_movement_abs).toFixed(2)} / kg)
                  </span>
                </div>
              </div>
              <div className="price-comparison-cols">
                <div className="col-item">
                  <span className="col-label">Observed Spot</span>
                  <strong className="col-val">Rs. {current_price.toFixed(2)}</strong>
                </div>
                <div className="col-divider">→</div>
                <div className="col-item">
                  <span className="col-label">Forecast Baseline</span>
                  <strong className={`col-val ${isHighRisk ? 'highlight-rose' : ''}`}>
                    Rs. {predicted_price.toFixed(2)}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Automated Warning Flags */}
          <div className="warning-flags-section">
            <span className="flags-label">Automated Econometric Warning Flags:</span>
            <div className="flags-list">
              {warning_flags.map((flag, idx) => {
                const isAlert = flag.toLowerCase().includes('spike') || flag.toLowerCase().includes('shock');
                const isOptimal = flag.toLowerCase().includes('cost-optimal');
                return (
                  <div
                    key={idx}
                    className={`warning-flag-badge ${
                      isAlert ? 'flag-alert' : isOptimal ? 'flag-optimal' : 'flag-neutral'
                    }`}
                  >
                    {isAlert ? (
                      <AlertTriangle size={13} className="flag-icon" />
                    ) : isOptimal ? (
                      <ShieldAlert size={13} className="flag-icon" />
                    ) : (
                      <CheckCircle2 size={13} className="flag-icon" />
                    )}
                    <span>{flag}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Feature Saliency Footer */}
          <div className="model-saliency-footer">
            <span className="saliency-title">LASSO Dominant Predictor:</span>
            <span className="saliency-detail">
              <code>mean_absolute_change_3m</code> (1-SE Sparsity: 85.7% candidate variables eliminated)
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: Prescriptive Decision Engine */}
        <div className="decision-engine-card">
          <div className="card-top-header">
            <div>
              <span className="sub-overline">Prescriptive Decision Engine</span>
              <h3 className="card-title">Commercial Sourcing Directives</h3>
            </div>
            <div className="engine-status-badge">
              <ShieldCheck size={14} />
              <span>Optimized for Asymmetric Cost Matrix (C_FN = 4x)</span>
            </div>
          </div>

          {/* Prescriptive Strategic Action Banner */}
          <div className={`prescriptive-action-banner ${themeClass}`}>
            <div className="action-banner-top">
              <div className="action-tag">
                {isHighRisk && <ShieldAlert size={18} />}
                {isModerateRisk && <AlertTriangle size={18} />}
                {isLowRisk && <CheckCircle2 size={18} />}
                <strong>{recommendation.action}</strong>
              </div>
            </div>
            <p className="action-summary-text">{recommendation.summary}</p>
          </div>

          {/* 4 Executive Strategic Levers Grid */}
          <div className="strategic-levers-grid">
            {/* Lever 1: Forward Contracting */}
            <div className="lever-card">
              <div className="lever-header">
                <Lock size={16} className="lever-icon" />
                <span className="lever-title">Hedging Policy</span>
              </div>
              <strong className="lever-value">{recommendation.forward_contract_months}</strong>
              <p className="lever-desc">Recommended contractual forward duration with primary trade desks.</p>
            </div>

            {/* Lever 2: Buffer Inventory */}
            <div className="lever-card">
              <div className="lever-header">
                <Warehouse size={16} className="lever-icon" />
                <span className="lever-title">Warehouse Safety Stock</span>
              </div>
              <strong className="lever-value">{recommendation.buffer_stock_days} Days Holding</strong>
              <p className="lever-desc">Central distribution hub inventory target at Peliyagoda.</p>
            </div>

            {/* Lever 3: Cash Buffer / Working Capital */}
            <div className="lever-card">
              <div className="lever-header">
                <Coins size={16} className="lever-icon" />
                <span className="lever-title">Working Capital Buffer</span>
              </div>
              <strong className="lever-value">+{recommendation.cash_buffer_pct}% Cash Reserve</strong>
              <p className="lever-desc">Dedicated liquidity allocated to absorb wholesale invoice surges.</p>
            </div>

            {/* Lever 4: Hedging Ratio */}
            <div className="lever-card">
              <div className="lever-header">
                <Percent size={16} className="lever-icon" />
                <span className="lever-title">Hedging Allocation</span>
              </div>
              <strong className="lever-value">{recommendation.hedging_ratio}</strong>
              <p className="lever-desc">Target split between contracted volume and spot replenishment.</p>
            </div>
          </div>

          {/* Sourcing Corridor Tactical Arbitrage */}
          <div className="tactical-sourcing-box">
            <div className="sourcing-box-title">
              <Truck size={16} />
              <span>Sourcing Corridor Arbitrage Directive:</span>
            </div>
            <p className="sourcing-box-content">{recommendation.sourcing_advice}</p>
          </div>

          {/* Operational Action Checklist */}
          <div className="action-checklist">
            <span className="checklist-heading">Executive Action Protocol:</span>
            <ul className="checklist-items">
              {recommendation.details.map((detail, idx) => (
                <li key={idx} className="checklist-item">
                  <CheckCircle2 size={15} className="item-icon" />
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
