'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ProductDetail, ProductVariant } from '@/types/api';
import { ProductGallery } from './ProductGallery';
import { ProductVariantSelector } from './ProductVariantSelector';
import { ProductReviews } from './ProductReviews';
import { ProductComments } from './ProductComments';
import { Price } from '@/components/ui/Price';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { SectionDivider } from '@/components/ui/SectionDivider';
import { useUIStore } from '@/stores/ui';
import { notify } from '@/stores/notifications';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '@/lib/api/endpoints';
import { ShoppingBag, Check, Plus, Minus, ShieldCheck, Truck, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { WishlistButton } from '@/features/wishlist/components/WishlistButton';

export function ProductDetailView({ product }: { product: ProductDetail }) {
  const { toggleCartDrawer } = useUIStore();
  const queryClient = useQueryClient();

  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants?.find((v) => v.stock > 0) || product.variants?.[0] || null
  );
  const [quantity, setQuantity] = useState(1);
  const [addedRecently, setAddedRecently] = useState(false);

  const activeBasePrice = selectedVariant?.price_override || product.base_price;
  const activeDiscountedPrice = selectedVariant ? selectedVariant.discounted_price : product.discounted_price;
  const activePromo = selectedVariant ? selectedVariant.active_promotion : product.active_promotion;
  const currentStock = selectedVariant ? selectedVariant.stock : 10;
  const isOutOfStock = currentStock <= 0;

  const effectivePrice = activeDiscountedPrice || activeBasePrice;
  const originalPrice = activeDiscountedPrice ? activeBasePrice : null;

  const addToCartMutation = useMutation({
    mutationFn: () =>
      cartApi.addItem({
        product_id: product.id,
        variant_id: selectedVariant?.id || null,
        quantity,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      setAddedRecently(true);
      notify.success(
        'Added to Bag',
        `${quantity}x ${product.name}${selectedVariant ? ` (${selectedVariant.sku})` : ''} acquired.`
      );
      setTimeout(() => setAddedRecently(false), 2000);
      toggleCartDrawer();
    },
    onError: (err) => {
      notify.error('Unable to add item to bag', err);
    },
  });

  return (
    <div className="space-y-16">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumbs" className="flex items-center gap-2 text-xs font-mono text-fg-muted">
        <Link href="/" className="hover:text-fg-primary transition-colors">
          Home
        </Link>
        <span>/</span>
        <Link href="/products" className="hover:text-fg-primary transition-colors">
          Catalog
        </Link>
        <span>/</span>
        <Link
          href={`/products?category=${product.category?.slug}`}
          className="hover:text-fg-primary transition-colors"
        >
          {product.category?.name}
        </Link>
        <span>/</span>
        <span className="text-fg-primary truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Main Grid: Gallery & Purchase Column */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        {/* Left: Gallery (7 Cols) */}
        <div className="lg:col-span-7">
          <ProductGallery images={product.images} productName={product.name} />
        </div>

        {/* Right: Product Spec & Purchase Controller (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Header & Badges */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="mono" size="sm">
                {product.category?.name}
              </Badge>
              {product.brand && (
                <span className="text-xs font-semibold text-fg-secondary">
                  {product.brand.name}
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold font-display text-fg-primary tracking-tight leading-tight">
              {product.name}
            </h1>

            {product.short_description && (
              <p className="text-xs sm:text-sm text-fg-secondary leading-relaxed pt-1">
                {product.short_description}
              </p>
            )}
          </div>

          {/* Price Stage with Smooth Spring Transition */}
          <div className="p-4 bg-bg-elevated border border-border-subtle rounded-lg space-y-3 shadow-subtle hover:border-border-accent transition-colors">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-mono uppercase text-fg-muted block">
                  Authoritative Price
                </span>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={String(effectivePrice)}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.18 }}
                  >
                    <Price
                      amount={effectivePrice}
                      originalAmount={originalPrice}
                      discountPercentage={activePromo?.discount_percentage}
                      size="xl"
                    />
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="text-end">
                <span
                  className={`text-xs font-mono font-semibold ${
                    isOutOfStock ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {isOutOfStock ? 'OUT OF STOCK' : 'AVAILABLE IN STOCK'}
                </span>
                {!isOutOfStock && currentStock <= 5 && (
                  <span className="text-[10px] font-mono text-amber-400 block">
                    Only {currentStock} units remaining
                  </span>
                )}
              </div>
            </div>

            {/* Active Promotion Detail Banner */}
            {activePromo && (
              <div className="pt-2.5 border-t border-border-subtle/60 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-semibold">{activePromo.name}</span>
                </div>
                {activePromo.savings > 0 && (
                  <span className="text-fg-secondary text-[11px]">
                    Save <Price amount={activePromo.savings} size="xs" className="text-emerald-400 inline" />
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Variant Selector */}
          {product.variants && product.variants.length > 0 && (
            <ProductVariantSelector
              variants={product.variants}
              selectedVariant={selectedVariant}
              onSelectVariant={(v) => {
                setSelectedVariant(v);
                setQuantity(1);
              }}
              basePrice={product.base_price}
            />
          )}

          {/* Quantity & Add to Cart Controls */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3">
              {/* Quantity Stepper */}
              <div className="h-12 inline-flex items-center rounded-md bg-bg-secondary border border-border-subtle px-2">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1 || isOutOfStock}
                  className="p-1.5 text-fg-muted hover:text-fg-primary disabled:opacity-30 focus-ring rounded-sm cursor-pointer transition-colors"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center font-mono font-semibold text-sm text-fg-primary">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity((q) => Math.min(currentStock, q + 1))}
                  disabled={quantity >= currentStock || isOutOfStock}
                  className="p-1.5 text-fg-muted hover:text-fg-primary disabled:opacity-30 focus-ring rounded-sm cursor-pointer transition-colors"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Add to Cart Button */}
              <Button
                size="lg"
                disabled={isOutOfStock || addToCartMutation.isPending}
                isLoading={addToCartMutation.isPending}
                onClick={() => addToCartMutation.mutate()}
                leftIcon={addedRecently ? <Check className="w-4 h-4 text-emerald-400" /> : <ShoppingBag className="w-4 h-4" />}
                className="flex-1 text-sm font-semibold tracking-wide shadow-card"
              >
                {addedRecently ? 'Added to Bag' : isOutOfStock ? 'Sold Out' : 'Acquire Artifact'}
              </Button>

              {/* Wishlist Action Button */}
              <WishlistButton
                productId={product.id}
                variantId={selectedVariant?.id}
                size="lg"
                variant="outline"
                className="h-12 w-12 shrink-0"
              />
            </div>
          </div>

          {/* Guarantees & Trust Signals */}
          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border-subtle text-center">
            <div className="p-3 bg-bg-secondary/40 rounded-md border border-border-subtle/50 space-y-1">
              <ShieldCheck className="w-4 h-4 text-fg-muted mx-auto" />
              <span className="text-[10px] font-mono text-fg-secondary block">Authentic</span>
            </div>
            <div className="p-3 bg-bg-secondary/40 rounded-md border border-border-subtle/50 space-y-1">
              <Truck className="w-4 h-4 text-fg-muted mx-auto" />
              <span className="text-[10px] font-mono text-fg-secondary block">Courier</span>
            </div>
            <div className="p-3 bg-bg-secondary/40 rounded-md border border-border-subtle/50 space-y-1">
              <RefreshCw className="w-4 h-4 text-fg-muted mx-auto" />
              <span className="text-[10px] font-mono text-fg-secondary block">Precision</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description & Technical Specification Table */}
      <ScrollReveal variant="fade-up">
        <section className="pt-10 border-t border-border-subtle space-y-6">
          <h2 className="text-xl font-bold font-display text-fg-primary">
            Design Narrative & Specifications
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-7 space-y-4">
              <p className="text-sm text-fg-secondary leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>

            <div className="md:col-span-5 bg-bg-elevated border border-border-subtle rounded-lg p-5 shadow-card hover:border-border-accent transition-colors">
              <h3 className="text-xs font-mono uppercase tracking-wider text-fg-primary font-semibold mb-4 pb-2 border-b border-border-subtle">
                Technical Metadata
              </h3>
              <dl className="divide-y divide-border-subtle text-xs font-mono">
                <div className="flex justify-between py-2">
                  <dt className="text-fg-muted">Product Type</dt>
                  <dd className="text-fg-primary uppercase">{product.product_type}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-fg-muted">Category</dt>
                  <dd className="text-fg-primary">{product.category?.name}</dd>
                </div>
                {product.brand && (
                  <div className="flex justify-between py-2">
                    <dt className="text-fg-muted">Brand / Atelier</dt>
                    <dd className="text-fg-primary">{product.brand.name}</dd>
                  </div>
                )}
                {product.attribute_values?.map((attr) => (
                  <div key={attr.attribute_id} className="flex justify-between py-2">
                    <dt className="text-fg-muted">{attr.attribute_name}</dt>
                    <dd className="text-fg-primary">{String(attr.value)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Reviews Section */}
      <ScrollReveal variant="fade-up">
        <ProductReviews productId={product.id} />
      </ScrollReveal>

      {/* Community & Technical Discussions Section */}
      <ScrollReveal variant="fade-up">
        <ProductComments productId={product.id} />
      </ScrollReveal>
    </div>
  );
}
