'use client';

import React, { useState, Suspense } from 'react';
import {
  useAdminCategories,
  useAdminInventory,
  useBatchUpdateInventory,
  useUpdateInventoryStock,
} from '@/hooks/useAdminData';
import { SkeletonTable } from '@/components/admin/SkeletonLoader';
import { formatCurrency } from '@/lib/utils/format';
import { notify } from '@/stores/notifications';
import {
  Boxes,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Save,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

function AdminInventoryContent() {
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pendingStockChanges, setPendingStockChanges] = useState<Record<string, number>>({});

  const {
    data: inventory = [],
    isLoading,
    refetch,
  } = useAdminInventory({
    category: categoryFilter,
    stock: stockFilter,
    search: searchQuery,
  });

  const { data: categories = [] } = useAdminCategories();
  const updateStockMutation = useUpdateInventoryStock();
  const batchUpdateMutation = useBatchUpdateInventory();

  const handleStockInputChange = (variantId: string, value: number) => {
    setPendingStockChanges((prev) => ({
      ...prev,
      [variantId]: Math.max(0, value),
    }));
  };

  const handleSaveSingleStock = async (variantId: string) => {
    const newStock = pendingStockChanges[variantId];
    if (newStock === undefined) return;

    try {
      await updateStockMutation.mutateAsync({ variantId, stock: newStock });
      notify.success('Stock Synchronized', 'SKU reserve count updated in database.');
      setPendingStockChanges((prev) => {
        const copy = { ...prev };
        delete copy[variantId];
        return copy;
      });
    } catch {
      notify.error('Update Failed', 'Could not update inventory level.');
    }
  };

  const handleSaveAllChanges = async () => {
    const items = Object.entries(pendingStockChanges).map(([variant_id, stock]) => ({
      variant_id,
      stock,
    }));

    if (items.length === 0) return;

    try {
      await batchUpdateMutation.mutateAsync(items);
      notify.success('Batch Stock Updated', `Synchronized ${items.length} SKU reserve levels.`);
      setPendingStockChanges({});
    } catch {
      notify.error('Batch Error', 'Unable to apply batch stock updates.');
    }
  };

  const hasPendingChanges = Object.keys(pendingStockChanges).length > 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-fg-primary tracking-tight flex items-center gap-2.5">
            <Boxes className="w-6 h-6 text-amber-500 dark:text-amber-400" />
            <span>Inventory Reserves & Stock Telemetry</span>
          </h1>
          <p className="text-xs text-fg-secondary font-mono mt-0.5">
            Direct warehouse variant SKU replenishment, low-stock threshold triggers, and bulk sync
          </p>
        </div>

        {hasPendingChanges && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveAllChanges}
            isLoading={batchUpdateMutation.isPending}
            className="text-xs font-mono bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-400 dark:hover:bg-cyan-500 text-white dark:text-slate-950 font-bold shadow-md cursor-pointer animate-pulse"
            leftIcon={<Save className="w-3.5 h-3.5" />}
          >
            Save All ({Object.keys(pendingStockChanges).length}) Stock Updates
          </Button>
        )}
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="p-4 rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-fg-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search SKU, variant title, product..."
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
            All Categories
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
            { id: 'ALL', label: 'All Levels' },
            { id: 'LOW', label: 'Low (≤10)' },
            { id: 'OUT', label: 'Depleted (0)' },
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

      {/* Inventory Table */}
      <div className="rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm overflow-hidden transition-colors">
        {isLoading ? (
          <div className="p-6">
            <SkeletonTable rows={6} />
          </div>
        ) : inventory.length === 0 ? (
          <div className="py-16 text-center text-xs text-fg-muted font-mono space-y-2">
            <Boxes className="w-8 h-8 mx-auto opacity-50 text-amber-500" />
            <p>No inventory variants matched the query filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-border-subtle bg-bg-secondary/60 text-fg-muted uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">SKU / Code</th>
                  <th className="py-3.5 px-4">Artifact / Variant</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Price</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Reserve Count</th>
                  <th className="py-3.5 px-4 text-end">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/60 text-fg-secondary">
                {inventory.map((item) => {
                  const currentVal =
                    pendingStockChanges[item.id] !== undefined
                      ? pendingStockChanges[item.id]
                      : item.stock;
                  const isModified = pendingStockChanges[item.id] !== undefined;
                  const isLow = currentVal > 0 && currentVal <= 10;
                  const isOut = currentVal === 0;

                  return (
                    <tr key={item.id} className="hover:bg-bg-secondary/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-fg-primary">
                        <span className="px-2 py-0.5 rounded bg-bg-secondary border border-border-subtle text-[11px]">
                          {item.sku}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-fg-primary">{item.product_name}</div>
                        <div className="text-[11px] text-cyan-600 dark:text-cyan-400 font-semibold">
                          {item.name}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-[11px] text-fg-muted">
                          {item.category_name}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-bold text-fg-primary">
                        {formatCurrency(Number(item.final_price))}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 text-[10px] font-bold">
                            <XCircle className="w-3 h-3" /> Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3" /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3" /> Sufficient
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="inline-flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            value={currentVal}
                            onChange={(e) => handleStockInputChange(item.id, Number(e.target.value))}
                            className={cn(
                              'w-20 px-2.5 py-1 rounded-lg border text-xs font-mono font-bold text-center transition-colors',
                              isModified
                                ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-300'
                                : 'bg-bg-secondary border-border-subtle text-fg-primary focus:border-cyan-500'
                            )}
                          />
                        </div>
                      </td>

                      <td className="py-3 px-4 text-end">
                        {isModified ? (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleSaveSingleStock(item.id)}
                            isLoading={updateStockMutation.isPending}
                            className="text-[10px] font-mono px-2 py-1 bg-cyan-500 hover:bg-cyan-600 text-white dark:text-slate-950 cursor-pointer"
                          >
                            Save
                          </Button>
                        ) : (
                          <span className="text-[10px] text-fg-muted font-mono">In Sync</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminInventoryPage() {
  return (
    <Suspense fallback={<SkeletonTable rows={6} />}>
      <AdminInventoryContent />
    </Suspense>
  );
}
