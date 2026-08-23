'use client';

import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface StatCardProps {
  title: string;
  value: string | number;
  change: number;
  changeLabel?: string;
  icon: React.ReactNode;
  sparklineData?: number[];
  color?: 'cyan' | 'indigo' | 'emerald' | 'amber';
}

export function StatCard({
  title,
  value,
  change,
  changeLabel = 'vs last month',
  icon,
  sparklineData = [10, 25, 18, 30, 45, 38, 55, 70],
  color = 'cyan',
}: StatCardProps) {
  const isPositive = change >= 0;

  const colorStyles = {
    cyan: 'border-cyan-500/20 shadow-[0_0_20px_rgba(0,245,212,0.08)] text-cyan-600 dark:text-cyan-400',
    indigo: 'border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.08)] text-indigo-600 dark:text-indigo-400',
    emerald: 'border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.08)] text-emerald-600 dark:text-emerald-400',
    amber: 'border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.08)] text-amber-600 dark:text-amber-400',
  };

  // Generate simple SVG sparkline polyline
  const min = Math.min(...sparklineData);
  const max = Math.max(...sparklineData);
  const points = sparklineData
    .map((val, i) => {
      const x = (i / (sparklineData.length - 1)) * 100;
      const y = 32 - ((val - min) / (max - min || 1)) * 24;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div
      className={cn(
        'p-5 rounded-2xl bg-bg-elevated border border-border-subtle backdrop-blur-xl transition-all duration-300 hover:border-border-accent hover:scale-[1.01] space-y-3 relative overflow-hidden shadow-sm dark:shadow-2xl',
        colorStyles[color]
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono uppercase tracking-wider text-fg-secondary font-medium">
          {title}
        </span>
        <div className="p-2 rounded-xl bg-bg-secondary border border-border-subtle">
          {icon}
        </div>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-2xl font-bold font-display text-fg-primary tracking-tight tabular-nums">
          {value}
        </h3>

        {/* Sparkline Graphic */}
        <div className="w-20 h-8 opacity-75">
          <svg viewBox="0 0 100 32" className="w-full h-full overflow-visible">
            <polyline
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          </svg>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-border-subtle/60 text-[11px] font-mono">
        <span
          className={cn(
            'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-bold',
            isPositive
              ? 'bg-status-success/10 text-status-success border border-status-success/20'
              : 'bg-status-error/10 text-status-error border border-status-error/20'
          )}
        >
          {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {Math.abs(change)}%
        </span>
        <span className="text-fg-muted">{changeLabel}</span>
      </div>
    </div>
  );
}
