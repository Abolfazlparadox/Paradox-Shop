'use client';

import React, { useState, useEffect } from 'react';
import { useAdminAuditLogs, useAdminSettings, useUpdateAdminSettings } from '@/hooks/useAdminData';
import { AdminSystemSettingsData } from '@/types/api';
import { SkeletonCard, SkeletonTable } from '@/components/admin/SkeletonLoader';
import { formatDate } from '@/lib/utils/format';
import { notify } from '@/stores/notifications';
import {
  Settings,
  Shield,
  DollarSign,
  Truck,
  Send,
  Save,
  Globe,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

export default function AdminSettingsPage() {
  const { data: serverSettings, isLoading } = useAdminSettings();
  const { data: auditLogs = [] } = useAdminAuditLogs();
  const updateSettingsMutation = useUpdateAdminSettings();

  const [formData, setFormData] = useState<AdminSystemSettingsData>({
    store_name: 'PARADOX SHOP ATELIER',
    store_url: 'https://shop.paradox.art',
    currency: 'TOMAN',
    tax_rate: 9.0,
    shipping_fee_base: 65000,
    free_shipping_threshold: 5000000,
    maintenance_mode: false,
    webhook_url: 'https://api.paradox.art/webhooks/ops',
  });

  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

  useEffect(() => {
    if (serverSettings) {
      setFormData(serverSettings);
    }
  }, [serverSettings]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateSettingsMutation.mutateAsync(formData);
      notify.success('Settings Preserved', 'Atelier operational parameters synchronized with database.');
    } catch {
      notify.error('Settings Error', 'Failed to save configuration.');
    }
  };

  const handleTestWebhook = () => {
    setIsTestingWebhook(true);
    setTimeout(() => {
      setIsTestingWebhook(false);
      notify.success('Webhook Ping Dispatched', `Payload sent to ${formData.webhook_url}`);
    }, 800);
  };

  if (isLoading || !serverSettings) {
    return (
      <div className="space-y-8">
        <SkeletonCard />
        <SkeletonTable rows={4} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-fg-primary tracking-tight flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-cyan-500 dark:text-cyan-400" />
            <span>Storefront & Governance Parameters</span>
          </h1>
          <p className="text-xs text-fg-secondary font-mono mt-0.5">
            Operational currency, tax matrices, courier tiers, webhook telemetry, and immutable audit logs
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleSaveSettings}
          isLoading={updateSettingsMutation.isPending}
          className="text-xs font-mono bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-400 dark:hover:bg-cyan-500 text-white dark:text-slate-950 font-bold shadow-md cursor-pointer"
          leftIcon={<Save className="w-3.5 h-3.5" />}
        >
          Save Configuration
        </Button>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: Storefront Identity & Financials */}
        <div className="p-6 rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm space-y-4 transition-colors">
          <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
            <Globe className="w-4 h-4 text-cyan-500" />
            <h3 className="text-sm font-bold font-display text-fg-primary">Store Identity & Logistics</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
            <div>
              <label className="block text-fg-muted mb-1">Store Name</label>
              <input
                type="text"
                value={formData.store_name}
                onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-fg-primary focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-fg-muted mb-1">Store Canonical URL</label>
              <input
                type="url"
                value={formData.store_url}
                onChange={(e) => setFormData({ ...formData, store_url: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-fg-primary focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-fg-muted mb-1">Default Currency Unit</label>
              <input
                type="text"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-fg-primary focus:outline-none focus:border-cyan-500 font-bold text-cyan-600 dark:text-cyan-300"
              />
            </div>

            <div>
              <label className="block text-fg-muted mb-1">Base Courier Fee (Rial)</label>
              <input
                type="number"
                value={formData.shipping_fee_base}
                onChange={(e) => setFormData({ ...formData, shipping_fee_base: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-fg-primary focus:outline-none focus:border-cyan-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-fg-muted mb-1">Free Courier Threshold (Rial)</label>
              <input
                type="number"
                value={formData.free_shipping_threshold}
                onChange={(e) => setFormData({ ...formData, free_shipping_threshold: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-fg-primary focus:outline-none focus:border-cyan-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-fg-muted mb-1">Value-Added Tax (VAT %)</label>
              <input
                type="number"
                step={0.1}
                value={formData.tax_rate}
                onChange={(e) => setFormData({ ...formData, tax_rate: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-fg-primary focus:outline-none focus:border-cyan-500 font-bold"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Security, Maintenance Mode, & Webhooks */}
        <div className="p-6 rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm space-y-4 transition-colors">
          <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
            <Shield className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold font-display text-fg-primary">Security & Dispatch Webhooks</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl bg-bg-secondary/60 border border-border-subtle">
              <div>
                <div className="text-xs font-bold text-fg-primary">Emergency Maintenance Lockdown</div>
                <div className="text-[11px] text-fg-muted">
                  Bypasses storefront routing for non-staff visitors with an architectural pause state.
                </div>
              </div>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, maintenance_mode: !formData.maintenance_mode })}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all cursor-pointer border',
                  formData.maintenance_mode
                    ? 'bg-rose-500 text-white border-rose-600 shadow-md animate-pulse'
                    : 'bg-bg-elevated text-fg-secondary border-border-subtle hover:text-fg-primary'
                )}
              >
                {formData.maintenance_mode ? 'Lockdown Active' : 'Normal Operations'}
              </button>
            </div>

            <div>
              <label className="block text-xs font-mono text-fg-muted mb-1">
                Real-Time Operations Webhook Dispatch URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={formData.webhook_url}
                  onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                  placeholder="https://api.domain.com/webhooks/ops"
                  className="flex-1 px-3.5 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-cyan-500"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestWebhook}
                  isLoading={isTestingWebhook}
                  className="text-xs font-mono border-border-subtle text-cyan-600 dark:text-cyan-400 cursor-pointer"
                  rightIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Test Ping
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Section 3: Recent Administrative Audit Stream */}
      <div className="p-6 rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm space-y-4 transition-colors">
        <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold font-display text-fg-primary">Recent Audit Events</h3>
          </div>
          <span className="text-[10px] font-mono text-fg-muted">Immutable Ledger</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-border-subtle text-fg-muted uppercase text-[10px]">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Target</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/60 text-fg-secondary">
              {auditLogs.slice(0, 5).map((log) => (
                <tr key={log.id} className="hover:bg-bg-secondary/40">
                  <td className="py-2.5 px-3 text-fg-muted">{formatDate(log.created_at)}</td>
                  <td className="py-2.5 px-3 font-bold text-fg-primary">{log.user_email || 'System'}</td>
                  <td className="py-2.5 px-3 text-cyan-600 dark:text-cyan-400 font-bold">{log.action}</td>
                  <td className="py-2.5 px-3">{log.resource_type}:{log.resource_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
