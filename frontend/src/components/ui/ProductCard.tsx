'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { Price } from './Price';
import { Badge } from './Badge';
import { Button } from './Button';
import { ProductListItem } from '@/types/api';
import { ShoppingBag, Eye } from 'lucide-react';

export interface ProductCardProps {
  product: ProductListItem;
  onAddToCart?: (product: ProductListItem) => void;
  className?: string;
}

export function ProductCard({
  product,
  onAddToCart,
  className,
}: ProductCardProps) {
  const isOutOfStock = product.total_stock !== undefined && product.total_stock <= 0;

  return (
    <article
      data-cursor="view"
      className={cn(
        'group relative flex flex-col bg-bg-elevated border border-border-subtle rounded-lg overflow-hidden transition-all duration-300 ease-out-cubic hover:border-border-accent hover:shadow-card hover:-translate-y-0.5',
        className
      )}
    >
      {/* Product Image Stage */}
      <div className="relative aspect-[4/5] w-full bg-bg-secondary overflow-hidden flex items-center justify-center">
        {product.primary_image ? (
          <Image
            src={product.primary_image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-fg-muted font-mono text-xs">
            <span className="w-12 h-12 rounded-full border border-border-subtle flex items-center justify-center mb-2 font-bold">
              PX
            </span>
            <span>NO PREVIEW</span>
          </div>
        )}

        {/* Floating Badges */}
        <div className="absolute top-3 start-3 flex flex-col gap-1.5 z-10">
          {product.is_featured && (
            <Badge variant="mono" size="sm">
              Featured
            </Badge>
          )}
          {isOutOfStock && (
            <Badge variant="error" size="sm">
              Sold Out
            </Badge>
          )}
        </div>

        {/* Quick Action Overlay on Desktop */}
        <div className="absolute inset-x-3 bottom-3 z-10 flex gap-2 opacity-0 translate-y-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0">
          {onAddToCart && !isOutOfStock && (
            <Button
              size="sm"
              variant="primary"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddToCart(product);
              }}
              leftIcon={<ShoppingBag className="w-3.5 h-3.5" />}
              className="flex-1 text-xs"
            >
              Quick Add
            </Button>
          )}
          <Link
            href={`/products/${product.slug}`}
            className="h-8 px-3 rounded-sm inline-flex items-center justify-center bg-bg-glass text-fg-primary border border-border-accent hover:bg-bg-elevated transition-colors text-xs font-medium backdrop-blur-sm"
          >
            <Eye className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Product Content Details */}
      <div className="flex-1 flex flex-col p-4 justify-between">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-fg-muted">
              {product.category?.name || 'Artifact'}
            </span>
            {product.brand && (
              <span className="text-[11px] text-fg-secondary font-medium">
                {product.brand.name}
              </span>
            )}
          </div>

          <h3 className="text-sm font-semibold text-fg-primary font-display tracking-tight leading-snug line-clamp-2 mb-2 group-hover:text-accent transition-colors">
            <Link href={`/products/${product.slug}`} className="focus-ring rounded-sm">
              {product.name}
            </Link>
          </h3>
        </div>

        <div className="pt-2 border-t border-border-subtle/50 flex items-center justify-between mt-2">
          <Price amount={product.base_price} size="sm" />
          {product.total_stock !== undefined && product.total_stock > 0 && product.total_stock <= 3 && (
            <span className="text-[10px] font-mono text-amber-500 font-medium">
              Only {product.total_stock} left
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
