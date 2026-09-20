import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline' | 'success' | 'warning' | 'error' | 'mono';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  const baseStyles =
    'inline-flex items-center font-medium uppercase tracking-wider rounded-sm select-none transition-colors';

  const variants = {
    default: 'bg-bg-elevated text-fg-primary border border-border-subtle',
    outline: 'bg-transparent text-fg-secondary border border-border-accent',
    success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    error: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    mono: 'bg-accent text-accent-fg font-mono border border-transparent',
  };

  const sizes = {
    sm: 'text-[10px] px-1.5 py-0.5 leading-tight',
    md: 'text-xs px-2.5 py-0.5 leading-normal',
  };

  return (
    <div className={cn(baseStyles, variants[variant], sizes[size], className)} {...props}>
      {children}
    </div>
  );
}
