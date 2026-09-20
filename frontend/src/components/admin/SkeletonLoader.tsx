'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'p-5 rounded-xl bg-bg-elevated border border-border-subtle animate-pulse space-y-3',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 bg-bg-secondary rounded" />
        <div className="h-7 w-7 rounded-lg bg-bg-secondary" />
      </div>
      <div className="h-7 w-32 bg-bg-secondary rounded" />
      <div className="h-3 w-20 bg-bg-secondary/60 rounded" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, className }: { rows?: number; className?: string }) {
  return (
    <div
      className={cn(
        'rounded-xl bg-bg-elevated border border-border-subtle p-5 space-y-4 animate-pulse',
        className
      )}
    >
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <div className="h-4 w-36 bg-bg-secondary rounded" />
        <div className="h-8 w-24 bg-bg-secondary rounded" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-border-subtle/40">
            <div className="h-3.5 w-28 bg-bg-secondary rounded" />
            <div className="h-3.5 w-24 bg-bg-secondary/60 rounded" />
            <div className="h-3.5 w-16 bg-bg-secondary/60 rounded" />
            <div className="h-5 w-20 bg-bg-secondary rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonChart({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'p-5 rounded-xl bg-bg-elevated border border-border-subtle animate-pulse space-y-4',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="h-4 w-44 bg-bg-secondary rounded" />
        <div className="flex gap-2">
          <div className="h-7 w-12 bg-bg-secondary rounded" />
          <div className="h-7 w-12 bg-bg-secondary rounded" />
        </div>
      </div>
      <div className="h-64 w-full bg-bg-secondary/30 rounded-lg flex items-end p-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-bg-secondary rounded-t"
            style={{ height: `${20 + (i * 11) % 70}%` }}
          />
        ))}
      </div>
    </div>
  );
}
