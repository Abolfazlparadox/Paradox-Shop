'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CartItem } from '@/types/api';
import { Price } from '@/components/ui/Price';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface CartItemRowProps {
  item: CartItem;
  onUpdateQuantity: (itemId: string, newQuantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  isUpdating?: boolean;
  className?: string;
}

export function CartItemRow({
  item,
  onUpdateQuantity,
  onRemoveItem,
  isUpdating,
  className,
}: CartItemRowProps) {
  const isOutOfStock = item.variant ? item.variant.stock <= 0 : false;
  const maxStock = item.variant?.stock || 99;

  return (
    <div
      className={cn(
        'py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle last:border-0 transition-opacity',
        isUpdating && 'opacity-60 pointer-events-none',
        className
      )}
    >
      {/* Product Image & Title */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="relative w-16 h-20 rounded-md bg-bg-secondary border border-border-subtle overflow-hidden shrink-0 flex items-center justify-center font-mono text-[10px] text-fg-muted">
          {item.product?.primary_image ? (
            <Image
              src={item.product.primary_image}
              alt={item.product.name}
              fill
              className="object-cover object-center"
            />
          ) : (
            'PX'
          )}
        </div>

        <div className="min-w-0 space-y-1">
          <h3 className="text-sm font-semibold font-display text-fg-primary truncate">
            <Link
              href={`/products/${item.product?.slug}`}
              className="hover:text-accent transition-colors focus-ring rounded-sm"
            >
              {item.product?.name}
            </Link>
          </h3>

          {item.variant && (
            <div className="flex items-center gap-2 text-xs font-mono text-fg-muted">
              <span>SKU: {item.variant.sku}</span>
              {item.variant.name && (
                <>
                  <span>•</span>
                  <span>{item.variant.name}</span>
                </>
              )}
            </div>
          )}

          <div className="sm:hidden pt-1">
            <Price amount={item.unit_price} size="sm" />
          </div>
        </div>
      </div>

      {/* Quantity Stepper & Price Column */}
      <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-border-subtle/50">
        {/* Quantity Stepper */}
        <div className="inline-flex items-center rounded-md bg-bg-secondary border border-border-subtle">
          <button
            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
            disabled={item.quantity <= 1 || isUpdating}
            className="p-1.5 text-fg-muted hover:text-fg-primary disabled:opacity-30 focus-ring rounded-sm cursor-pointer"
            aria-label="Decrease quantity"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="w-8 text-center font-mono text-xs font-semibold text-fg-primary">
            {item.quantity}
          </span>
          <button
            onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
            disabled={item.quantity >= maxStock || isUpdating}
            className="p-1.5 text-fg-muted hover:text-fg-primary disabled:opacity-30 focus-ring rounded-sm cursor-pointer"
            aria-label="Increase quantity"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Total Price */}
        <div className="text-end min-w-[100px]">
          <Price amount={item.total_price} size="md" />
          {item.quantity > 1 && (
            <span className="text-[10px] font-mono text-fg-muted block">
              @ {item.unit_price}
            </span>
          )}
        </div>

        {/* Delete Button */}
        <button
          onClick={() => onRemoveItem(item.id)}
          disabled={isUpdating}
          className="text-fg-muted hover:text-status-error p-1.5 rounded transition-colors focus-ring cursor-pointer"
          aria-label="Remove item from cart"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
