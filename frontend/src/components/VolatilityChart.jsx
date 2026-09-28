// src/components/VolatilityChart.jsx
// Recharts area chart for rolling 3-month volatility
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip,
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
      <div>Rolling vol (SD): <strong>{Number(row.rolling_volatility_3m).toFixed(4)}</strong></div>
      {row.mean_absolute_change_3m != null && (
        <div style={{ marginTop: 4 }}>
          Mean |Δ%| (3m): <strong>{Number(row.mean_absolute_change_3m).toFixed(2)}%</strong>
        </div>
      )}
    </div>
  );
}

export default function VolatilityChart({ series = [] }) {
  if (!series.length) return null;

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
          <defs>
            <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="hsl(210,90%,65%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(210,90%,65%)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsla(220,20%,50%,0.12)" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fill: 'hsl(220,10%,60%)', fontSize: 11 }}
            interval="preserveStartEnd"
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'hsl(220,10%,60%)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="rolling_volatility_3m"
            stroke="hsl(210,90%,65%)"
            strokeWidth={2}
            fill="url(#volGrad)"
            dot={false}
            activeDot={{ r: 4, fill: 'hsl(210,90%,65%)', strokeWidth: 0 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
