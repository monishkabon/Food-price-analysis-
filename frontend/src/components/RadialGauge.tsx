import React from 'react';

interface RadialGaugeProps {
  probability: number; // 0 - 100
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
}

export function RadialGauge({
  probability,
  size = 190,
  strokeWidth = 14,
  label = 'Severe Spike Probability',
  sublabel = 'Threshold: >10% Price Change',
}: RadialGaugeProps) {
  // Clamped probability between 0 and 100
  const clamped = Math.max(0, Math.min(100, probability));

  // Determine color based on threshold
  let strokeColor = '#4ade80'; // Emerald Green (<25%)
  let glowColor = 'rgba(74, 222, 128, 0.35)';
  let riskText = 'Low Risk Regime';

  if (clamped >= 50) {
    strokeColor = '#f43f5e'; // Rose Alert (>50%)
    glowColor = 'rgba(244, 63, 94, 0.4)';
    riskText = 'High Risk Alert';
  } else if (clamped >= 25) {
    strokeColor = '#fb923c'; // Vibrant Orange (25% - 50%)
    glowColor = 'rgba(251, 146, 60, 0.4)';
    riskText = 'Moderate Risk';
  }

  const center = size / 2;
  const radius = center - strokeWidth - 6;
  const circumference = 2 * Math.PI * radius;
  // Use a 240 degree gauge arc for instrument feel
  const arcAngle = 240;
  const arcLength = (arcAngle / 360) * circumference;
  const strokeDashoffset = arcLength - (clamped / 100) * arcLength;
  const startAngle = 150; // starts at bottom left

  return (
    <div className="radial-gauge-container" style={{ width: size, height: size + 16 }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="radial-gauge-svg"
        aria-label={`Risk probability gauge: ${clamped}%`}
      >
        <defs>
          <linearGradient id={`gauge-grad-${clamped}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.8" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="1" />
          </linearGradient>
          <filter id="gauge-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={strokeColor} floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Background track arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#252f48"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
          transform={`rotate(${startAngle} ${center} ${center})`}
        />

        {/* 25% cost-optimal threshold marker */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#fb923c"
          strokeWidth={strokeWidth + 2}
          strokeDasharray={`2 ${circumference}`}
          strokeDashoffset={-(0.25 * arcLength)}
          transform={`rotate(${startAngle} ${center} ${center})`}
          opacity="0.8"
        />

        {/* Animated active probability arc */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#gauge-grad-${clamped})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${arcLength} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(${startAngle} ${center} ${center})`}
          filter="url(#gauge-glow)"
          style={{
            transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.3s ease',
          }}
        />
      </svg>

      {/* Centered Value and Readouts */}
      <div className="gauge-center-content">
        <span className="gauge-percentage" style={{ color: strokeColor, textShadow: `0 0 16px ${glowColor}` }}>
          {clamped.toFixed(1)}%
        </span>
        <span className="gauge-risk-pill" style={{ borderColor: strokeColor, color: strokeColor }}>
          {riskText}
        </span>
      </div>

      <div className="gauge-labels">
        <span className="gauge-main-label">{label}</span>
        <span className="gauge-sub-label">{sublabel}</span>
      </div>
    </div>
  );
}
