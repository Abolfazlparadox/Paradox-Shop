'use client';

import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { RevenueDataPoint } from '@/types/admin';
import { formatCurrency } from '@/lib/utils/format';

export function RevenueChart({ data }: { data: RevenueDataPoint[] }) {
  const [period, setPeriod] = useState<'30D' | '6M' | '1Y'>('30D');

  return (
    <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl space-y-6 shadow-2xl">
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
              className={`px-3 py-1 rounded-lg transition-all ${
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

      {/* Recharts Area Chart */}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00F5D4" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#00F5D4" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="indigoGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="#64748B"
              fontSize={11}
              fontFamily="monospace"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#64748B"
              fontSize={11}
              fontFamily="monospace"
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
            />

            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="p-3 rounded-xl bg-slate-950/95 border border-slate-700 shadow-2xl backdrop-blur-md space-y-1.5 font-mono text-xs">
                      <div className="text-slate-400 text-[10px] uppercase">{label}</div>
                      <div className="text-cyan-400 font-bold flex items-center justify-between gap-4">
                        <span>Actual:</span>
                        <span>{formatCurrency(payload[0].value as number)}</span>
                      </div>
                      {payload[1] && (
                        <div className="text-indigo-400 flex items-center justify-between gap-4">
                          <span>Target:</span>
                          <span>{formatCurrency(payload[1].value as number)}</span>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />

            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#00F5D4"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#cyanGradient)"
            />
            <Area
              type="monotone"
              dataKey="projected"
              stroke="#6366F1"
              strokeWidth={2}
              strokeDasharray="4 4"
              fillOpacity={1}
              fill="url(#indigoGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
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
