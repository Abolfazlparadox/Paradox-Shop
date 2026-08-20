import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface SectionDividerProps {
  label?: string;
  className?: string;
}

export function SectionDivider({ label, className }: SectionDividerProps) {
  return (
    <div className={cn('relative w-full flex items-center justify-center my-8 select-none', className)}>
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-border-subtle/80 bg-gradient-to-r from-transparent via-border-subtle to-transparent" />
      </div>

      {label ? (
        <div className="relative px-3 bg-bg-primary text-[10px] font-mono uppercase tracking-widest text-fg-muted border border-border-subtle/60 rounded-full flex items-center gap-1.5 shadow-subtle">
          <span className="w-1 h-1 rounded-full bg-accent opacity-60" />
          <span>{label}</span>
        </div>
      ) : (
        <div className="relative px-2 bg-bg-primary text-fg-muted font-mono text-[10px]">
          +
        </div>
      )}
    </div>
  );
}
