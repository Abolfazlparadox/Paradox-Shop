'use client';

import React, { useState } from 'react';
import { AcquisitionChannel } from '@/types/admin';
import { formatCurrency } from '@/lib/utils/format';
import { useUIStore } from '@/stores/ui';

export function TrafficDonutChart({ data }: { data: AcquisitionChannel[] }) {
  const { theme } = useUIStore();
  const isDark = theme === 'dark';

  const [hoveredChannel, setHoveredChannel] = useState<AcquisitionChannel | null>(null);

  if (!data || data.length === 0) return null;

  // SVG Donut calculation (circumference based)
  const size = 180;
  const radius = 64;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;

  let cumulativePercent = 0;

  return (
    <div className="p-6 rounded-2xl bg-bg-elevated border border-border-subtle backdrop-blur-xl space-y-4 shadow-sm dark:shadow-2xl flex flex-col justify-between select-none transition-colors">
      <div>
        <h3 className="text-base font-bold font-display text-fg-primary tracking-tight">
          Acquisition Channels
        </h3>
        <p className="text-xs text-fg-secondary font-mono mt-0.5">
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
            stroke={isDark ? '#1E293B' : '#E2E8F0'}
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
          <span className="text-[10px] font-mono text-fg-muted uppercase tracking-wider">
            {hoveredChannel ? hoveredChannel.name : 'Gross Inflow'}
          </span>
          <span className="text-base font-bold font-display text-fg-primary tabular-nums">
            {hoveredChannel
              ? formatCurrency(hoveredChannel.value)
              : '184.5M Toman'}
          </span>
          {hoveredChannel && (
            <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 font-bold">
              {hoveredChannel.percentage}% Share
            </span>
          )}
        </div>
      </div>

      {/* Breakdown Legend Grid */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-subtle/60 font-mono text-xs">
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
                  ? 'bg-bg-secondary border-cyan-500/40 shadow-sm'
                  : 'bg-bg-secondary/40 border-border-subtle/40 hover:bg-bg-secondary'
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[11px] text-fg-secondary truncate">{item.name}</span>
              </div>
              <span className="text-[11px] font-bold text-fg-primary shrink-0 ms-1">
                {item.percentage}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
