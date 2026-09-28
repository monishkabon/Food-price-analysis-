import React, { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  BarChart2,
  Calendar,
  Clock,
  Layers,
  Sparkles,
  TrendingUp,
  Activity,
} from 'lucide-react';
import type { HistoricalPricePoint, VolatilityHistoryPoint } from '../types';

interface HistoricalChartsPanelProps {
  priceHistory: HistoricalPricePoint[];
  volatilityHistory: VolatilityHistoryPoint[];
  commodityName: string;
  marketName: string;
  isLoading?: boolean;
}

export function HistoricalChartsPanel({
  priceHistory,
  volatilityHistory,
  commodityName,
  marketName,
  isLoading = false,
}: HistoricalChartsPanelProps) {
  const [activeTab, setActiveTab] = useState<'price' | 'volatility'>('price');

  // Count how many spikes were detected in this series
  const spikeCount = priceHistory.filter(p => p.is_spike).length;

  // Custom Dot renderer for Tab 1 to pinpoint spikes (>50% MoM)
  const renderCustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload || !payload.is_spike) {
      return null;
    }
    return (
      <g key={`spike-${payload.date}`}>
        <circle cx={cx} cy={cy} r={6} fill="#f43f5e" stroke="#ffffff" strokeWidth={2} />
        <circle cx={cx} cy={cy} r={12} fill="none" stroke="#f43f5e" strokeWidth={1.5} opacity={0.6} />
      </g>
    );
  };

  // Custom Tooltip for Historical Price Series
  const CustomPriceTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data: HistoricalPricePoint = payload[0].payload;
    return (
      <div className="custom-chart-tooltip">
        <div className="tooltip-header">
          <Calendar size={13} />
          <strong>{data.month_label} (2024-2025)</strong>
        </div>
        <div className="tooltip-body">
          <div className="tooltip-row">
            <span className="tooltip-label">Retail Price:</span>
            <strong className="tooltip-value text-blue">Rs. {data.price.toFixed(2)} / kg</strong>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Month-over-Month Change:</span>
            <strong className={`tooltip-value ${data.mom_change_pct >= 0 ? 'text-rose' : 'text-green'}`}>
              {data.mom_change_pct >= 0 ? '+' : ''}
              {data.mom_change_pct.toFixed(1)}%
            </strong>
          </div>
          {data.is_spike && (
            <div className="tooltip-spike-alert">
              <AlertTriangle size={14} />
              <div>
                <strong>HISTORICAL PRICE SPIKE (&gt;50% MoM)</strong>
                <p>{data.spike_label || 'Severe macroeconomic or supply destruction event'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Custom Tooltip for Volatility Series
  const CustomVolatilityTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data: VolatilityHistoryPoint = payload[0].payload;
    const isExceeded10 = data.volatility_3m >= 10;
    const isExceeded25 = data.volatility_3m >= 25;

    return (
      <div className="custom-chart-tooltip">
        <div className="tooltip-header">
          <Clock size={13} />
          <strong>{data.month_label}</strong>
        </div>
        <div className="tooltip-body">
          <div className="tooltip-row">
            <span className="tooltip-label">3M Rolling Volatility:</span>
            <strong
              className={`tooltip-value ${isExceeded25 ? 'text-rose' : isExceeded10 ? 'text-orange' : 'text-green'}`}
            >
              {data.volatility_3m.toFixed(1)}%
            </strong>
          </div>
          <div className="tooltip-row">
            <span className="tooltip-label">Risk Tier:</span>
            <span className="tooltip-tag">{data.risk_level} Volatility</span>
          </div>
          {isExceeded25 ? (
            <div className="tooltip-spike-alert">
              <AlertTriangle size={14} />
              <span>Above Cost-Optimal Cutoff (p* = 0.25). Immediate hedging required.</span>
            </div>
          ) : isExceeded10 ? (
            <div className="tooltip-warning-alert">
              <Activity size={14} />
              <span>Breaches 10% Severe Spike Threshold. Weekly monitoring active.</span>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <article className="historical-charts-panel">
      {/* Panel Header & Tab Switcher */}
      <div className="charts-panel-header">
        <div className="charts-title-area">
          <span className="charts-overline">Empirical Econometric Series</span>
          <h3 className="charts-title">
            Supply Chain Trajectory: <strong>{commodityName}</strong> in <strong>{marketName}</strong>
          </h3>
        </div>

        {/* Tab Controls */}
        <div className="charts-tab-controls" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'price'}
            className={`chart-tab-btn ${activeTab === 'price' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('price')}
          >
            <TrendingUp size={15} />
            <span>Tab 1: Historical Retail Price (LKR/KG)</span>
            {spikeCount > 0 && <span className="tab-pill rose">{spikeCount} Spikes</span>}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'volatility'}
            className={`chart-tab-btn ${activeTab === 'volatility' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('volatility')}
          >
            <Activity size={15} />
            <span>Tab 2: 3-Month Rolling Volatility</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="charts-canvas-container">
        {activeTab === 'price' ? (
          /* TAB 1: Historical Retail Price (LKR/KG) monthly series */
          <div className="chart-view">
            <div className="chart-legend-row">
              <div className="legend-items">
                <span className="legend-dot price-line" />
                <span className="legend-text">Retail Monthly Observed Price (LKR/KG)</span>
                <span className="legend-dot spike-marker" />
                <span className="legend-text">Historical Price Spike Event (&gt;50% MoM Surge)</span>
              </div>
              <div className="chart-range-tag">
                <Calendar size={13} />
                <span>Jan 2024 – Sep 2025 (WFP Historical Series)</span>
              </div>
            </div>

            <div className="recharts-wrapper-responsive" style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={priceHistory} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                  <defs>
                    <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#2a2a4a" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="month_label"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#2a2a4a' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#2a2a4a' }}
                    tickFormatter={v => `Rs.${v}`}
                    domain={['dataMin - 20', 'dataMax + 30']}
                  />
                  <Tooltip content={<CustomPriceTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#38bdf8"
                    strokeWidth={2.8}
                    dot={renderCustomDot}
                    activeDot={{ r: 6, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }}
                    animationDuration={900}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-footer-note">
              <span className="note-lead">Empirical Note:</span> Red markers highlight extreme historical price spikes
              where month-over-month increase exceeded 50%. These shocks coincide with severe monsoon crop failures or
              sudden macroeconomic tariff shifts.
            </div>
          </div>
        ) : (
          /* TAB 2: 3-Month Rolling Volatility chart */
          <div className="chart-view">
            <div className="chart-legend-row">
              <div className="legend-items">
                <span className="legend-dot vol-area" />
                <span className="legend-text">3-Month Rolling Volatility (%)</span>
                <span className="legend-guide guide-10" />
                <span className="legend-text">10% Severe Spike Benchmark</span>
                <span className="legend-guide guide-25" />
                <span className="legend-text">25% Cost-Optimal Alert Cutoff (p*)</span>
              </div>
              <div className="chart-range-tag">
                <Clock size={13} />
                <span>Quarterly Rolling Standard Deviation</span>
              </div>
            </div>

            <div className="recharts-wrapper-responsive" style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={volatilityHistory} margin={{ top: 20, right: 30, left: 10, bottom: 10 }}>
                  <defs>
                    <linearGradient id="volGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fb923c" stopOpacity={0.45} />
                      <stop offset="95%" stopColor="#fb923c" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#2a2a4a" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="month_label"
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#2a2a4a' }}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: '#2a2a4a' }}
                    tickFormatter={v => `${v}%`}
                    domain={[0, 'dataMax + 10']}
                  />
                  <Tooltip content={<CustomVolatilityTooltip />} />
                  <ReferenceLine
                    y={10}
                    stroke="#fb923c"
                    strokeDasharray="4 4"
                    strokeWidth={1.8}
                    label={{
                      value: '10% Severe Spike Threshold',
                      fill: '#fb923c',
                      fontSize: 11,
                      position: 'top',
                    }}
                  />
                  <ReferenceLine
                    y={25}
                    stroke="#f43f5e"
                    strokeDasharray="3 3"
                    strokeWidth={2}
                    label={{
                      value: '25% Optimal Alert Cutoff (p*)',
                      fill: '#f43f5e',
                      fontSize: 11,
                      position: 'top',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="volatility_3m"
                    stroke="#fb923c"
                    strokeWidth={2.6}
                    fillOpacity={1}
                    fill="url(#volGradient)"
                    animationDuration={900}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-footer-note">
              <span className="note-lead">Decision Thresholds:</span> The 10% line marks operational instability.
              Breaching the 25% cost-optimal threshold (p*) mandates immediate wholesale forward contracting to mitigate
              asymmetric stockout penalties.
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
