'use client';

import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { CartItemRow } from '@/features/cart/components/CartItemRow';
import { CartSummary } from '@/features/cart/components/CartSummary';
import { CartGuestAlert } from '@/features/cart/components/CartGuestAlert';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '@/lib/api/endpoints';
import { Cart } from '@/types/api';
import { ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react';

export default function CartPage() {
  const queryClient = useQueryClient();

  const { data: cart, isLoading } = useQuery<Cart>({
    queryKey: ['cart'],
    queryFn: cartApi.getCart,
  });

  const updateMutation = useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      cartApi.updateItem(itemId, { quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: string) => cartApi.removeItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const items = cart?.items || [];
  const isEmpty = items.length === 0;

  return (
    <main className="py-10 sm:py-16 bg-bg-primary min-h-screen">
      <Container size="lg" className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border-subtle">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-fg-muted mb-2">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>BAG REVIEW</span>
            </div>
            <h1 className="text-3xl font-bold font-display text-fg-primary tracking-tight">
              Shopping Cart
            </h1>
          </div>

          <Link href="/products">
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Continue Browsing
            </Button>
          </Link>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-4">
              <div className="h-28 bg-bg-elevated rounded-lg animate-pulse" />
              <div className="h-28 bg-bg-elevated rounded-lg animate-pulse" />
            </div>
            <div className="lg:col-span-4">
              <div className="h-64 bg-bg-elevated rounded-lg animate-pulse" />
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && isEmpty && (
          <div className="py-20 bg-bg-elevated border border-border-subtle rounded-xl p-8 text-center max-w-lg mx-auto space-y-4">
            <div className="w-14 h-14 rounded-full bg-bg-secondary border border-border-subtle flex items-center justify-center text-fg-muted mx-auto">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold font-display text-fg-primary">
                Your Shopping Cart is Empty
              </h2>
              <p className="text-xs text-fg-secondary">
                You haven&apos;t added any engineering artifacts to your cart yet.
              </p>
            </div>
            <Link href="/products" className="inline-block pt-2">
              <Button size="md" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Discover Catalog
              </Button>
            </Link>
          </div>
        )}

        {/* Cart Contents */}
        {!isLoading && !isEmpty && (
          <div className="space-y-6">
            <CartGuestAlert />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Items List */}
              <div className="lg:col-span-8 bg-bg-elevated border border-border-subtle rounded-xl p-6 shadow-card divide-y divide-border-subtle">
                <div className="pb-3 flex items-center justify-between text-xs font-mono text-fg-muted uppercase">
                  <span>Artifact ({items.length})</span>
                  <span className="hidden sm:inline">Quantity & Price</span>
                </div>

                {items.map((item) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    onUpdateQuantity={(itemId, quantity) => {
                      if (quantity <= 0) {
                        removeMutation.mutate(itemId);
                      } else {
                        updateMutation.mutate({ itemId, quantity });
                      }
                    }}
                    onRemoveItem={(itemId) => removeMutation.mutate(itemId)}
                    isUpdating={updateMutation.isPending || removeMutation.isPending}
                  />
                ))}
              </div>

              {/* Summary */}
              <div className="lg:col-span-4">
                <CartSummary
                  subtotal={cart?.subtotal || '0'}
                  totalItems={cart?.total_items || 0}
                  isLoading={updateMutation.isPending || removeMutation.isPending}
                />
              </div>
            </div>
          </div>
        )}
      </Container>
    </main>
  );
}
