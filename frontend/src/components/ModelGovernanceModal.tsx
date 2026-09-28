import React, { useEffect, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Database,
  ExternalLink,
  GitBranch,
  Info,
  Scale,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import type { ModelGovernanceResponse } from '../types';

interface ModelGovernanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ModelGovernanceResponse;
}

export function ModelGovernanceModal({ isOpen, onClose, data }: ModelGovernanceModalProps) {
  const [activeTab, setActiveTab] = useState<'benchmarks' | 'asymmetric' | 'limitations' | 'assumptions'>('benchmarks');

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const { logistic, continuous_benchmarks, structural_limitations, assumption_violations } = data;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-wrap">
            <div className="modal-pill">
              <ShieldCheck size={14} />
              <span>STATISTICAL AUDIT &amp; GOVERNANCE</span>
            </div>
            <h2 id="modal-title" className="modal-title">
              Econometric Model Diagnostics &amp; Rigor Audit
            </h2>
            <p className="modal-subtitle">
              Evaluated on chronologically held-out test split (April – Sept 2025; N = 783 observations across 5 baskets)
            </p>
          </div>
          <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="modal-tab-nav" role="tablist">
          <button
            type="button"
            className={`modal-tab ${activeTab === 'benchmarks' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('benchmarks')}
          >
            Model Performance Benchmarks
          </button>
          <button
            type="button"
            className={`modal-tab ${activeTab === 'asymmetric' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('asymmetric')}
          >
            Cost-Asymmetric Optimization (p* = 0.25)
          </button>
          <button
            type="button"
            className={`modal-tab ${activeTab === 'limitations' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('limitations')}
          >
            Structural Limitations &amp; Mitigations
          </button>
          <button
            type="button"
            className={`modal-tab ${activeTab === 'assumptions' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('assumptions')}
          >
            Gauss-Markov Diagnostics
          </button>
        </div>

        {/* Modal Content */}
        <div className="modal-body-scroll">
          {activeTab === 'benchmarks' && (
            <div className="tab-pane">
              {/* Primary Logistic Model Benchmarks */}
              <div className="section-block">
                <div className="block-head">
                  <span className="block-tag">PRIMARY RISK ENGINE</span>
                  <h3 className="block-title">Binary Logistic Surge Classifier (Target: Price Jump &gt; 10%)</h3>
                </div>

                <div className="benchmark-cards-grid">
                  <div className="bench-card card-blue">
                    <span className="bench-label">Precision</span>
                    <strong className="bench-val">{logistic.precision}%</strong>
                    <span className="bench-sub">Surge Alert True Positives</span>
                  </div>
                  <div className="bench-card card-orange">
                    <span className="bench-label">Recall</span>
                    <strong className="bench-val">{logistic.recall}%</strong>
                    <span className="bench-sub">Uncalibrated (p = 0.50)</span>
                  </div>
                  <div className="bench-card card-green">
                    <span className="bench-label">Accuracy</span>
                    <strong className="bench-val">{logistic.accuracy}%</strong>
                    <span className="bench-sub">Overall Test Accuracy</span>
                  </div>
                  <div className="bench-card card-rose">
                    <span className="bench-label">Brier Score</span>
                    <strong className="bench-val">{logistic.brier_score}</strong>
                    <span className="bench-sub">Probability Calibration (0=Perfect)</span>
                  </div>
                  <div className="bench-card card-sky">
                    <span className="bench-label">ROC-AUC</span>
                    <strong className="bench-val">{logistic.roc_auc}</strong>
                    <span className="bench-sub">Strong Risk Discrimination</span>
                  </div>
                </div>
              </div>

              {/* Continuous Benchmarks & Resolving the Baseline Anomaly */}
              <div className="section-block">
                <div className="block-head">
                  <span className="block-tag">CONTINUOUS BENCHMARKS &amp; BASELINE ANOMALY</span>
                  <h3 className="block-title">Out-of-Sample Volatility Magnitude (MAE &amp; RMSE Comparison)</h3>
                </div>

                <div className="anomaly-explanation-card">
                  <div className="anomaly-header">
                    <Info size={16} />
                    <strong>Dissecting the "Baseline Anomaly": Why Baseline MAE (7.74%) Beats Ridge MAE (11.45%)</strong>
                  </div>
                  <p>
                    During the test window (April–Sept 2025), Sri Lanka’s food markets stabilized with headline food
                    inflation falling sharply. The naive 3-Month Moving Average adapts immediately to local disinflation,
                    achieving the lowest linear deviation on stable staples (White Rice: 1.62% MAE; Lentils: 1.31% MAE).
                    However, Multiple Linear Regression (MLR) achieves higher explanatory power (R² = 0.413 vs 0.336) and
                    lower RMSE (13.22% vs 14.07%), capturing perishable extreme shocks (Tomatoes: 20.87% vs 22.86%) far
                    better than trailing heuristics.
                  </p>
                </div>

                <div className="benchmarks-table-wrap">
                  <table className="benchmarks-table">
                    <thead>
                      <tr>
                        <th>Model Architecture</th>
                        <th>Objective</th>
                        <th>Test MAE</th>
                        <th>Test RMSE</th>
                        <th>Test R² oos</th>
                        <th>Commercial Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="highlight-row-green">
                        <td>
                          <strong>Rolling 3M Baseline</strong>
                        </td>
                        <td>Naive Trailing Moving Average</td>
                        <td>
                          <span className="badge-tag green">{continuous_benchmarks.baseline_mae}%</span>
                        </td>
                        <td>14.07%</td>
                        <td>0.336</td>
                        <td>Monthly Budgeting on Stable Staples (Rice, Lentils)</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>Multiple Linear Regression</strong>
                        </td>
                        <td>Multi-predictor OLS fit</td>
                        <td>
                          <span className="badge-tag blue">{continuous_benchmarks.mlr_mae}%</span>
                        </td>
                        <td>{continuous_benchmarks.mlr_rmse}%</td>
                        <td>{continuous_benchmarks.mlr_r2_oos}</td>
                        <td>Extreme Shock Fit &amp; Volatility Magnitude</td>
                      </tr>
                      <tr className="highlight-row-rose">
                        <td>
                          <strong>Ridge Regression (L2)</strong>
                        </td>
                        <td>Multicollinearity Shrinkage</td>
                        <td>
                          <span className="badge-tag rose">{continuous_benchmarks.ridge_mae}%</span>
                        </td>
                        <td>14.90%</td>
                        <td>0.255</td>
                        <td>Over-regularized; over-penalizes local price shocks</td>
                      </tr>
                      <tr>
                        <td>
                          <strong>LASSO Regression (L1)</strong>
                        </td>
                        <td>L1 Feature Selection (1-SE Rule)</td>
                        <td>
                          <span className="badge-tag orange">{continuous_benchmarks.lasso_mae}%</span>
                        </td>
                        <td>14.53%</td>
                        <td>0.292</td>
                        <td>
                          Retained sole predictor: <code>mean_absolute_change_3m</code>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'asymmetric' && (
            <div className="tab-pane">
              <div className="section-block">
                <div className="block-head">
                  <span className="block-tag">COMMERCIAL LOSS FUNCTION</span>
                  <h3 className="block-title">
                    The 0.50 Classification Fallacy &amp; Cost-Asymmetric Optimization
                  </h3>
                </div>

                <div className="asymmetric-cost-box">
                  <div className="cost-box-grid">
                    <div className="cost-card cost-fn">
                      <div className="cost-card-top">
                        <AlertOctagon size={18} />
                        <strong>Cost of False Negative (C_FN = 4.0x)</strong>
                      </div>
                      <p>
                        Model predicts stability, but severe spike occurs. Retail chain enters unhedged, suffering stockouts,
                        lost customer market share, and emergency spot purchases at peak invoice rates.
                      </p>
                    </div>

                    <div className="cost-card cost-fp">
                      <div className="cost-card-top">
                        <CheckCircle2 size={18} />
                        <strong>Cost of False Positive (C_FP = 1.0x)</strong>
                      </div>
                      <p>
                        Model raises alert, but price stays stable. Minor temporary carrying cost of central warehouse safety
                        stock or short-term forward commitment.
                      </p>
                    </div>
                  </div>

                  <div className="cost-formula-banner">
                    <code>Total Penalty Cost = 4.0 × (False Negatives) + 1.0 × (False Positives)</code>
                  </div>
                </div>

                <div className="optimization-results-banner">
                  <div className="opt-item">
                    <span className="opt-label">Default Cutoff (p = 0.50):</span>
                    <strong className="opt-val text-rose">Total Penalty: 515.0</strong>
                    <span className="opt-sub">122 missed shocks (52.3% Recall)</span>
                  </div>
                  <div className="opt-arrow">→</div>
                  <div className="opt-item">
                    <span className="opt-label">Cost-Optimal Cutoff (p* = 0.25):</span>
                    <strong className="opt-val text-green">Total Penalty: 358.0</strong>
                    <span className="opt-sub">Only 49 missed shocks (80.9% Recall)</span>
                  </div>
                  <div className="opt-saving">
                    <span className="saving-pct">30.5%</span>
                    <span className="saving-label">Procurement Risk Penalty Reduction</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'limitations' && (
            <div className="tab-pane">
              <div className="section-block">
                <div className="block-head">
                  <span className="block-tag">RISK MANAGEMENT &amp; AUDIT</span>
                  <h3 className="block-title">Econometric Structural Limitations &amp; Production Safeguards</h3>
                </div>

                <div className="limitations-list">
                  {structural_limitations.map((lim, idx) => (
                    <div key={idx} className="limitation-item">
                      <div className="lim-header">
                        <div className="lim-title-wrap">
                          <span className={`lim-severity ${lim.severity.toLowerCase()}`}>{lim.severity}</span>
                          <strong className="lim-title">{lim.title}</strong>
                        </div>
                      </div>
                      <p className="lim-desc">{lim.description}</p>
                      <div className="lim-mitigation">
                        <span className="mitigation-label">Engineered Mitigation:</span>
                        <span className="mitigation-text">{lim.mitigation}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'assumptions' && (
            <div className="tab-pane">
              <div className="section-block">
                <div className="block-head">
                  <span className="block-tag">GAUSS-MARKOV AUDIT</span>
                  <h3 className="block-title">Verification &amp; Critique of Classical Regression Assumptions</h3>
                </div>

                <div className="assumptions-table-wrap">
                  <table className="assumptions-table">
                    <thead>
                      <tr>
                        <th>Classical Assumption</th>
                        <th>Diagnostic Test</th>
                        <th>Observed Statistic</th>
                        <th>Verdict &amp; Operational Impact</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assumption_violations.map((assump, idx) => (
                        <tr key={idx}>
                          <td>
                            <strong>{assump.assumption}</strong>
                          </td>
                          <td>
                            <code>{assump.diagnostic_test}</code>
                          </td>
                          <td>{assump.statistic}</td>
                          <td>
                            <span className="verdict-pill">{assump.verdict}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="audit-signoff-box">
                  <div className="signoff-top">
                    <ShieldCheck size={18} />
                    <strong>Model Governance Retraining Protocol</strong>
                  </div>
                  <p>
                    Re-fit candidate models on the 1st of each calendar month upon release of WFP and Department of Census
                    &amp; Statistics price bulletins. Forward hedging commitments exceeding 50 Million LKR require dual
                    sign-off from the Tier 2 Logistic Alert Engine and the Senior Retail Category Director.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <div className="footer-left">
            <span className="footer-status-dot" />
            <span>Document Ref: CON-2026-IT3081-T5 · Senior Econometrician Approved</span>
          </div>
          <button type="button" className="button secondary" onClick={onClose}>
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
}
