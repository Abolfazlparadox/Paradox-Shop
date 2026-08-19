'use client';

import React from 'react';
import { ProductListItem } from '@/types/api';
import { ProductCard } from '@/components/ui/ProductCard';
import { CatalogSkeleton } from './CatalogSkeleton';
import { Button } from '@/components/ui/Button';
import { useUIStore } from '@/stores/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '@/lib/api/endpoints';
import { AlertCircle, PackageX, RotateCcw } from 'lucide-react';

export interface CatalogGridProps {
  products?: ProductListItem[];
  isLoading: boolean;
  isError: boolean;
  error?: any;
  onRetry?: () => void;
  onResetFilters?: () => void;
}

export function CatalogGrid({
  products = [],
  isLoading,
  isError,
  error,
  onRetry,
  onResetFilters,
}: CatalogGridProps) {
  const { toggleCartDrawer } = useUIStore();
  const queryClient = useQueryClient();

  const addToCartMutation = useMutation({
    mutationFn: (product: ProductListItem) =>
      cartApi.addItem({ product_id: product.id, quantity: 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toggleCartDrawer();
    },
  });

  if (isLoading) {
    return <CatalogSkeleton count={6} />;
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 p-6 bg-bg-elevated border border-status-error/20 rounded-lg text-center">
        <AlertCircle className="w-10 h-10 text-status-error mb-3" />
        <h3 className="text-base font-semibold font-display text-fg-primary mb-1">
          Failed to Load Catalog
        </h3>
        <p className="text-xs text-fg-secondary max-w-sm mb-6">
          {error?.detail || error?.message || 'A network error occurred while retrieving products.'}
        </p>
        {onRetry && (
          <Button onClick={onRetry} variant="outline" size="sm" leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
            Retry Connection
          </Button>
        )}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 p-6 bg-bg-elevated border border-border-subtle rounded-lg text-center">
        <PackageX className="w-10 h-10 text-fg-muted mb-3" />
        <h3 className="text-base font-semibold font-display text-fg-primary mb-1">
          No Artifacts Found
        </h3>
        <p className="text-xs text-fg-secondary max-w-sm mb-6">
          There are no products matching your current search or filter criteria.
        </p>
        {onResetFilters && (
          <Button onClick={onResetFilters} variant="secondary" size="sm" leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
            Clear All Filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          onAddToCart={(p) => addToCartMutation.mutate(p)}
        />
      ))}
    </div>
  );
}
