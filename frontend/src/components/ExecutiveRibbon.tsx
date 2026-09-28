import React from 'react';
import {
  AlertTriangle,
  Activity,
  ShieldCheck,
  TrendingUp,
  FileCheck2,
  Sparkles,
  Layers,
} from 'lucide-react';

interface ExecutiveRibbonProps {
  onOpenDiagnostics: () => void;
  highRiskCount?: number;
  marketVolatility?: string;
  modelPrecision?: string;
  recommendedAction?: string;
}

export function ExecutiveRibbon({
  onOpenDiagnostics,
  highRiskCount = 3,
  marketVolatility = '14.2%',
  modelPrecision = '83.2%',
  recommendedAction = 'Lock Q4 Forward Contracts',
}: ExecutiveRibbonProps) {
  return (
    <header className="executive-ribbon">
      {/* Top Banner with Title, Metadata Badge & Diagnostics CTA */}
      <div className="ribbon-header">
        <div className="ribbon-title-group">
          <div className="system-pill">
            <span className="live-indicator" />
            <span>NATIONAL PROCUREMENT EWDSS</span>
          </div>
          <h1 className="system-title">Sri Lanka Food Price Intelligence & Early Warning System</h1>
          <p className="system-subtitle">
            Executive Decision Support System for Supermarket Retail Chains · Econometric Surge Detection & Forward Contracting Engine
          </p>
        </div>

        <div className="ribbon-actions">
          <div className="metadata-badge" title="Validated on WFP & HDX price series through Sept 2025">
            <span className="badge-dot" />
            <span className="badge-text">Model v1.0.0 · Data Cutoff: Sept 2025 · API Status: Healthy</span>
          </div>
          <button
            type="button"
            className="diagnostics-btn"
            onClick={onOpenDiagnostics}
            aria-label="Open Model Diagnostics Modal"
          >
            <ShieldCheck size={16} />
            <span>Model Diagnostics</span>
          </button>
        </div>
      </div>

      {/* 4 Executive KPI Metric Cards */}
      <div className="executive-kpi-grid">
        {/* Metric 1: High-Risk Alert Count */}
        <div className="kpi-card kpi-rose">
          <div className="kpi-top">
            <span className="kpi-label">High-Risk Alert Count</span>
            <div className="kpi-icon-wrap rose">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="kpi-main">
            <strong className="kpi-value">{highRiskCount} Commodities at Elevated Risk</strong>
            <span className="kpi-badge rose">Severe Spike Risk &gt; 10%</span>
          </div>
          <p className="kpi-subtext">
            Perishables &amp; imported tubers breach the 25% cost-optimal risk threshold.
          </p>
        </div>

        {/* Metric 2: Market Volatility Index */}
        <div className="kpi-card kpi-orange">
          <div className="kpi-top">
            <span className="kpi-label">Market Volatility Index</span>
            <div className="kpi-icon-wrap orange">
              <Activity size={18} />
            </div>
          </div>
          <div className="kpi-main">
            <strong className="kpi-value">{marketVolatility}</strong>
            <span className="kpi-badge orange">Aggregated 3M Rolling Volatility</span>
          </div>
          <p className="kpi-subtext">
            Trailing 90-day price dispersion across Western &amp; Highland wholesale corridors.
          </p>
        </div>

        {/* Metric 3: Model Precision Metric */}
        <div className="kpi-card kpi-blue">
          <div className="kpi-top">
            <span className="kpi-label">Model Precision Metric</span>
            <div className="kpi-icon-wrap blue">
              <TrendingUp size={18} />
            </div>
          </div>
          <div className="kpi-main">
            <strong className="kpi-value">{modelPrecision} Precision</strong>
            <span className="kpi-badge blue">Surge Alerts @ p* = 0.25</span>
          </div>
          <p className="kpi-subtext">
            Calibrated Logistic GLM (ROC-AUC: 0.8391 · Cost-Calibrated Recall: 80.9%).
          </p>
        </div>

        {/* Metric 4: Recommended Strategic Action */}
        <div className="kpi-card kpi-green">
          <div className="kpi-top">
            <span className="kpi-label">Recommended Strategic Action</span>
            <div className="kpi-icon-wrap green">
              <FileCheck2 size={18} />
            </div>
          </div>
          <div className="kpi-main">
            <strong className="kpi-value">{recommendedAction}</strong>
            <span className="kpi-badge green">Supply Chain Directive</span>
          </div>
          <p className="kpi-subtext">
            Bypass spot spikes via direct wholesale forward locks and safety stock drawdown.
          </p>
        </div>
      </div>
    </header>
  );
}
