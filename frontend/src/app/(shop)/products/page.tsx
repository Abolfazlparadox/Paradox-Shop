'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { CatalogFilters } from '@/features/catalog/components/CatalogFilters';
import { CatalogGrid } from '@/features/catalog/components/CatalogGrid';
import { CatalogPagination } from '@/features/catalog/components/CatalogPagination';
import { CatalogSkeleton } from '@/features/catalog/components/CatalogSkeleton';
import { useProducts } from '@/features/catalog/queries/useProducts';
import { useCategoryTree } from '@/features/catalog/queries/useCategoryTree';
import { ProductFilterParams } from '@/types/api';
import { SlidersHorizontal, Layers } from 'lucide-react';

function CatalogContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Extract query parameters from URL
  const filters: ProductFilterParams = {
    category: searchParams.get('category') || undefined,
    brand: searchParams.get('brand') || undefined,
    search: searchParams.get('search') || undefined,
    is_featured: searchParams.get('is_featured') === 'true' ? true : undefined,
    min_price: searchParams.get('min_price') ? Number(searchParams.get('min_price')) : undefined,
    max_price: searchParams.get('max_price') ? Number(searchParams.get('max_price')) : undefined,
    page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
    page_size: 9,
  };

  // TanStack Query for Products & Category Tree
  const { data, isLoading, isError, error, refetch } = useProducts(filters);
  const { data: categoryTree } = useCategoryTree();

  // Helper to push updated searchParams to URL
  const updateUrlParams = (newParams: Partial<ProductFilterParams>) => {
    const nextFilters = { ...filters, ...newParams };
    const params = new URLSearchParams();

    if (nextFilters.category) params.set('category', nextFilters.category);
    if (nextFilters.brand) params.set('brand', nextFilters.brand);
    if (nextFilters.search) params.set('search', nextFilters.search);
    if (nextFilters.is_featured) params.set('is_featured', 'true');
    if (nextFilters.min_price) params.set('min_price', String(nextFilters.min_price));
    if (nextFilters.max_price) params.set('max_price', String(nextFilters.max_price));
    if (nextFilters.page && nextFilters.page > 1) params.set('page', String(nextFilters.page));

    const queryString = params.toString();
    router.push(queryString ? `/products?${queryString}` : '/products');
  };

  const handleResetFilters = () => {
    router.push('/products');
  };

  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / (filters.page_size || 9));

  return (
    <main className="py-10 sm:py-16 bg-bg-primary min-h-screen">
      <Container size="lg" className="space-y-8">
        {/* Catalog Header */}
        <ScrollReveal variant="fade-up">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-border-subtle">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-fg-muted mb-2">
                <Layers className="w-3.5 h-3.5" />
                <span>CATALOG DISCOVERY</span>
                {filters.category && (
                  <>
                    <span>/</span>
                    <span className="text-fg-primary uppercase font-bold">{filters.category}</span>
                  </>
                )}
              </div>
              <h1 className="text-3xl font-bold font-display text-fg-primary tracking-tight">
                Engineering Artifacts
              </h1>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3">
              <span className="text-xs font-mono text-fg-muted">
                Showing <span className="font-semibold text-fg-primary">{totalCount}</span> artifact(s)
              </span>

              {/* Mobile Filter Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMobileFilterOpen(true)}
                leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
                className="lg:hidden"
              >
                Filters
              </Button>
            </div>
          </div>
        </ScrollReveal>

        {/* Catalog Layout: Sidebar + Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Desktop Persistent Sidebar */}
          <div className="hidden lg:block lg:col-span-3 bg-bg-elevated/50 p-5 rounded-lg border border-border-subtle sticky top-24">
            <CatalogFilters
              categories={categoryTree}
              filters={filters}
              onFilterChange={updateUrlParams}
              onReset={handleResetFilters}
            />
          </div>

          {/* Product Grid & Pagination */}
          <div className="lg:col-span-9 space-y-8">
            <CatalogGrid
              products={data?.results}
              isLoading={isLoading}
              isError={isError}
              error={error}
              onRetry={() => refetch()}
              onResetFilters={handleResetFilters}
            />

            <CatalogPagination
              currentPage={filters.page || 1}
              totalPages={totalPages}
              onPageChange={(page) => updateUrlParams({ page })}
            />
          </div>
        </div>
      </Container>

      {/* Mobile Filter Slide-Over Drawer */}
      <Drawer
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        title="Filter Artifacts"
        side="left"
      >
        <CatalogFilters
          categories={categoryTree}
          filters={filters}
          onFilterChange={(newFilters) => {
            updateUrlParams(newFilters);
            setIsMobileFilterOpen(false);
          }}
          onReset={() => {
            handleResetFilters();
            setIsMobileFilterOpen(false);
          }}
        />
      </Drawer>
    </main>
  );
}

export default function CatalogPage() {
  return (
    <Suspense
      fallback={
        <main className="py-10 sm:py-16 bg-bg-primary min-h-screen">
          <Container size="lg" className="space-y-8">
            <div className="h-20 bg-bg-elevated rounded-lg animate-pulse" />
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="hidden lg:block lg:col-span-3 h-96 bg-bg-elevated rounded-lg animate-pulse" />
              <div className="lg:col-span-9">
                <CatalogSkeleton count={6} />
              </div>
            </div>
          </Container>
        </main>
      }
    >
      <CatalogContent />
    </Suspense>
  );
}
