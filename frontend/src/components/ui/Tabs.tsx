'use client';

import React from 'react';
import { cn } from '@/lib/utils/cn';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'underline' | 'pills';
  className?: string;
}

export function Tabs({
  tabs,
  activeTab,
  onChange,
  variant = 'underline',
  className,
}: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'flex items-center gap-1',
        variant === 'underline' ? 'border-b border-border-subtle' : 'bg-bg-secondary p-1 rounded-md border border-border-subtle',
        className
      )}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={cn(
              'inline-flex items-center gap-2 text-xs font-medium transition-all duration-150 cursor-pointer focus-ring',
              variant === 'underline'
                ? cn(
                    'px-4 py-2.5 -mb-px border-b-2 font-display',
                    isActive
                      ? 'border-accent text-fg-primary font-semibold'
                      : 'border-transparent text-fg-secondary hover:text-fg-primary'
                  )
                : cn(
                    'px-3 py-1.5 rounded-sm',
                    isActive
                      ? 'bg-bg-elevated text-fg-primary shadow-subtle font-semibold border border-border-subtle'
                      : 'text-fg-secondary hover:text-fg-primary'
                  )
            )}
          >
            {tab.icon && <span className="w-3.5 h-3.5 shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-mono',
                  isActive ? 'bg-accent text-accent-fg' : 'bg-bg-elevated text-fg-muted'
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
