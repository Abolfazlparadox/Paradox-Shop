'use client';

import React from 'react';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export interface CatalogPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function CatalogPagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: CatalogPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      role="navigation"
      aria-label="Pagination Navigation"
      className={cn('flex items-center justify-center gap-2 pt-8 border-t border-border-subtle', className)}
    >
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        leftIcon={<ChevronLeft className="w-4 h-4" />}
        aria-label="Go to previous page"
      >
        Previous
      </Button>

      <div className="flex items-center gap-1">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
          const isActive = page === currentPage;
          return (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'w-8 h-8 rounded-md text-xs font-mono font-medium transition-colors focus-ring cursor-pointer',
                isActive
                  ? 'bg-accent text-accent-fg font-bold shadow-subtle'
                  : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary border border-transparent'
              )}
            >
              {page}
            </button>
          );
        })}
      </div>

      <Button
        variant="outline"
        size="sm"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        rightIcon={<ChevronRight className="w-4 h-4" />}
        aria-label="Go to next page"
      >
        Next
      </Button>
    </nav>
  );
}
