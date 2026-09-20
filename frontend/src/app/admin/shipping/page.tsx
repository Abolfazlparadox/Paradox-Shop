'use client';

import React, { useState } from 'react';
import {
  useAdminShippingMethods,
  useUpdateShippingMethod,
  useCreateShippingMethod,
  useDeleteShippingMethod,
} from '@/hooks/useAdminData';
import { AdminShippingMethod } from '@/types/api';
import { SkeletonTable } from '@/components/admin/SkeletonLoader';
import { formatCurrency } from '@/lib/utils/format';
import { notify } from '@/stores/notifications';
import {
  Truck,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Clock,
  Sparkles,
  ShieldCheck,
  Zap,
  Package,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function AdminShippingPage() {
  const { data: methods = [], isLoading } = useAdminShippingMethods();
  const updateMutation = useUpdateShippingMethod();
  const createMutation = useCreateShippingMethod();
  const deleteMutation = useDeleteShippingMethod();

  const [editingMethod, setEditingMethod] = useState<AdminShippingMethod | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newMethodData, setNewMethodData] = useState({
    code: '',
    name: '',
    description: '',
    base_rate: '1000000',
    free_shipping_threshold: '100000000',
    estimated_days_min: 1,
    estimated_days_max: 3,
    is_active: true,
    sort_order: 10,
  });

  const handleToggleActive = async (method: AdminShippingMethod) => {
    try {
      await updateMutation.mutateAsync({
        id: method.id,
        data: { is_active: !method.is_active },
      });
      notify.success(
        'Status Updated',
        `${method.name} is now ${!method.is_active ? 'ACTIVE' : 'INACTIVE'}.`
      );
    } catch {
      notify.error('Update Failed', 'Failed to toggle shipping method status.');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMethod) return;

    try {
      await updateMutation.mutateAsync({
        id: editingMethod.id,
        data: {
          name: editingMethod.name,
          description: editingMethod.description,
          base_rate: editingMethod.base_rate,
          free_shipping_threshold: editingMethod.free_shipping_threshold || null,
          estimated_days_min: Number(editingMethod.estimated_days_min),
          estimated_days_max: Number(editingMethod.estimated_days_max),
          is_active: editingMethod.is_active,
          sort_order: Number(editingMethod.sort_order),
        },
      });
      notify.success('Rates Synchronized', `${editingMethod.name} parameters updated.`);
      setEditingMethod(null);
    } catch {
      notify.error('Save Failed', 'Unable to save shipping method rates.');
    }
  };

  const handleCreateMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({
        ...newMethodData,
        base_rate: String(newMethodData.base_rate),
        free_shipping_threshold: newMethodData.free_shipping_threshold ? String(newMethodData.free_shipping_threshold) : null,
        estimated_days_min: Number(newMethodData.estimated_days_min),
        estimated_days_max: Number(newMethodData.estimated_days_max),
        sort_order: Number(newMethodData.sort_order),
      });
      notify.success('Method Added', `Shipping method ${newMethodData.name} provisioned.`);
      setIsCreateModalOpen(false);
      setNewMethodData({
        code: '',
        name: '',
        description: '',
        base_rate: '1000000',
        free_shipping_threshold: '100000000',
        estimated_days_min: 1,
        estimated_days_max: 3,
        is_active: true,
        sort_order: 10,
      });
    } catch {
      notify.error('Creation Error', 'Failed to create new shipping method tier.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Remove shipping method "${name}"?`)) return;
    try {
      await deleteMutation.mutateAsync(id);
      notify.success('Method Removed', `${name} decommissioned from active dispatch.`);
    } catch {
      notify.error('Delete Failed', 'Unable to delete shipping method.');
    }
  };

  const activeMethodsCount = methods.filter((m) => m.is_active).length;

  return (
    <div className="space-y-6 text-left">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent text-accent-fg border border-border-subtle shadow-subtle">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold font-display text-fg-primary tracking-tight">
                Shipping & Logistics Control
              </h1>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {activeMethodsCount} Active Tiers
              </span>
            </div>
            <p className="text-xs text-fg-muted font-mono">
              Configure courier delivery methods, rate pricing (Rial/Toman), free thresholds, and SLA days
            </p>
          </div>
        </div>

        <Button
          onClick={() => setIsCreateModalOpen(true)}
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-4 h-4" />}
          className="text-xs font-semibold rounded-xl"
        >
          Add Shipping Method
        </Button>
      </div>

      {/* Telemetry Quick Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-bg-elevated border border-border-subtle shadow-card space-y-1">
          <div className="flex items-center justify-between text-xs text-fg-muted font-mono uppercase">
            <span>Configured Tiers</span>
            <Layers className="w-4 h-4 text-fg-primary" />
          </div>
          <p className="text-2xl font-bold font-mono text-fg-primary">{methods.length}</p>
        </div>

        <div className="p-4 rounded-xl bg-bg-elevated border border-border-subtle shadow-card space-y-1">
          <div className="flex items-center justify-between text-xs text-fg-muted font-mono uppercase">
            <span>Active Dispatchers</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold font-mono text-emerald-500">{activeMethodsCount}</p>
        </div>

        <div className="p-4 rounded-xl bg-bg-elevated border border-border-subtle shadow-card space-y-1">
          <div className="flex items-center justify-between text-xs text-fg-muted font-mono uppercase">
            <span>Delivery Fleet</span>
            <Truck className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-sm font-bold font-mono text-fg-primary pt-1">Paradox Express & Post</p>
        </div>
      </div>

      {/* Shipping Methods Table */}
      {isLoading ? (
        <SkeletonTable rows={4} />
      ) : (
        <div className="rounded-2xl border border-border-subtle bg-bg-elevated shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-bg-secondary/70 text-fg-muted font-mono text-[10px] uppercase border-b border-border-subtle">
                <tr>
                  <th className="px-5 py-3.5">Method Code & Name</th>
                  <th className="px-5 py-3.5">Base Rate</th>
                  <th className="px-5 py-3.5">Free Threshold</th>
                  <th className="px-5 py-3.5">Estimated SLA</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/60">
                {methods.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-fg-muted font-mono">
                      No shipping methods provisioned. Click &quot;Add Shipping Method&quot; to create one.
                    </td>
                  </tr>
                ) : (
                  methods.map((method) => {
                    const isEditing = editingMethod?.id === method.id;
                    const baseRateNum = Number(method.base_rate);
                    const thresholdNum = method.free_shipping_threshold
                      ? Number(method.free_shipping_threshold)
                      : null;

                    return (
                      <tr key={method.id} className="hover:bg-bg-secondary/30 transition-colors">
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold font-display text-fg-primary text-sm">
                                {method.name}
                              </span>
                              <code className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-bg-secondary text-fg-muted border border-border-subtle">
                                {method.code}
                              </code>
                            </div>
                            {method.description && (
                              <p className="text-[11px] text-fg-muted max-w-md line-clamp-1">
                                {method.description}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="px-5 py-4 font-mono font-bold text-fg-primary">
                          {formatCurrency(baseRateNum)}
                        </td>

                        <td className="px-5 py-4 font-mono text-fg-secondary">
                          {thresholdNum ? (
                            <span className="text-emerald-500 font-semibold">
                              &gt; {formatCurrency(thresholdNum)}
                            </span>
                          ) : (
                            <span className="text-fg-muted">None</span>
                          )}
                        </td>

                        <td className="px-5 py-4 font-mono text-fg-secondary">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-fg-muted" />
                            <span>{method.estimated_delivery_text || `${method.estimated_days_min}-${method.estimated_days_max} Days`}</span>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(method)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase transition-colors cursor-pointer ${
                              method.is_active
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {method.is_active ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            {method.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingMethod(method)}
                              className="p-1.5 rounded-lg bg-bg-secondary hover:bg-bg-secondary/80 border border-border-subtle text-fg-secondary hover:text-fg-primary transition-colors cursor-pointer"
                              title="Configure Rates & SLA"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(method.id, method.name)}
                              className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 transition-colors cursor-pointer"
                              title="Delete Shipping Method"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Method Modal */}
      {editingMethod && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl bg-bg-elevated border border-border-subtle shadow-2xl p-6 space-y-5 text-fg-primary">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold font-display">Configure {editingMethod.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingMethod(null)}
                className="p-1 rounded-lg hover:bg-bg-secondary text-fg-muted hover:text-fg-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs font-mono">
              <div className="space-y-1">
                <label className="text-fg-muted">Method Name</label>
                <input
                  type="text"
                  value={editingMethod.name}
                  onChange={(e) => setEditingMethod({ ...editingMethod, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-fg-primary focus:outline-none focus:border-amber-500/80"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-fg-muted">Description</label>
                <textarea
                  value={editingMethod.description || ''}
                  onChange={(e) => setEditingMethod({ ...editingMethod, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-fg-primary focus:outline-none focus:border-amber-500/80 h-16 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-fg-muted">Base Rate (Rial)</label>
                  <input
                    type="number"
                    value={editingMethod.base_rate}
                    onChange={(e) => setEditingMethod({ ...editingMethod, base_rate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-fg-primary focus:outline-none focus:border-amber-500/80 font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-fg-muted">Free Threshold (Rial)</label>
                  <input
                    type="number"
                    value={editingMethod.free_shipping_threshold || ''}
                    onChange={(e) =>
                      setEditingMethod({
                        ...editingMethod,
                        free_shipping_threshold: e.target.value || null,
                      })
                    }
                    placeholder="None (Always Paid)"
                    className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-fg-primary focus:outline-none focus:border-amber-500/80"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-fg-muted">Min Estimated Days (SLA)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingMethod.estimated_days_min}
                    onChange={(e) =>
                      setEditingMethod({ ...editingMethod, estimated_days_min: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-fg-primary focus:outline-none focus:border-amber-500/80"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-fg-muted">Max Estimated Days (SLA)</label>
                  <input
                    type="number"
                    min="1"
                    value={editingMethod.estimated_days_max}
                    onChange={(e) =>
                      setEditingMethod({ ...editingMethod, estimated_days_max: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-fg-primary focus:outline-none focus:border-amber-500/80"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingMethod.is_active}
                    onChange={(e) => setEditingMethod({ ...editingMethod, is_active: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-xs text-fg-primary">Active for checkout</span>
                </label>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingMethod(null)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={updateMutation.isPending}
                    className="text-xs"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Method Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
          <div className="w-full max-w-lg rounded-2xl bg-bg-elevated border border-border-subtle shadow-2xl p-6 space-y-5 text-fg-primary">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold font-display">Provision New Delivery Tier</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg hover:bg-bg-secondary text-fg-muted hover:text-fg-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMethod} className="space-y-4 text-xs font-mono">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-fg-muted">Unique Code</label>
                  <input
                    type="text"
                    value={newMethodData.code}
                    onChange={(e) => setNewMethodData({ ...newMethodData, code: e.target.value.toLowerCase() })}
                    placeholder="e.g. drone_vip"
                    className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-fg-primary focus:outline-none focus:border-amber-500/80"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-fg-muted">Method Name</label>
                  <input
                    type="text"
                    value={newMethodData.name}
                    onChange={(e) => setNewMethodData({ ...newMethodData, name: e.target.value })}
                    placeholder="e.g. VIP Direct Courier"
                    className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-fg-primary focus:outline-none focus:border-amber-500/80"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-fg-muted">Description</label>
                <textarea
                  value={newMethodData.description}
                  onChange={(e) => setNewMethodData({ ...newMethodData, description: e.target.value })}
                  placeholder="Direct dispatch with protective vault security wrapping..."
                  className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-fg-primary focus:outline-none focus:border-amber-500/80 h-16 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-fg-muted">Base Rate (Rial)</label>
                  <input
                    type="number"
                    value={newMethodData.base_rate}
                    onChange={(e) => setNewMethodData({ ...newMethodData, base_rate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-fg-primary focus:outline-none focus:border-amber-500/80 font-bold"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-fg-muted">Free Threshold (Rial)</label>
                  <input
                    type="number"
                    value={newMethodData.free_shipping_threshold}
                    onChange={(e) =>
                      setNewMethodData({ ...newMethodData, free_shipping_threshold: e.target.value })
                    }
                    placeholder="e.g. 100000000"
                    className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-fg-primary focus:outline-none focus:border-amber-500/80"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-fg-muted">Min Days (SLA)</label>
                  <input
                    type="number"
                    min="0"
                    value={newMethodData.estimated_days_min}
                    onChange={(e) =>
                      setNewMethodData({ ...newMethodData, estimated_days_min: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-fg-primary focus:outline-none focus:border-amber-500/80"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-fg-muted">Max Days (SLA)</label>
                  <input
                    type="number"
                    min="1"
                    value={newMethodData.estimated_days_max}
                    onChange={(e) =>
                      setNewMethodData({ ...newMethodData, estimated_days_max: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-fg-primary focus:outline-none focus:border-amber-500/80"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={createMutation.isPending}
                  className="text-xs"
                >
                  Create Method
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
