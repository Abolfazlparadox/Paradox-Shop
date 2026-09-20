'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Price } from '@/components/ui/Price';
import { productsApi } from '@/lib/api/endpoints';
import { ProductListItem } from '@/types/api';
import { Search, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils/cn';
import { getMediaUrl } from '@/lib/utils/media';

export interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setSelectedIndex(-1);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await productsApi.getList({ search: query, page_size: 5 });
        setResults(response.results || []);
        setSelectedIndex(-1);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Keyboard navigation for search results
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < results.length) {
      e.preventDefault();
      const chosen = results[selectedIndex];
      onClose();
      router.push(`/products/${chosen.slug}`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Search Catalog"
      description="Type product name, SKU, or category. Use ↑/↓ to navigate."
      maxWidth="lg"
    >
      <div className="flex flex-col gap-4">
        {/* Search Input */}
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search engineering artifacts, hardware, lifestyle..."
          leftIcon={<Search className="w-4 h-4 text-fg-muted" />}
          rightIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin text-fg-muted" /> : undefined}
          className="text-base h-11"
        />

        {/* Popular Tags */}
        {!query && (
          <div className="py-2">
            <span className="text-[11px] font-mono uppercase tracking-wider text-fg-muted block mb-2">
              Popular Collections
            </span>
            <div className="flex flex-wrap gap-2">
              {['Minimalist Gear', 'Precision Tools', 'Architectural Artifacts', 'Titanium'].map((tag) => (
                <button
                  key={tag}
                  data-cursor="pointer"
                  onClick={() => setQuery(tag)}
                  className="px-2.5 py-1 text-xs rounded-sm bg-bg-secondary hover:bg-border-subtle text-fg-secondary hover:text-fg-primary border border-border-subtle transition-colors focus-ring cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {results.length > 0 && (
          <div ref={resultsRef} className="flex flex-col divide-y divide-border-subtle max-h-72 overflow-y-auto">
            {results.map((product, idx) => {
              const isSelected = selectedIndex === idx;
              return (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  onClick={onClose}
                  data-cursor="pointer"
                  className={cn(
                    'flex items-center gap-3 py-3 px-2.5 rounded-md transition-all group',
                    isSelected
                      ? 'bg-bg-secondary border border-border-accent shadow-subtle'
                      : 'hover:bg-bg-secondary border border-transparent'
                  )}
                >
                  <div className="relative w-12 h-12 rounded-sm bg-bg-secondary border border-border-subtle overflow-hidden shrink-0 flex items-center justify-center font-mono text-[10px] text-fg-muted">
                    {product.primary_image ? (
                      <Image
                        src={getMediaUrl(product.primary_image)}
                        alt={product.name}
                        fill
                        className="object-cover object-center"
                      />
                    ) : (
                      'PX'
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-mono text-fg-muted uppercase block">
                      {product.category?.name}
                    </span>
                    <h4
                      className={cn(
                        'text-xs font-semibold font-display truncate transition-colors',
                        isSelected ? 'text-accent' : 'text-fg-primary group-hover:text-accent'
                      )}
                    >
                      {product.name}
                    </h4>
                  </div>

                  <Price amount={product.base_price} size="sm" />
                  <ArrowRight
                    className={cn(
                      'w-3.5 h-3.5 transition-transform',
                      isSelected ? 'text-accent translate-x-1' : 'text-fg-muted group-hover:text-fg-primary group-hover:translate-x-0.5'
                    )}
                  />
                </Link>
              );
            })}
          </div>
        )}

        {query && !isLoading && results.length === 0 && (
          <div className="text-center py-8 text-xs text-fg-muted font-mono">
            No artifacts found matching &quot;{query}&quot;
          </div>
        )}
      </div>
    </Modal>
  );
}
