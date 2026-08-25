'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  useAdminCategories,
  useAdminProducts,
  useCreateProduct,
  useDeleteProduct,
  useUpdateProduct,
} from '@/hooks/useAdminData';
import { AdminProduct } from '@/types/api';
import { ProductFormModal } from '@/components/admin/ProductFormModal';
import { SkeletonTable } from '@/components/admin/SkeletonLoader';
import { formatCurrency } from '@/lib/utils/format';
import { notify } from '@/stores/notifications';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

function AdminProductsContent() {
  const searchParams = useSearchParams();
  const initialAction = searchParams.get('action');

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(initialAction === 'new');

  const {
    data: products = [],
    isLoading,
  } = useAdminProducts({
    category: categoryFilter,
    stock: stockFilter,
    search: searchQuery,
  });

  const { data: categories = [] } = useAdminCategories();
  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();

  const handleSaveProduct = async (data: any) => {
    if (editingProduct?.id) {
      await updateProductMutation.mutateAsync({ id: editingProduct.id, data });
    } else {
      await createProductMutation.mutateAsync(data);
    }
  };

  const handleDeleteProduct = async (productId: string, name: string) => {
    if (confirm(`Confirm permanent deletion of artifact "${name}"? This removes the SKU from catalog.`)) {
      try {
        await deleteProductMutation.mutateAsync(productId);
        notify.success('Catalog Updated', `Product ${name} was deleted.`);
      } catch {
        notify.error('Deletion Failed', 'Unable to delete product.');
      }
    }
  };

  const handleInlinePriceChange = async (productId: string, newPrice: number) => {
    try {
      await updateProductMutation.mutateAsync({ id: productId, data: { base_price: newPrice } });
      notify.success('Price Updated', 'Live storefront price adjusted.');
    } catch {
      notify.error('Update Failed', 'Failed to update price.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-fg-primary tracking-tight flex items-center gap-2.5">
            <Package className="w-6 h-6 text-cyan-500 dark:text-cyan-400" />
            <span>Artifacts & Catalog Engine</span>
          </h1>
          <p className="text-xs text-fg-secondary font-mono mt-0.5">
            Manage luxury inventory, SKU matrices, pricing rules, and media assets
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditingProduct(null);
            setIsFormOpen(true);
          }}
          className="text-xs font-mono bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-400 dark:hover:bg-cyan-500 text-white dark:text-slate-950 font-bold shadow-md cursor-pointer"
          leftIcon={<Plus className="w-3.5 h-3.5" />}
        >
          Create New Artifact
        </Button>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="p-4 rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-fg-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search title, slug, SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary placeholder:text-fg-muted focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Categories Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto p-1 bg-bg-secondary rounded-xl border border-border-subtle text-xs font-mono">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={cn(
              'px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap',
              categoryFilter === 'ALL'
                ? 'bg-cyan-500 text-white dark:text-slate-950 shadow-sm'
                : 'text-fg-secondary hover:text-fg-primary'
            )}
          >
            All Artifacts
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.slug || cat.name)}
              className={cn(
                'px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap',
                categoryFilter === (cat.slug || cat.name)
                  ? 'bg-cyan-500 text-white dark:text-slate-950 shadow-sm'
                  : 'text-fg-secondary hover:text-fg-primary'
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Stock Filter */}
        <div className="flex items-center gap-1 p-1 bg-bg-secondary rounded-xl border border-border-subtle text-xs font-mono">
          {[
            { id: 'ALL', label: 'All Stock' },
            { id: 'LOW', label: 'Low Stock' },
            { id: 'OUT', label: 'Out of Stock' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStockFilter(st.id)}
              className={cn(
                'px-2.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer text-[11px]',
                stockFilter === st.id
                  ? 'bg-bg-elevated text-cyan-600 dark:text-cyan-400 shadow-sm border border-border-subtle'
                  : 'text-fg-muted hover:text-fg-primary'
              )}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Catalog Table */}
      <div className="rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm overflow-hidden transition-colors">
        {isLoading ? (
          <div className="p-6">
            <SkeletonTable rows={5} />
          </div>
        ) : products.length === 0 ? (
          <div className="py-16 text-center text-xs text-fg-muted font-mono space-y-2">
            <Package className="w-8 h-8 mx-auto opacity-50 text-cyan-500" />
            <p>No products matched the active filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-secondary/60 text-fg-muted uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Artifact</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Base Price (Rial)</th>
                  <th className="py-3.5 px-4 text-center">Reserve Stock</th>
                  <th className="py-3.5 px-4 text-center">Variants</th>
                  <th className="py-3.5 px-4 text-end">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/60 text-fg-secondary">
                {products.map((p) => {
                  const stockNum = p.stock || (p.variants?.reduce((sum, v) => sum + v.stock, 0) ?? 0);
                  const isLow = stockNum > 0 && stockNum <= 10;
                  const isOut = stockNum === 0;

                  return (
                    <tr key={p.id} className="hover:bg-bg-secondary/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-fg-primary text-xs">{p.name}</div>
                        <div className="text-[10px] text-fg-muted flex items-center gap-2 mt-0.5">
                          <span>/{p.slug}</span>
                          {p.brand && <span>• {p.brand.name}</span>}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-bg-secondary border border-border-subtle text-[10px] font-bold">
                          {p.category?.name || 'Uncategorized'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            defaultValue={Number(p.base_price)}
                            onBlur={(e) => {
                              const val = Number(e.target.value);
                              if (val !== Number(p.base_price) && val > 0) {
                                handleInlinePriceChange(p.id, val);
                              }
                            }}
                            className="w-28 px-2 py-1 rounded bg-bg-secondary border border-border-subtle text-xs font-bold text-cyan-600 dark:text-cyan-300 font-mono"
                          />
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold">
                          {isOut ? (
                            <span className="inline-flex items-center gap-1 text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                              <XCircle className="w-3 h-3" /> Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              <AlertTriangle className="w-3 h-3" /> {stockNum} left (Low)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" /> {stockNum} in Reserve
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="text-[11px] text-fg-muted font-mono">
                          {p.variants?.length || 1} SKU{p.variants?.length !== 1 ? 's' : ''}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setEditingProduct(p);
                              setIsFormOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-bg-secondary hover:bg-bg-secondary/80 border border-border-subtle text-fg-secondary hover:text-fg-primary transition-colors cursor-pointer"
                            title="Edit Artifact"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p.id, p.name)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 transition-colors cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Form Modal */}
      {isFormOpen && (
        <ProductFormModal
          product={editingProduct}
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingProduct(null);
          }}
          onSave={handleSaveProduct}
        />
      )}
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<SkeletonTable rows={5} />}>
      <AdminProductsContent />
    </Suspense>
  );
}
