'use client';

import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { AcquisitionChannel } from '@/types/admin';
import { formatCurrency } from '@/lib/utils/format';

export function TrafficDonutChart({ data }: { data: AcquisitionChannel[] }) {
  return (
    <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl space-y-4 shadow-2xl flex flex-col justify-between">
      <div>
        <h3 className="text-base font-bold font-display text-white tracking-tight">
          Acquisition Channels
        </h3>
        <p className="text-xs text-slate-400 font-mono mt-0.5">
          Revenue contribution by patron acquisition source
        </p>
      </div>

      {/* Donut Chart */}
      <div className="h-52 w-full relative flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as AcquisitionChannel;
                  return (
                    <div className="p-2.5 rounded-xl bg-slate-950/95 border border-slate-700 shadow-2xl font-mono text-xs space-y-1">
                      <div className="font-semibold text-white">{item.name}</div>
                      <div className="text-cyan-400">{formatCurrency(item.value)}</div>
                      <div className="text-[10px] text-slate-400">{item.percentage}% Share</div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Pie
              data={data}
              innerRadius={58}
              outerRadius={80}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="#0B1120" strokeWidth={2} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Text */}
        <div className="absolute flex flex-col items-center justify-center pointer-events-none">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Total Inflow
          </span>
          <span className="text-lg font-bold font-display text-white tabular-nums">
            184.5M
          </span>
        </div>
      </div>

      {/* Breakdown Legend */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 font-mono text-xs">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between p-1.5 rounded-lg bg-slate-950/40 border border-slate-800/40">
            <div className="flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-[11px] text-slate-300 truncate">{item.name}</span>
            </div>
            <span className="text-[11px] font-bold text-white shrink-0 ms-1">
              {item.percentage}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
