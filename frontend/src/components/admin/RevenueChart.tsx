'use client';

import React, { useState } from 'react';
import { useUIStore } from '@/stores/ui';
import { formatCurrency } from '@/lib/utils/format';

interface DataPoint {
  date: string;
  revenue: number;
  orders: number;
}

interface RevenueChartProps {
  data?: DataPoint[];
}

export function RevenueChart({ data = [] }: RevenueChartProps) {
  const { theme } = useUIStore();
  const isDark = theme === 'dark';
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [period, setPeriod] = useState<'30D' | '6M' | '1Y'>('30D');

  const defaultData: DataPoint[] = [
    { date: 'Oct 01', revenue: 14000000, orders: 12 },
    { date: 'Oct 05', revenue: 21000000, orders: 18 },
    { date: 'Oct 10', revenue: 19000000, orders: 15 },
    { date: 'Oct 15', revenue: 32000000, orders: 26 },
    { date: 'Oct 20', revenue: 45000000, orders: 38 },
    { date: 'Oct 25', revenue: 38000000, orders: 31 },
    { date: 'Oct 30', revenue: 58000000, orders: 49 },
  ];

  const chartData = data.length > 0 ? data : defaultData;
  const maxVal = Math.max(...chartData.map((d) => d.revenue)) * 1.25 || 10000000;

  const width = 640;
  const height = 240;
  const paddingX = 40;
  const paddingY = 30;

  const points = chartData.map((d, i) => {
    const x = paddingX + (i / (chartData.length - 1)) * (width - paddingX * 2);
    const yRevenue = height - paddingY - (d.revenue / maxVal) * (height - paddingY * 2);
    const yProjected = yRevenue + (i % 2 === 0 ? -12 : 8);
    return { ...d, x, yRevenue, yProjected };
  });

  const revenueLine = points.reduce((acc, curr, i) => {
    if (i === 0) return `M ${curr.x} ${curr.yRevenue}`;
    const prev = points[i - 1];
    const cp1x = prev.x + (curr.x - prev.x) / 2;
    const cp1y = prev.yRevenue;
    const cp2x = prev.x + (curr.x - prev.x) / 2;
    const cp2y = curr.yRevenue;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.yRevenue}`;
  }, '');

  const revenueArea = `${revenueLine} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  const projectedLine = points.reduce((acc, curr, i) => {
    if (i === 0) return `M ${curr.x} ${curr.yProjected}`;
    const prev = points[i - 1];
    const cp1x = prev.x + (curr.x - prev.x) / 2;
    const cp1y = prev.yProjected;
    const cp2x = prev.x + (curr.x - prev.x) / 2;
    const cp2y = curr.yProjected;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.yProjected}`;
  }, '');

  const hoveredPoint = hoveredIndex !== null ? points[hoveredIndex] : null;

  return (
    <div className="p-6 rounded-2xl bg-bg-elevated border border-border-subtle backdrop-blur-xl space-y-6 shadow-card relative select-none transition-colors">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-left">
          <h3 className="text-base font-bold font-display text-fg-primary tracking-tight flex items-center gap-2">
            <span>Revenue Trajectory & Forecast</span>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              YoY +18.4%
            </span>
          </h3>
          <p className="text-xs text-fg-secondary font-mono mt-0.5">
            Real-time gross transactional volume vs algorithmically projected target
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1 p-1 bg-bg-secondary border border-border-subtle rounded-xl self-start sm:self-auto font-mono text-xs">
          {(['30D', '6M', '1Y'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                period === p
                  ? 'bg-accent text-accent-fg font-semibold shadow-subtle'
                  : 'text-fg-secondary hover:text-fg-primary'
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
            <linearGradient id="areaGradientGold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={isDark ? 0.3 : 0.2} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.0} />
            </linearGradient>
            <linearGradient id="lineGlowGold" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#f59e0b" />
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
                  stroke={isDark ? '#27272a' : '#e4e4e7'}
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  fill={isDark ? '#71717a' : '#a1a1aa'}
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
          <path d={revenueArea} fill="url(#areaGradientGold)" />

          {/* Forecast Line */}
          <path
            d={projectedLine}
            fill="none"
            stroke={isDark ? '#a1a1aa' : '#71717a'}
            strokeWidth="1.5"
            strokeDasharray="4 4"
            strokeLinecap="round"
          />

          {/* Recorded Revenue Line */}
          <path
            d={revenueLine}
            fill="none"
            stroke="url(#lineGlowGold)"
            strokeWidth="2.5"
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
                    stroke="#f59e0b"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Revenue point */}
                <circle
                  cx={p.x}
                  cy={p.yRevenue}
                  r={isHovered ? 5 : 3.5}
                  fill="#f59e0b"
                  stroke={isDark ? '#141417' : '#ffffff'}
                  strokeWidth={2}
                  className="transition-all duration-150"
                />

                {/* X Axis Label */}
                <text
                  x={p.x}
                  y={height - 2}
                  fill={isHovered ? '#f59e0b' : (isDark ? '#71717a' : '#a1a1aa')}
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
            className="absolute -top-3 pointer-events-none p-3 rounded-xl bg-bg-elevated border border-border-subtle shadow-2xl font-mono text-xs space-y-1 z-20 backdrop-blur-md text-left"
            style={{
              left: `${Math.max(10, Math.min(80, (hoveredPoint.x / width) * 100))}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="text-[10px] uppercase text-fg-muted">{hoveredPoint.date}</div>
            <div className="text-amber-600 dark:text-amber-400 font-bold flex items-center justify-between gap-4">
              <span>Actual:</span>
              <span>{formatCurrency(hoveredPoint.revenue)}</span>
            </div>
            <div className="text-fg-secondary flex items-center justify-between gap-4">
              <span>Target:</span>
              <span>{formatCurrency(hoveredPoint.revenue * 1.15)}</span>
            </div>
            <div className="text-[10px] text-fg-muted pt-0.5 border-t border-border-subtle">
              {hoveredPoint.orders} Orders Completed
            </div>
          </div>
        )}
      </div>

      {/* Legend Footer */}
      <div className="flex items-center justify-center gap-6 pt-2 border-t border-border-subtle/60 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-fg-secondary">Recorded Revenue</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-fg-muted" />
          <span className="text-fg-muted">Algorithmic Forecast</span>
        </div>
      </div>
    </div>
  );
}
