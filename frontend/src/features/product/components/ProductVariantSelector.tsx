'use client';

import React from 'react';
import { ProductVariant } from '@/types/api';
import { cn } from '@/lib/utils/cn';
import { Price } from '@/components/ui/Price';

export interface ProductVariantSelectorProps {
  variants?: ProductVariant[];
  selectedVariant: ProductVariant | null;
  onSelectVariant: (variant: ProductVariant) => void;
  basePrice: string;
  className?: string;
}

export function ProductVariantSelector({
  variants = [],
  selectedVariant,
  onSelectVariant,
  basePrice,
  className,
}: ProductVariantSelectorProps) {
  if (variants.length === 0) return null;

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold font-display text-fg-primary uppercase tracking-wider">
          Configuration / Variant
        </span>
        {selectedVariant && (
          <span className="text-[11px] font-mono text-fg-muted">
            SKU: {selectedVariant.sku}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {variants.map((v) => {
          const isSelected = selectedVariant?.id === v.id;
          const isOutOfStock = v.stock <= 0;
          const price = v.price_override || basePrice;

          return (
            <button
              key={v.id}
              disabled={isOutOfStock || !v.is_active}
              onClick={() => onSelectVariant(v)}
              className={cn(
                'flex flex-col p-3 rounded-md border text-start transition-all cursor-pointer focus-ring relative',
                isSelected
                  ? 'bg-bg-elevated border-accent shadow-card'
                  : 'bg-bg-secondary/60 border-border-subtle hover:border-border-accent',
                isOutOfStock && 'opacity-40 cursor-not-allowed bg-bg-secondary'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-fg-primary font-display">
                  {v.name}
                </span>
                {isOutOfStock ? (
                  <span className="text-[10px] font-mono text-rose-400">Sold Out</span>
                ) : (
                  <span className="text-[10px] font-mono text-fg-muted">
                    {v.stock <= 3 ? `Only ${v.stock} left` : 'In Stock'}
                  </span>
                )}
              </div>

              {/* Attributes & Price snippet */}
              <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-border-subtle/40">
                <div className="text-[10px] text-fg-secondary font-mono">
                  {Object.entries(v.attributes || {}).map(([key, val]) => `${key}: ${val}`).join(' • ')}
                </div>
                <Price amount={price} size="sm" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
