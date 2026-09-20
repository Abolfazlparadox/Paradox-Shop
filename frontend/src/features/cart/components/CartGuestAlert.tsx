'use client';

import React from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth';
import { UserCheck, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function CartGuestAlert({ className }: { className?: string }) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) return null;

  return (
    <div
      className={cn(
        'p-4 rounded-lg bg-bg-secondary/70 border border-border-accent/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-bg-elevated border border-border-subtle flex items-center justify-center text-fg-primary shrink-0">
          <UserCheck className="w-4 h-4" />
        </div>
        <div>
          <span className="font-semibold font-display text-fg-primary block">
            Shopping as a Guest?
          </span>
          <span className="text-fg-secondary text-[11px]">
            Sign in to automatically sync your cart and access saved delivery addresses.
          </span>
        </div>
      </div>

      <Link
        href="/login?redirect=/cart"
        className="inline-flex items-center gap-1 font-semibold text-accent hover:underline font-mono text-xs shrink-0 self-start sm:self-auto"
      >
        <span>Sign In Now</span>
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
