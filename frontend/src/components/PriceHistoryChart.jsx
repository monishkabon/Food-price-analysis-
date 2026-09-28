// src/components/PriceHistoryChart.jsx
// Recharts line chart for historical price data
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine, Legend,
} from 'recharts';

const TOOLTIP_STYLE = {
  background:   'hsl(225, 22%, 14%)',
  border:       '1px solid hsla(220, 20%, 50%, 0.3)',
  borderRadius: 8,
  padding:      '10px 14px',
  fontSize:     13,
  color:        'hsl(220, 15%, 92%)',
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div style={TOOLTIP_STYLE}>
      <div style={{ fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div>Price: <strong>LKR {Number(row.price).toFixed(2)}</strong></div>
      {row.monthly_change_pct != null && (
        <div style={{ marginTop: 4 }}>
          Monthly Δ:{' '}
          <strong style={{ color: row.monthly_change_pct >= 0 ? '#4ade80' : '#f87171' }}>
            {row.monthly_change_pct >= 0 ? '+' : ''}{Number(row.monthly_change_pct).toFixed(2)}%
          </strong>
        </div>
      )}
      {row.spike_flag && (
        <div style={{ marginTop: 4, color: '#fbbf24', fontSize: 12 }}>⚠ Spike flagged</div>
      )}
    </div>
  );
}

export default function PriceHistoryChart({ series = [], dataCutoff }) {
  if (!series.length) return null;

  return (
    <div className="chart-container chart-container--tall">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="hsla(220,20%,50%,0.12)" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fill: 'hsl(220,10%,60%)', fontSize: 11 }}
            interval="preserveStartEnd"
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'hsl(220,10%,60%)', fontSize: 11 }}
            tickFormatter={v => `LKR ${v}`}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          {dataCutoff && (
            <ReferenceLine
              x={dataCutoff}
              stroke="hsl(42,95%,58%)"
              strokeDasharray="4 4"
              label={{ value: 'Data cutoff', fill: 'hsl(42,95%,58%)', fontSize: 11 }}
            />
          )}
          <Line
            type="monotone"
            dataKey="price"
            stroke="hsl(147,65%,46%)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: 'hsl(147,65%,46%)', strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
