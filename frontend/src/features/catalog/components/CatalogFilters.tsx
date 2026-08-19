'use client';

import React from 'react';
import { CategoryTreeNode, ProductFilterParams } from '@/types/api';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';
import { RotateCcw, Sparkles } from 'lucide-react';

export interface CatalogFiltersProps {
  categories?: CategoryTreeNode[];
  filters: ProductFilterParams;
  onFilterChange: (newFilters: Partial<ProductFilterParams>) => void;
  onReset: () => void;
  className?: string;
}

export function CatalogFilters({
  categories = [],
  filters,
  onFilterChange,
  onReset,
  className,
}: CatalogFiltersProps) {
  const hasActiveFilters = Boolean(
    filters.category ||
      filters.brand ||
      filters.search ||
      filters.is_featured !== undefined ||
      filters.min_price ||
      filters.max_price
  );

  return (
    <aside className={cn('space-y-6 text-start', className)}>
      {/* Header & Reset */}
      <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
        <span className="text-xs font-mono uppercase tracking-wider font-semibold text-fg-primary">
          Filter Artifacts
        </span>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="text-[11px] font-mono text-fg-muted hover:text-fg-primary flex items-center gap-1 focus-ring rounded-sm transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="space-y-2.5">
        <span className="text-xs font-semibold font-display text-fg-primary block">
          Taxonomy / Categories
        </span>
        <div className="flex flex-col space-y-1">
          <button
            onClick={() => onFilterChange({ category: undefined, page: 1 })}
            className={cn(
              'flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-start cursor-pointer focus-ring',
              !filters.category
                ? 'bg-bg-elevated text-fg-primary font-semibold border border-border-subtle shadow-subtle'
                : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary'
            )}
          >
            <span>All Categories</span>
          </button>

          {categories.map((cat) => {
            const isActive = filters.category === cat.slug;
            return (
              <button
                key={cat.id}
                onClick={() => onFilterChange({ category: cat.slug, page: 1 })}
                className={cn(
                  'flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-start cursor-pointer focus-ring',
                  isActive
                    ? 'bg-bg-elevated text-fg-primary font-semibold border border-border-subtle shadow-subtle'
                    : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary'
                )}
              >
                <span>{cat.name}</span>
                {cat.children && cat.children.length > 0 && (
                  <span className="text-[10px] font-mono text-fg-muted">
                    {cat.children.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Featured Toggle */}
      <div className="pt-4 border-t border-border-subtle space-y-2">
        <span className="text-xs font-semibold font-display text-fg-primary block">
          Curated Highlights
        </span>
        <button
          onClick={() =>
            onFilterChange({
              is_featured: filters.is_featured ? undefined : true,
              page: 1,
            })
          }
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 rounded-md text-xs border transition-colors cursor-pointer focus-ring',
            filters.is_featured
              ? 'bg-accent text-accent-fg border-accent font-semibold'
              : 'bg-bg-elevated text-fg-secondary hover:text-fg-primary border-border-subtle'
          )}
        >
          <span className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            Featured Artifacts Only
          </span>
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              filters.is_featured ? 'bg-emerald-400' : 'bg-border-accent'
            )}
          />
        </button>
      </div>

      {/* Price Range Filter (Rial) */}
      <div className="pt-4 border-t border-border-subtle space-y-3">
        <span className="text-xs font-semibold font-display text-fg-primary block">
          Price Range (Rial)
        </span>
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Min (e.g. 1000000)"
            type="number"
            value={filters.min_price || ''}
            onChange={(e) =>
              onFilterChange({
                min_price: e.target.value ? Number(e.target.value) : undefined,
                page: 1,
              })
            }
            className="text-xs h-8 font-mono"
          />
          <Input
            placeholder="Max"
            type="number"
            value={filters.max_price || ''}
            onChange={(e) =>
              onFilterChange({
                max_price: e.target.value ? Number(e.target.value) : undefined,
                page: 1,
              })
            }
            className="text-xs h-8 font-mono"
          />
        </div>
      </div>
    </aside>
  );
}
