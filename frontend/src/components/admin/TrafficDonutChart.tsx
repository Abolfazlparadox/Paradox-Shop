'use client';

import React, { useState } from 'react';
import { AcquisitionChannel } from '@/types/admin';
import { formatCurrency } from '@/lib/utils/format';

export function TrafficDonutChart({ data }: { data: AcquisitionChannel[] }) {
  const [hoveredChannel, setHoveredChannel] = useState<AcquisitionChannel | null>(null);

  if (!data || data.length === 0) return null;

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  // SVG Donut calculation (circumference based)
  const size = 180;
  const radius = 64;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;

  return (
    <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl space-y-4 shadow-2xl flex flex-col justify-between select-none">
      <div>
        <h3 className="text-base font-bold font-display text-white tracking-tight">
          Acquisition Channels
        </h3>
        <p className="text-xs text-slate-400 font-mono mt-0.5">
          Revenue contribution by patron acquisition source
        </p>
      </div>

      {/* SVG Donut */}
      <div className="relative h-48 w-full flex items-center justify-center">
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="w-44 h-44 transform -rotate-90"
        >
          {/* Base background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#1E293B"
            strokeWidth={strokeWidth}
          />

          {/* Slices */}
          {data.map((item) => {
            const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -((cumulativePercent / 100) * circumference);
            cumulativePercent += item.percentage;
            const isHovered = hoveredChannel?.name === item.name;

            return (
              <circle
                key={item.name}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={item.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setHoveredChannel(item)}
                onMouseLeave={() => setHoveredChannel(null)}
              />
            );
          })}
        </svg>

        {/* Center Informational Display */}
        <div className="absolute flex flex-col items-center justify-center pointer-events-none text-center">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            {hoveredChannel ? hoveredChannel.name : 'Gross Inflow'}
          </span>
          <span className="text-base font-bold font-display text-white tabular-nums">
            {hoveredChannel
              ? formatCurrency(hoveredChannel.value)
              : '184.5M Toman'}
          </span>
          {hoveredChannel && (
            <span className="text-[10px] font-mono text-cyan-400 font-bold">
              {hoveredChannel.percentage}% Share
            </span>
          )}
        </div>
      </div>

      {/* Breakdown Legend Grid */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/60 font-mono text-xs">
        {data.map((item) => {
          const isHovered = hoveredChannel?.name === item.name;

          return (
            <button
              key={item.name}
              type="button"
              onMouseEnter={() => setHoveredChannel(item)}
              onMouseLeave={() => setHoveredChannel(null)}
              className={`flex items-center justify-between p-1.5 rounded-lg border transition-all text-left cursor-pointer ${
                isHovered
                  ? 'bg-slate-800 border-cyan-500/40 shadow-sm'
                  : 'bg-slate-950/40 border-slate-800/40 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[11px] text-slate-300 truncate">{item.name}</span>
              </div>
              <span className="text-[11px] font-bold text-white shrink-0 ms-1">
                {item.percentage}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
