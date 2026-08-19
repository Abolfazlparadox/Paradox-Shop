'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Price } from '@/components/ui/Price';
import { productsApi } from '@/lib/api/endpoints';
import { ProductListItem } from '@/types/api';
import { Search, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await productsApi.getList({ search: query, page_size: 5 });
        setResults(response.results || []);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Search Catalog"
      description="Type product name, SKU, or category"
      maxWidth="lg"
    >
      <div className="flex flex-col gap-4">
        {/* Search Input */}
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
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
                  onClick={() => setQuery(tag)}
                  className="px-2.5 py-1 text-xs rounded-sm bg-bg-secondary hover:bg-border-subtle text-fg-secondary hover:text-fg-primary border border-border-subtle transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {results.length > 0 && (
          <div className="flex flex-col divide-y divide-border-subtle max-h-72 overflow-y-auto">
            {results.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                onClick={onClose}
                className="flex items-center gap-3 py-3 px-2 rounded-md hover:bg-bg-secondary transition-colors group"
              >
                <div className="relative w-12 h-12 rounded-sm bg-bg-secondary border border-border-subtle overflow-hidden shrink-0 flex items-center justify-center font-mono text-[10px] text-fg-muted">
                  {product.primary_image ? (
                    <Image
                      src={product.primary_image}
                      alt={product.name}
                      fill
                      className="object-cover object-center"
                    />
                  ) : (
                    'PX'
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-mono text-fg-muted uppercase">
                    {product.category?.name}
                  </span>
                  <h4 className="text-xs font-semibold text-fg-primary font-display truncate group-hover:text-accent">
                    {product.name}
                  </h4>
                </div>

                <Price amount={product.base_price} size="sm" />
                <ArrowRight className="w-3.5 h-3.5 text-fg-muted group-hover:text-fg-primary group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
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
