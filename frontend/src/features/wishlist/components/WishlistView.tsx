'use client';

import React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, ShoppingBag, Trash2, Sparkles, ArrowRight } from 'lucide-react';
import { useWishlist } from '../hooks/use-wishlist';
import { WishlistItemCard } from './WishlistItemCard';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAuthStore } from '@/stores/auth';

export function WishlistView() {
  const { items, totalItemsCount, isLoading, removeItem, clearWishlist, isMutating } = useWishlist();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-border-subtle pb-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border border-border-subtle rounded-lg p-4 space-y-4">
              <Skeleton className="aspect-[4/5] w-full rounded-md" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const isEmpty = items.length === 0;

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs text-accent uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Curated Collection
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-fg-primary">
            Saved Artifacts
            {totalItemsCount > 0 && (
              <span className="ms-3 text-sm font-mono font-normal text-fg-muted">
                ({totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'})
              </span>
            )}
          </h1>
        </div>

        {!isEmpty && (
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={() => clearWishlist()}
              disabled={isMutating}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              className="text-xs font-mono tracking-wider uppercase text-fg-muted hover:text-rose-500 hover:border-rose-500/50"
            >
              Clear All
            </Button>
          </div>
        )}
      </div>

      {/* Guest Notice if unauthenticated */}
      {!isAuthenticated && !isEmpty && (
        <div className="p-4 rounded-lg bg-bg-elevated border border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="text-xs text-fg-secondary">
            <strong className="text-fg-primary">Guest Session:</strong> Your saved items are stored in your browser. Log in or create an account to synchronize your wishlist across all devices.
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-1 text-xs font-mono uppercase tracking-wider text-accent hover:underline font-semibold"
          >
            Sign In to Sync <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Empty State */}
      {isEmpty ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-xl bg-bg-elevated/40 border border-border-subtle border-dashed"
        >
          <div className="w-16 h-16 rounded-full bg-bg-secondary border border-border-subtle flex items-center justify-center mb-5 text-fg-muted">
            <Heart className="w-7 h-7 stroke-[1.5]" />
          </div>
          <h2 className="text-lg font-bold font-display text-fg-primary mb-2">
            Your Wishlist is Empty
          </h2>
          <p className="text-sm text-fg-muted max-w-md mb-6 leading-relaxed">
            Explore our curated catalog of precision-engineered artifacts and save items here for future purchase.
          </p>
          <Link href="/products">
            <Button
              variant="primary"
              leftIcon={<ShoppingBag className="w-4 h-4" />}
              className="font-mono text-xs uppercase tracking-wider"
            >
              Explore Catalog
            </Button>
          </Link>
        </motion.div>
      ) : (
        /* Items Grid */
        <motion.div
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {items.map((item) => (
              <WishlistItemCard key={item.id} item={item} onRemove={removeItem} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
