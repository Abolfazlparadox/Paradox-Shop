import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'rectangular' | 'circular' | 'rounded';
}

export function Skeleton({
  className,
  variant = 'rounded',
  ...props
}: SkeletonProps) {
  const variants = {
    rectangular: 'rounded-none',
    circular: 'rounded-full',
    rounded: 'rounded-md',
  };

  return (
    <div
      className={cn(
        'bg-border-subtle/60 animate-pulse-subtle pointer-events-none',
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
