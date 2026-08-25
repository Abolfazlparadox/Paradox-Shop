'use client';

import React, { useState } from 'react';
import { useAdminMe } from '@/hooks/useAdminData';
import { usePermissions } from '@/hooks/usePermissions';
import { authApi } from '@/lib/api/endpoints';

import { SkeletonCard } from '@/components/admin/SkeletonLoader';
import { notify } from '@/stores/notifications';
import {
  UserCheck,
  Shield,
  Key,
  Lock,
  Mail,
  User,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils/cn';

export default function AdminProfilePage() {
  const { data: adminUser, isLoading } = useAdminMe();
  const { isSuperUser, isStaff, permissions } = usePermissions();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== newPasswordConfirm) {
      notify.error('Mismatch', 'New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      notify.error('Length Error', 'Password must contain at least 8 characters.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await authApi.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      });
      notify.success('Credentials Updated', 'Your administrative master password was updated.');
      setOldPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
    } catch (err: any) {
      notify.error('Update Failed', err?.response?.data?.old_password?.[0] || 'Invalid current password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading || !adminUser) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-fg-primary tracking-tight flex items-center gap-2.5">
            <UserCheck className="w-6 h-6 text-cyan-500" />
            <span>Administrator Identity & Clearance Level</span>
          </h1>
          <p className="text-xs text-fg-secondary font-mono mt-0.5">
            Resolved cryptographic role clearances, active domain authorizations, and session security
          </p>
        </div>
      </div>

      {/* Account Clearance Dossier */}
      <div className="p-6 rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm space-y-6 transition-colors">
        <div className="flex items-center gap-4 pb-4 border-b border-border-subtle">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-mono font-bold text-xl shadow-[0_0_20px_rgba(0,245,212,0.3)]">
            {adminUser.first_name ? adminUser.first_name[0].toUpperCase() : 'A'}
          </div>
          <div>
            <h3 className="text-base font-bold font-display text-fg-primary">
              {adminUser.full_name || 'Administrator'}
            </h3>
            <div className="text-xs font-mono text-cyan-600 dark:text-cyan-400 font-semibold flex items-center gap-2 mt-0.5">
              <span>{adminUser.email}</span>
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-[10px] uppercase">
                {isSuperUser ? 'Superuser Sovereign' : 'Staff Executive'}
              </span>
            </div>
          </div>
        </div>

        {/* Effective Permissions Matrix */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-500" />
            <h4 className="text-xs font-bold font-display text-fg-primary uppercase tracking-wider">
              Authoritative Capabilities Matrix
            </h4>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 font-mono text-xs">
            {(adminUser.permissions || permissions).map((perm) => (
              <div
                key={perm}
                className="p-2.5 rounded-xl bg-bg-secondary/60 border border-border-subtle flex items-center gap-2 text-fg-primary"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span className="truncate">{perm}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Security & Password Rotation */}
      <div className="p-6 rounded-2xl bg-bg-elevated border border-border-subtle shadow-sm space-y-4 transition-colors">
        <div className="flex items-center gap-2 pb-2 border-b border-border-subtle">
          <Key className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-bold font-display text-fg-primary">Security Credentials Rotation</h3>
        </div>

        <form onSubmit={handlePasswordChange} className="max-w-md space-y-4 font-mono text-xs">
          <div>
            <label className="block text-fg-muted mb-1">Current Password *</label>
            <input
              type="password"
              required
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-fg-primary focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-fg-muted mb-1">New Password (Min. 8 Chars) *</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-fg-primary focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-fg-muted mb-1">Confirm New Password *</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2 rounded-xl bg-bg-secondary border border-border-subtle text-fg-primary focus:outline-none focus:border-cyan-500"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isChangingPassword}
            className="text-xs bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-400 dark:hover:bg-cyan-500 text-white dark:text-slate-950 font-bold shadow-md cursor-pointer"
            leftIcon={<Lock className="w-3.5 h-3.5" />}
          >
            Update Admin Password
          </Button>
        </form>
      </div>
    </div>
  );
}
