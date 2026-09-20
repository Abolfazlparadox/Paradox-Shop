'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { WishlistItem } from '@/types/api';
import { Price } from '@/components/ui/Price';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { getMediaUrl } from '@/lib/utils/media';
import { cartApi } from '@/lib/api/endpoints';
import { useQueryClient } from '@tanstack/react-query';
import { notify } from '@/stores/notifications';

interface WishlistItemCardProps {
  item: WishlistItem;
  onRemove: (itemId: string) => Promise<any>;
}

export const WishlistItemCard = React.forwardRef<HTMLDivElement, WishlistItemCardProps>(
  ({ item, onRemove }, ref) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const [isMovingToCart, setIsMovingToCart] = useState(false);
  const queryClient = useQueryClient();

  const product = item.product;
  const variant = item.variant;
  const primaryImage = product.images?.find((img) => img.is_primary) || product.images?.[0];
  const imageUrl = getMediaUrl(primaryImage?.image);
  const displayPrice = variant?.price_override || product.base_price;

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      await onRemove(item.id);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleMoveToCart = async () => {
    setIsMovingToCart(true);
    try {
      await cartApi.addItem({
        product_id: product.id,
        variant_id: variant?.id,
        quantity: 1,
      });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      await onRemove(item.id);
      notify.success(
        'Moved to Cart',
        `${product.name} was added to your shopping cart.`
      );
    } catch (err) {
      notify.error(
        'Failed to Move to Cart',
        'Could not add product to cart.'
      );
    } finally {
      setIsMovingToCart(false);
    }
  };

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className="group relative flex flex-col bg-bg-elevated border border-border-subtle hover:border-border-accent rounded-lg overflow-hidden transition-all duration-300 shadow-sm hover:shadow-card"
    >
      {/* Product Image */}
      <div className="relative aspect-[4/5] w-full bg-bg-secondary overflow-hidden flex items-center justify-center">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center text-fg-muted font-mono text-xs">
            <span className="w-10 h-10 rounded-full border border-border-subtle flex items-center justify-center mb-1 font-bold">
              PX
            </span>
            <span>NO PREVIEW</span>
          </div>
        )}

        {/* Status Badges */}
        <div className="absolute top-3 start-3 flex flex-col gap-1.5 z-10">
          {product.is_featured && (
            <Badge variant="mono" size="sm">
              Featured
            </Badge>
          )}
          {!product.is_active && (
            <Badge variant="error" size="sm">
              Archived
            </Badge>
          )}
        </div>

        {/* Remove Button */}
        <button
          type="button"
          onClick={handleRemove}
          disabled={isRemoving}
          aria-label="Remove from wishlist"
          className="absolute top-3 end-3 z-10 h-8 w-8 rounded-full bg-bg-glass backdrop-blur-md border border-border-subtle text-fg-muted hover:text-rose-500 hover:border-rose-500/50 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Details & Action */}
      <div className="flex-1 flex flex-col p-4 justify-between">
        <div>
          <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-fg-muted mb-1">
            <span>{product.category_name || 'Artifact'}</span>
            {product.brand_name && <span>{product.brand_name}</span>}
          </div>

          <h3 className="text-sm font-semibold text-fg-primary font-display tracking-tight line-clamp-2 mb-1.5 group-hover:text-accent transition-colors">
            <Link href={`/products/${product.slug}`}>{product.name}</Link>
          </h3>

          {variant && (
            <span className="inline-block px-2 py-0.5 rounded bg-bg-secondary text-[11px] font-mono text-fg-secondary mb-2 border border-border-subtle">
              {variant.name}
            </span>
          )}
        </div>

        <div className="pt-3 border-t border-border-subtle/50 mt-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Price amount={displayPrice} size="sm" />
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={handleMoveToCart}
            disabled={isMovingToCart || !product.is_active}
            leftIcon={<ShoppingBag className="w-3.5 h-3.5" />}
            className="w-full text-xs font-mono tracking-wider uppercase"
          >
            {isMovingToCart ? 'Moving...' : 'Move to Cart'}
          </Button>
        </div>
      </div>
    </motion.div>
  );
});

WishlistItemCard.displayName = 'WishlistItemCard';
