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

  const handleDeleteProduct = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you wish to archive "${name}" from the Atelier catalog?`)) {
      await adminApi.deleteProduct(id);
      notify.success('Catalog Updated', `Product ${name} removed.`);
      await loadProducts();
    }
  };

  const handleInlinePriceUpdate = async (product: AdminProduct, newPrice: number) => {
    if (newPrice <= 0 || isNaN(newPrice)) return;
    await adminApi.saveProduct({ id: product.id, base_price: newPrice });
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, base_price: newPrice } : p))
    );
    notify.success('Pricing Adjusted', `Base price updated to ${formatCurrency(newPrice)}.`);
  };

  const categories = ['ALL', 'horology', 'leather-goods', 'hardware', 'fragrance'];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-white tracking-tight flex items-center gap-2.5">
            <Package className="w-6 h-6 text-emerald-400" />
            <span>Artifacts & Catalog Engine</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Manage product editions, pricing matrices, inventory reserves, and variant trees
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setEditingProduct(null);
            setIsFormOpen(true);
          }}
          className="text-xs font-mono bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold"
          leftIcon={<Plus className="w-4 h-4" />}
        >
          New Artifact
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 font-mono text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl uppercase tracking-wider transition-all whitespace-nowrap',
                categoryFilter === cat
                  ? 'bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              )}
            >
              {cat === 'ALL' ? 'All Editions' : cat.replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* Stock Filter & Search Box */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            <option value="ALL">All Reserves</option>
            <option value="LOW">Low Stock (≤10)</option>
            <option value="OUT">Out of Stock (0)</option>
          </select>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search catalog..."
              className="w-full ps-9 pe-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>
      </div>

      {/* Catalog Table */}
      {isLoading ? (
        <SkeletonTable rows={4} />
      ) : products.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2 font-mono text-xs text-slate-400">
          <Package className="w-8 h-8 text-slate-600 mx-auto" />
          <div className="text-white font-bold">No artifacts in view</div>
          <p className="text-slate-500">Adjust the filters or publish a new product.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-2xl backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Artifact</th>
                  <th className="py-3.5 px-3">Category</th>
                  <th className="py-3.5 px-3">Base Price</th>
                  <th className="py-3.5 px-3">Reserve Stock</th>
                  <th className="py-3.5 px-3">Variants</th>
                  <th className="py-3.5 px-3">Rating</th>
                  <th className="py-3.5 px-4 text-end">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {products.map((prod) => {
                  const isLowStock = prod.stock > 0 && prod.stock <= 10;
                  const isOutOfStock = prod.stock === 0;

                  return (
                    <tr key={prod.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white font-display text-sm">{prod.name}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2">
                          <span>/{prod.slug}</span>
                          <span>•</span>
                          <span className="text-emerald-400">{prod.brand?.name || 'Paradox Atelier'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                          {prod.category.name}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 font-bold text-cyan-300">
                        {formatCurrency(prod.base_price)}
                      </td>

                      <td className="py-3.5 px-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border',
                            isOutOfStock
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : isLowStock
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          )}
                        >
                          {isOutOfStock ? (
                            <>
                              <XCircle className="w-3 h-3" />
                              Out of Reserve
                            </>
                          ) : isLowStock ? (
                            <>
                              <AlertTriangle className="w-3 h-3" />
                              Low: {prod.stock} left
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              {prod.stock} in Stock
                            </>
                          )}
                        </span>
                      </td>

                      <td className="py-3.5 px-3 text-slate-400">
                        {prod.variants.length > 0 ? `${prod.variants.length} SKUs` : 'Single'}
                      </td>

                      <td className="py-3.5 px-3 text-amber-400 font-bold">
                        ★ {prod.rating.toFixed(1)} ({prod.reviews_count})
                      </td>

                      <td className="py-3.5 px-4 text-end">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setEditingProduct(prod);
                              setIsFormOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                            title="Edit Artifact"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod.id, prod.name)}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                            title="Archive Artifact"
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
    <Suspense fallback={<SkeletonTable rows={4} />}>
      <AdminProductsContent />
    </Suspense>
  );
}
