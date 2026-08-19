'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Price } from '@/components/ui/Price';
import { useUIStore } from '@/stores/ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '@/lib/api/endpoints';
import { Cart } from '@/types/api';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Loader2 } from 'lucide-react';

export function CartDrawer() {
  const { isCartDrawerOpen, setCartDrawerOpen } = useUIStore();
  const queryClient = useQueryClient();

  const { data: cart, isLoading } = useQuery<Cart>({
    queryKey: ['cart'],
    queryFn: cartApi.getCart,
    enabled: isCartDrawerOpen,
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
    <Drawer
      isOpen={isCartDrawerOpen}
      onClose={() => setCartDrawerOpen(false)}
      title={`Shopping Cart (${cart?.total_items || 0})`}
      side="right"
    >
      <div className="flex flex-col h-full justify-between">
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-fg-muted">
            <Loader2 className="w-6 h-6 animate-spin mb-3" />
            <span className="text-xs font-mono">Synchronizing cart...</span>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && isEmpty && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-full bg-bg-secondary flex items-center justify-center text-fg-muted mb-4 border border-border-subtle">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold font-display text-fg-primary mb-1">Your cart is empty</h3>
            <p className="text-xs text-fg-secondary max-w-xs mb-6">
              Explore our curated engineering artifacts and add items to your bag.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCartDrawerOpen(false)}
            >
              Continue Browsing
            </Button>
          </div>
        )}

        {/* Items List */}
        {!isLoading && !isEmpty && (
          <div className="flex-1 overflow-y-auto divide-y divide-border-subtle pe-1">
            {items.map((item) => (
              <div key={item.id} className="py-4 flex gap-3 group">
                {/* Product Thumbnail */}
                <div className="relative w-16 h-16 rounded-md bg-bg-secondary border border-border-subtle overflow-hidden shrink-0 flex items-center justify-center font-mono text-[10px] text-fg-muted">
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

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <h4 className="text-xs font-semibold text-fg-primary font-display truncate">
                      {item.product?.name}
                    </h4>
                    {item.variant && (
                      <span className="text-[10px] font-mono text-fg-muted block">
                        SKU: {item.variant.sku}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-2">
                    {/* Quantity Stepper */}
                    <div className="inline-flex items-center rounded-sm bg-bg-secondary border border-border-subtle">
                      <button
                        onClick={() => {
                          if (item.quantity > 1) {
                            updateMutation.mutate({ itemId: item.id, quantity: item.quantity - 1 });
                          } else {
                            removeMutation.mutate(item.id);
                          }
                        }}
                        disabled={updateMutation.isPending || removeMutation.isPending}
                        className="p-1 text-fg-muted hover:text-fg-primary focus-ring rounded-sm"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-xs font-mono font-medium text-fg-primary">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => {
                          updateMutation.mutate({ itemId: item.id, quantity: item.quantity + 1 });
                        }}
                        disabled={updateMutation.isPending}
                        className="p-1 text-fg-muted hover:text-fg-primary focus-ring rounded-sm"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <Price amount={item.total_price} size="sm" />
                  </div>
                </div>

                {/* Remove Button */}
                <button
                  onClick={() => removeMutation.mutate(item.id)}
                  disabled={removeMutation.isPending}
                  className="text-fg-muted hover:text-status-error p-1 rounded transition-colors self-start"
                  aria-label="Remove item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Footer Summary & Checkout CTA */}
        {!isEmpty && (
          <div className="pt-4 border-t border-border-subtle space-y-3 mt-4">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-fg-secondary">Subtotal</span>
              <Price amount={cart?.subtotal || '0'} size="md" />
            </div>

            <p className="text-[10px] text-fg-muted leading-tight">
              Shipping & taxes calculated at checkout.
            </p>

            <div className="flex flex-col gap-2">
              <Link
                href="/checkout"
                onClick={() => setCartDrawerOpen(false)}
                className="w-full"
              >
                <Button size="lg" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Proceed to Checkout
                </Button>
              </Link>

              <Link
                href="/cart"
                onClick={() => setCartDrawerOpen(false)}
                className="w-full"
              >
                <Button variant="outline" size="md" className="w-full text-xs">
                  View Full Cart
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
