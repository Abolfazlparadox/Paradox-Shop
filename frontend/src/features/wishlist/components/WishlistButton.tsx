'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useWishlist } from '../hooks/use-wishlist';

interface WishlistButtonProps {
  productId: string;
  variantId?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'outline' | 'ghost' | 'pill';
  showLabel?: boolean;
}

export function WishlistButton({
  productId,
  variantId,
  className,
  size = 'md',
  variant = 'icon',
  showLabel = false,
}: WishlistButtonProps) {
  const { isProductSaved, toggleSave, isMutating } = useWishlist();
  const isSaved = isProductSaved(productId, variantId);
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    await toggleSave(productId, variantId);
  };

  const sizeClasses = {
    sm: 'h-7 w-7 text-xs',
    md: 'h-9 w-9 text-sm',
    lg: 'h-11 w-11 text-base',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const variantClasses = {
    icon: 'bg-bg-glass backdrop-blur-md border border-border-subtle hover:border-accent text-fg-primary rounded-full shadow-sm',
    outline: 'border border-border-subtle hover:border-accent bg-transparent text-fg-primary rounded-md',
    ghost: 'hover:bg-bg-secondary text-fg-primary rounded-md',
    pill: 'px-4 rounded-full border border-border-subtle bg-bg-secondary hover:border-accent text-fg-primary gap-2',
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      disabled={isMutating}
      aria-label={isSaved ? 'Remove from wishlist' : 'Add to wishlist'}
      className={cn(
        'inline-flex items-center justify-center transition-all duration-200 focus-ring cursor-pointer select-none active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed',
        showLabel ? variantClasses.pill : cn(sizeClasses[size], variantClasses[variant]),
        isSaved && 'text-rose-500 border-rose-500/30 bg-rose-500/5',
        className
      )}
    >
      <motion.div
        animate={{
          scale: isSaved ? [1, 1.35, 1] : 1,
        }}
        transition={{ duration: 0.35, ease: [0.175, 0.885, 0.32, 1.275] }}
        className="flex items-center justify-center"
      >
        <Heart
          className={cn(
            iconSizes[size],
            'transition-colors duration-200',
            isSaved
              ? 'fill-rose-500 text-rose-500 stroke-rose-500'
              : isHovered
              ? 'text-accent stroke-accent'
              : 'text-fg-secondary stroke-current'
          )}
        />
      </motion.div>

      {showLabel && (
        <span className="font-mono text-xs uppercase tracking-wider font-medium">
          {isSaved ? 'Saved' : 'Save to Wishlist'}
        </span>
      )}
    </button>
  );
}
