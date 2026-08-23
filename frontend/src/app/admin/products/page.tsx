'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { adminApi } from '@/lib/api/admin';
import { AdminProduct } from '@/types/admin';
import { ProductFormModal } from '@/components/admin/ProductFormModal';
import { SkeletonTable } from '@/components/admin/SkeletonLoader';
import { formatCurrency } from '@/lib/utils/format';
import { notify } from '@/stores/notifications';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

function AdminProductsContent() {
  const searchParams = useSearchParams();
  const initialAction = searchParams.get('action');

  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(initialAction === 'new');
  const [isLoading, setIsLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminApi.getProducts({
        category: categoryFilter,
        stock: stockFilter,
        search: searchQuery,
      });
      setProducts(data);
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, stockFilter, searchQuery]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleSaveProduct = async (data: Partial<AdminProduct>) => {
    await adminApi.saveProduct(data);
    await loadProducts();
  };

  const handleDeleteProduct = async (productId: string, name: string) => {
    if (confirm(`Confirm deletion of artifact "${name}"? This removes the SKU from catalog.`)) {
      await adminApi.deleteProduct(productId);
      notify.success('Catalog Updated', `Product ${name} was deleted.`);
      await loadProducts();
    }
  };

  const handleInlinePriceChange = async (productId: string, newPrice: number) => {
    await adminApi.saveProduct({ id: productId, base_price: newPrice });
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, base_price: newPrice } : p))
    );
    notify.success('Price Updated', 'Live storefront price adjusted.');
  };

  const categories = [
    { id: 'ALL', label: 'All Artifacts' },
    { id: 'horology', label: 'Horology' },
    { id: 'leather-goods', label: 'Leather' },
    { id: 'hardware', label: 'Hardware' },
    { id: 'fragrance', label: 'Fragrance' },
  ];

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
          className="text-xs font-mono bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-400 dark:hover:bg-cyan-500 text-white dark:text-slate-950 font-semibold"
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Create Artifact
        </Button>
      </div>

      {/* Filter & Toolbar */}
      <div className="p-4 rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4 transition-colors">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2 sm:pb-0 scrollbar-none font-mono text-xs w-full sm:w-auto">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategoryFilter(c.id)}
                className={cn(
                  'px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer',
                  categoryFilter === c.id
                    ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 font-bold border border-cyan-500/30'
                    : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary border border-transparent'
                )}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Stock Filter & Search */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-cyan-500"
            >
              <option value="ALL">All Stock Levels</option>
              <option value="LOW">Low Stock (≤ 10)</option>
              <option value="OUT">Out of Stock (0)</option>
            </select>

            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-fg-muted absolute start-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search artifact name, SKU..."
                className="w-full ps-9 pe-3 py-1.5 rounded-xl bg-bg-secondary border border-border-subtle text-xs text-fg-primary placeholder-fg-muted focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Products Master Table */}
      {isLoading ? (
        <SkeletonTable rows={6} />
      ) : products.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-bg-elevated border border-border-subtle font-mono text-xs text-fg-muted space-y-2">
          <Package className="w-8 h-8 text-fg-muted mx-auto opacity-50" />
          <p>No products match active category and search queries.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-bg-elevated border border-border-subtle overflow-hidden shadow-sm dark:shadow-xl transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-bg-secondary text-fg-muted uppercase text-[10px] tracking-wider border-b border-border-subtle">
                <tr>
                  <th className="py-3.5 px-4">Artifact</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Base Price</th>
                  <th className="py-3.5 px-4">Inventory Stock</th>
                  <th className="py-3.5 px-4">Variants</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-end">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/60 text-fg-secondary">
                {products.map((p) => {
                  const isLow = p.stock > 0 && p.stock <= 10;
                  const isOut = p.stock === 0;

                  return (
                    <tr key={p.id} className="hover:bg-bg-secondary/40 transition-colors">
                      {/* Product Visual & Name */}
                      <td className="py-3.5 px-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-bg-secondary border border-border-subtle overflow-hidden shrink-0 flex items-center justify-center">
                          <img
                            src={p.primary_image || '/images/products/chrono.png'}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-semibold text-fg-primary font-display line-clamp-1">
                            {p.name}
                          </div>
                          <div className="text-[10px] text-fg-muted font-mono">{p.slug}</div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-secondary text-fg-secondary border border-border-subtle">
                          {p.category.name}
                        </span>
                      </td>

                      {/* Base Price Editable */}
                      <td className="py-3.5 px-4">
                        <input
                          type="number"
                          defaultValue={p.base_price}
                          onBlur={(e) => handleInlinePriceChange(p.id, Number(e.target.value))}
                          className="w-28 px-2 py-1 rounded bg-bg-secondary border border-border-subtle text-cyan-600 dark:text-cyan-300 font-bold focus:outline-none focus:border-cyan-500"
                        />
                      </td>

                      {/* Stock Level Warning */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {isOut ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                              <XCircle className="w-3 h-3" />
                              0 Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              <AlertTriangle className="w-3 h-3" />
                              {p.stock} Low
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              {p.stock} Units
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Variants Count */}
                      <td className="py-3.5 px-4 text-fg-muted">
                        {p.variants?.length ? `${p.variants.length} SKUs` : 'Single SKU'}
                      </td>

                      {/* Active Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={cn(
                            'text-[10px] font-mono px-2 py-0.5 rounded-full font-bold',
                            p.is_active
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : 'bg-slate-500/10 text-fg-muted border border-border-subtle'
                          )}
                        >
                          {p.is_active ? 'Live' : 'Draft'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-end">
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
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                            title="Delete Artifact"
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
        </div>
      )}

      {/* Product Form Modal */}
      <ProductFormModal
        product={editingProduct}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
      />
    </div>
  );
}

export default function AdminProductsPage() {
  return (
    <Suspense fallback={<SkeletonTable rows={8} />}>
      <AdminProductsContent />
    </Suspense>
  );
}
