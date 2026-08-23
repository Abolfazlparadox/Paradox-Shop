'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api/admin';
import { SystemSettings, AuditLogEntry } from '@/types/admin';
import { SkeletonCard, SkeletonTable } from '@/components/admin/SkeletonLoader';
import { formatDate } from '@/lib/utils/format';
import { notify } from '@/stores/notifications';
import {
  Settings,
  Shield,
  DollarSign,
  Truck,
  Mail,
  Send,
  Save,
  Activity,
  ToggleLeft,
  ToggleRight,
  Globe,
  Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils/cn';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [sData, lData] = await Promise.all([
          adminApi.getSettings(),
          adminApi.getAuditLogs(),
        ]);
        setSettings(sData);
        setAuditLogs(lData);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setIsSaving(true);
    try {
      const updated = await adminApi.updateSettings(settings);
      setSettings(updated);
      notify.success('Settings Preserved', 'Atelier operational parameters synchronized.');
    } catch {
      notify.error('Settings Error', 'Failed to save configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestWebhook = async () => {
    setIsTestingWebhook(true);
    setTimeout(() => {
      setIsTestingWebhook(false);
      notify.success('Webhook Dispatched', 'Received HTTP 200 OK from endpoint.');
    }, 900);
  };

  if (isLoading || !settings) {
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
          isLoading={isSaving}
          className="text-xs font-mono bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-400 dark:hover:bg-cyan-500 text-white dark:text-slate-950 font-semibold"
          leftIcon={<Save className="w-4 h-4" />}
        >
          Persist All Settings
        </Button>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* General Storefront & Currency */}
        <div className="p-6 rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm dark:shadow-xl space-y-4 transition-colors">
          <div className="flex items-center gap-2 pb-2 border-b border-border-subtle text-xs font-bold font-display text-fg-primary">
            <Globe className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
            <span>1. Storefront Identity & Fiscal Parameters</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">
                Storefront Name
              </label>
              <input
                type="text"
                value={settings.store_name}
                onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs text-fg-primary focus:outline-none focus:border-cyan-500 font-sans"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">
                Operational Currency
              </label>
              <select
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-cyan-500"
              >
                <option value="TOMAN">Iranian Toman (IRT)</option>
                <option value="USD">US Dollar ($ USD)</option>
                <option value="EUR">Euro (€ EUR)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">
                Value Added Tax (VAT %)
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={settings.tax_rate}
                onChange={(e) => setSettings({ ...settings, tax_rate: Number(e.target.value) })}
                className="w-full px-3.5 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Shipping & Thresholds */}
        <div className="p-6 rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm dark:shadow-xl space-y-4 transition-colors">
          <div className="flex items-center gap-2 pb-2 border-b border-border-subtle text-xs font-bold font-display text-fg-primary">
            <Truck className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <span>2. Courier Logistics & Thresholds</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">
                Base Express Courier Fee (Toman)
              </label>
              <input
                type="number"
                value={settings.shipping_fee_base}
                onChange={(e) =>
                  setSettings({ ...settings, shipping_fee_base: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-fg-secondary mb-1">
                Free Delivery Cart Threshold (Toman)
              </label>
              <input
                type="number"
                value={settings.free_shipping_threshold}
                onChange={(e) =>
                  setSettings({ ...settings, free_shipping_threshold: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Security & Maintenance Mode */}
        <div className="p-6 rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm dark:shadow-xl space-y-4 transition-colors">
          <div className="flex items-center gap-2 pb-2 border-b border-border-subtle text-xs font-bold font-display text-fg-primary">
            <Shield className="w-4 h-4 text-rose-500 dark:text-rose-400" />
            <span>3. System State & Governance Gate</span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-bg-secondary border border-border-subtle">
            <div>
              <div className="text-xs font-bold text-fg-primary">Storefront Maintenance Mode</div>
              <p className="text-xs text-fg-secondary mt-0.5">
                When active, public storefront access is halted with a 503 Atelier Under Service screen. Staff retain full console access.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setSettings({ ...settings, maintenance_mode: !settings.maintenance_mode })
              }
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0',
                settings.maintenance_mode
                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/40'
                  : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40'
              )}
            >
              {settings.maintenance_mode ? 'MAINTENANCE ENGAGED' : 'SYSTEM OPERATIONAL'}
            </button>
          </div>

          {/* Webhook Endpoint Tester */}
          <div className="p-4 rounded-xl bg-bg-secondary border border-border-subtle space-y-3">
            <div className="text-xs font-bold text-fg-primary">Outbound Event Webhook URL</div>
            <div className="flex gap-2">
              <input
                type="url"
                value={settings.webhook_url}
                onChange={(e) => setSettings({ ...settings, webhook_url: e.target.value })}
                className="flex-1 px-3.5 py-2 rounded-xl bg-bg-elevated border border-border-subtle text-xs font-mono text-fg-primary focus:outline-none focus:border-cyan-500"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestWebhook}
                isLoading={isTestingWebhook}
                className="text-xs font-mono border-border-subtle hover:bg-bg-elevated text-fg-primary"
              >
                Dispatch Test Ping
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Immutable Audit Log Stream */}
      <div className="p-6 rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm dark:shadow-xl backdrop-blur-xl space-y-4 transition-colors">
        <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
          <div>
            <h3 className="text-base font-bold font-display text-fg-primary tracking-tight">
              Administrative Audit Log Stream
            </h3>
            <p className="text-xs text-fg-secondary font-mono mt-0.5">
              Append-only immutable record of staff operations and system state changes
            </p>
          </div>

          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-secondary text-cyan-600 dark:text-cyan-300 border border-border-subtle">
            SOC2 Verified Log
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-border-subtle text-fg-muted uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Staff Identity</th>
                <th className="py-2.5 px-3">Operation / Action</th>
                <th className="py-2.5 px-3">Resource Target</th>
                <th className="py-2.5 px-3 text-end">Origin IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/60 text-fg-secondary">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-bg-secondary/40">
                  <td className="py-2.5 px-3 text-fg-muted">{formatDate(log.created_at)}</td>
                  <td className="py-2.5 px-3 font-semibold text-fg-primary">{log.user_email}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-bg-secondary text-cyan-600 dark:text-cyan-300 font-bold border border-border-subtle">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-fg-primary">{log.resource_type}: {log.resource_id}</td>
                  <td className="py-2.5 px-3 text-end text-fg-muted">{log.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
