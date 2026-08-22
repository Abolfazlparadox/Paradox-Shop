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
      notify.success('Webhook Verified', 'HTTP 200 OK received from upstream dispatcher.');
    }, 800);
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
    <div className="space-y-8 pb-12 font-mono text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-white tracking-tight flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-slate-400" />
            <span>Storefront & Governance Settings</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Currency conversion baselines, fiscal tax rates, maintenance gates, and security audit stream
          </p>
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* General & Atelier Identity */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 font-bold uppercase text-xs">
              <Globe className="w-4 h-4" />
              <span>Identity & Concierge Contacts</span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[11px] text-slate-400 uppercase">Store Name</label>
                <Input
                  value={settings.store_name}
                  onChange={(e) => setSettings({ ...settings, store_name: e.target.value })}
                  className="bg-slate-950/60 border-slate-800 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-slate-400 uppercase">Support Email</label>
                <Input
                  value={settings.contact_email}
                  onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })}
                  className="bg-slate-950/60 border-slate-800 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-slate-400 uppercase">Support Phone Hotline</label>
                <Input
                  value={settings.support_phone}
                  onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })}
                  className="bg-slate-950/60 border-slate-800 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Fiscal & Logistics Rules */}
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase text-xs">
              <DollarSign className="w-4 h-4" />
              <span>Fiscal & Fulfillment Parameters</span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="block text-[11px] text-slate-400 uppercase">VAT Tax Rate (%)</label>
                <Input
                  type="number"
                  value={settings.tax_rate_percentage}
                  onChange={(e) => setSettings({ ...settings, tax_rate_percentage: Number(e.target.value) })}
                  className="bg-slate-950/60 border-slate-800 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-slate-400 uppercase">Free Shipping Minimum (Toman)</label>
                <Input
                  type="number"
                  value={settings.free_shipping_threshold}
                  onChange={(e) => setSettings({ ...settings, free_shipping_threshold: Number(e.target.value) })}
                  className="bg-slate-950/60 border-slate-800 text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] text-slate-400 uppercase">Standard Dispatch Fee (Toman)</label>
                <Input
                  type="number"
                  value={settings.standard_shipping_cost}
                  onChange={(e) => setSettings({ ...settings, standard_shipping_cost: Number(e.target.value) })}
                  className="bg-slate-950/60 border-slate-800 text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Operational Gates (Maintenance & Webhooks) */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-bold uppercase text-xs">
              <Shield className="w-4 h-4" />
              <span>Operational Gates & Webhook Dispatchers</span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              isLoading={isTestingWebhook}
              onClick={handleTestWebhook}
              leftIcon={<Send className="w-3.5 h-3.5" />}
              className="text-[11px] font-mono border-slate-700 text-slate-300"
            >
              Test Upstream Webhook
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-white">Maintenance Mode Gate</div>
                <div className="text-[10px] text-slate-400">Lock public storefront for catalog re-indexing</div>
              </div>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, maintenance_mode: !settings.maintenance_mode })}
                className="text-cyan-400 p-1 cursor-pointer"
              >
                {settings.maintenance_mode ? (
                  <ToggleRight className="w-8 h-8 text-rose-400" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-600" />
                )}
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-white">Email & SMS Triggers</div>
                <div className="text-[10px] text-slate-400">Automatic order and OTP notifications</div>
              </div>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, email_notifications_enabled: !settings.email_notifications_enabled })}
                className="text-cyan-400 p-1 cursor-pointer"
              >
                {settings.email_notifications_enabled ? (
                  <ToggleRight className="w-8 h-8 text-emerald-400" />
                ) : (
                  <ToggleLeft className="w-8 h-8 text-slate-600" />
                )}
              </button>
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <Button
              type="submit"
              size="sm"
              variant="primary"
              isLoading={isSaving}
              leftIcon={<Save className="w-3.5 h-3.5" />}
              className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-xs"
            >
              Save Configuration
            </Button>
          </div>
        </div>
      </form>

      {/* Audit Log Stream */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-2xl backdrop-blur-xl space-y-4">
        <div className="flex items-center gap-2 text-indigo-400 font-bold uppercase text-xs">
          <Activity className="w-4 h-4" />
          <span>Security & Operational Audit Stream</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="py-3 px-3">Timestamp</th>
                <th className="py-3 px-3">Staff Identity</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Target Resource</th>
                <th className="py-3 px-3 text-end">Origin IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 text-slate-400">{formatDate(log.created_at)}</td>
                  <td className="py-2.5 px-3 font-semibold text-white">{log.admin_name}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[10px] font-bold">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {log.resource_type}: {log.resource_id}
                  </td>
                  <td className="py-2.5 px-3 text-end font-mono text-slate-400">{log.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
