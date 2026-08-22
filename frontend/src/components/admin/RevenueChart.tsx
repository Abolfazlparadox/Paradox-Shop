'use client';

import React, { useState } from 'react';
import { RevenueDataPoint } from '@/types/admin';
import { formatCurrency } from '@/lib/utils/format';

export function RevenueChart({ data }: { data: RevenueDataPoint[] }) {
  const [period, setPeriod] = useState<'30D' | '6M' | '1Y'>('30D');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) return null;

  const maxVal = Math.max(...data.map((d) => Math.max(d.revenue, d.projected))) * 1.15;
  const width = 650;
  const height = 240;
  const paddingX = 40;
  const paddingY = 20;

  // Calculate coordinates
  const points = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * (width - paddingX * 2);
    const yRevenue = height - paddingY - (d.revenue / maxVal) * (height - paddingY * 2);
    const yProjected = height - paddingY - (d.projected / maxVal) * (height - paddingY * 2);
    return { ...d, x, yRevenue, yProjected };
  });

  // Generate SVG Path for Revenue Curve (Smooth Cubic Bezier)
  const revenueLine = points.reduce((acc, curr, i, arr) => {
    if (i === 0) return `M ${curr.x} ${curr.yRevenue}`;
    const prev = arr[i - 1];
    const cp1x = prev.x + (curr.x - prev.x) / 2;
    const cp1y = prev.yRevenue;
    const cp2x = prev.x + (curr.x - prev.x) / 2;
    const cp2y = curr.yRevenue;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.yRevenue}`;
  }, '');

  // Generate Area Fill Path
  const revenueArea = `${revenueLine} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  // Projected Line (Dashed)
  const projectedLine = points.reduce((acc, curr, i, arr) => {
    if (i === 0) return `M ${curr.x} ${curr.yProjected}`;
    const prev = arr[i - 1];
    const cp1x = prev.x + (curr.x - prev.x) / 2;
    const cp1y = prev.yProjected;
    const cp2x = prev.x + (curr.x - prev.x) / 2;
    const cp2y = curr.yProjected;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.yProjected}`;
  }, '');

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl space-y-6 shadow-2xl relative select-none">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold font-display text-white tracking-tight flex items-center gap-2">
            <span>Revenue Trajectory & Forecast</span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              YoY +18.4%
            </span>
          </h3>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Real-time gross transactional volume vs algorithmically projected target
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-950/80 border border-slate-800 rounded-xl self-start sm:self-auto font-mono text-xs">
          {(['30D', '6M', '1Y'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                period === p
                  ? 'bg-cyan-400 text-slate-950 font-bold shadow-[0_0_10px_rgba(0,245,212,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative h-64 w-full flex items-center justify-center">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id="areaGradientCyan" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00F5D4" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#00F5D4" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lineGlow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#05D5B0" />
              <stop offset="100%" stopColor="#00F5D4" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = height - paddingY - pct * (height - paddingY * 2);
            return (
              <g key={idx}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="#1E293B"
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  fill="#64748B"
                  fontSize="9"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {((maxVal * pct) / 1000000).toFixed(0)}M
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={revenueArea} fill="url(#areaGradientCyan)" />

          {/* Forecast Line */}
          <path
            d={projectedLine}
            fill="none"
            stroke="#6366F1"
            strokeWidth="2"
            strokeDasharray="5 5"
            strokeLinecap="round"
          />

          {/* Recorded Revenue Line */}
          <path
            d={revenueLine}
            fill="none"
            stroke="url(#lineGlow)"
            strokeWidth="3"
            strokeLinecap="round"
          />

          {/* Data Points and Hover Zones */}
          {points.map((p, idx) => {
            const isHovered = hoveredIndex === idx;

            return (
              <g key={idx} className="cursor-pointer" onMouseEnter={() => setHoveredIndex(idx)}>
                {/* Invisible hover trigger column */}
                <rect
                  x={p.x - 20}
                  y={0}
                  width={40}
                  height={height}
                  fill="transparent"
                />

                {/* Vertical hover indicator line */}
                {isHovered && (
                  <line
                    x1={p.x}
                    y1={paddingY}
                    x2={p.x}
                    y2={height - paddingY}
                    stroke="#00F5D4"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Projected point */}
                <circle
                  cx={p.x}
                  cy={p.yProjected}
                  r={isHovered ? 4 : 2.5}
                  fill="#6366F1"
                />

                {/* Revenue point */}
                <circle
                  cx={p.x}
                  cy={p.yRevenue}
                  r={isHovered ? 6 : 4}
                  fill="#00F5D4"
                  stroke="#070C18"
                  strokeWidth={2}
                  className="transition-all duration-150"
                />

                {/* X Axis Label */}
                <text
                  x={p.x}
                  y={height - 2}
                  fill={isHovered ? '#00F5D4' : '#64748B'}
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="middle"
                  fontWeight={isHovered ? 'bold' : 'normal'}
                >
                  {p.date}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredPoint && (
          <div
            className="absolute -top-3 pointer-events-none p-3 rounded-xl bg-slate-950/95 border border-cyan-500/40 shadow-[0_0_25px_rgba(0,245,212,0.2)] font-mono text-xs space-y-1 z-20 backdrop-blur-md"
            style={{
              left: `${Math.max(10, Math.min(80, (hoveredPoint.x / width) * 100))}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="text-[10px] uppercase text-slate-400">{hoveredPoint.date}</div>
            <div className="text-cyan-300 font-bold flex items-center justify-between gap-4">
              <span>Actual:</span>
              <span>{formatCurrency(hoveredPoint.revenue)}</span>
            </div>
            <div className="text-indigo-300 flex items-center justify-between gap-4">
              <span>Target:</span>
              <span>{formatCurrency(hoveredPoint.projected)}</span>
            </div>
            <div className="text-[10px] text-slate-400 pt-0.5 border-t border-slate-800">
              {hoveredPoint.orders} Orders Completed
            </div>
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="flex items-center justify-center gap-6 pt-2 border-t border-slate-800/60 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_#00F5D4]" />
          <span className="text-slate-300">Recorded Revenue</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366F1]" />
          <span className="text-slate-400">Algorithmic Forecast</span>
        </div>
      </div>
    </div>
  );
}
