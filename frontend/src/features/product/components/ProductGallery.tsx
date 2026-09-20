'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ProductImage } from '@/types/api';
import { cn } from '@/lib/utils/cn';
import { getMediaUrl } from '@/lib/utils/media';

export interface ProductGalleryProps {
  images?: ProductImage[];
  productName: string;
  className?: string;
}

export function ProductGallery({
  images = [],
  productName,
  className,
}: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const activeImage = images[selectedIndex] || images[0];
  const activeImageUrl = getMediaUrl(activeImage?.image);

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Primary Image Stage */}
      <div className="relative aspect-[4/5] w-full bg-bg-secondary border border-border-subtle rounded-lg overflow-hidden flex items-center justify-center">
        {activeImageUrl ? (
          <Image
            src={activeImageUrl}
            alt={activeImage?.alt_text || productName}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover object-center transition-all duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center text-fg-muted font-mono text-xs">
            <span className="w-16 h-16 rounded-full border border-border-subtle flex items-center justify-center mb-3 font-bold text-sm">
              PX
            </span>
            <span>NO PREVIEW AVAILABLE</span>
          </div>
        )}
      </div>

      {/* Thumbnails Row */}
      {images.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-1">
          {images.map((img, idx) => {
            const thumbUrl = getMediaUrl(img.image);
            return (
              <button
                key={img.id}
                onClick={() => setSelectedIndex(idx)}
                className={cn(
                  'relative w-16 h-16 rounded-md bg-bg-secondary border overflow-hidden shrink-0 transition-all focus-ring cursor-pointer',
                  selectedIndex === idx
                    ? 'border-accent shadow-glow opacity-100'
                    : 'border-border-subtle opacity-60 hover:opacity-100'
                )}
              >
                {thumbUrl ? (
                  <Image
                    src={thumbUrl}
                    alt={img.alt_text || `${productName} thumbnail ${idx + 1}`}
                    fill
                    className="object-cover object-center"
                  />
                ) : (
                  <span className="text-[9px] font-mono text-fg-muted">PX</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
