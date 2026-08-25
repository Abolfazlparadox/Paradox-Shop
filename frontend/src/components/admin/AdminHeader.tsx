'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import {
  useAdminNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
} from '@/hooks/useAdminData';
import {
  Search,
  Clock,
  Bell,
  ExternalLink,
  User,
  LogOut,
  Shield,
  CheckCheck,
  Package,
  ShoppingBag,
  Sparkles,
  ChevronDown,
  Sun,
  Moon,
  Activity,
  Boxes,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function AdminHeader({ onOpenCommandPalette }: { onOpenCommandPalette: () => void }) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useUIStore();

  const [utcTime, setUtcTime] = useState<string>('');
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const { data: notifications = [] } = useAdminNotifications();
  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  // Live UTC operational clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getUTCHours()).padStart(2, '0');
      const minutes = String(now.getUTCMinutes()).padStart(2, '0');
      const seconds = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${hours}:${minutes}:${seconds} UTC`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate();
  };

  const handleNotificationClick = (id: string, actionUrl?: string | null) => {
    markReadMutation.mutate(id);
    setIsNotifOpen(false);
    if (actionUrl) {
      router.push(actionUrl);
    }
  };

  return (
    <header className="h-16 sticky top-0 z-20 bg-bg-elevated/90 dark:bg-[#070C18]/90 backdrop-blur-md border-b border-border-subtle dark:border-slate-800/80 px-4 sm:px-8 flex items-center justify-between gap-4 transition-colors">
      {/* Left: Quick Search Button */}
      <button
        onClick={onOpenCommandPalette}
        className="flex items-center gap-3 px-3.5 py-1.5 rounded-xl bg-bg-secondary/80 dark:bg-slate-900/80 hover:bg-bg-secondary dark:hover:bg-slate-800/60 border border-border-subtle dark:border-slate-800 text-fg-secondary dark:text-slate-400 hover:text-fg-primary dark:hover:text-slate-200 transition-all text-xs w-full max-w-xs shadow-inner cursor-pointer"
      >
        <Search className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400 shrink-0" />
        <span className="truncate">Search commands, orders, products...</span>
        <kbd className="hidden sm:inline-flex ms-auto text-[10px] font-mono text-fg-muted dark:text-slate-400 px-1.5 py-0.5 rounded bg-bg-elevated dark:bg-slate-950 border border-border-subtle dark:border-slate-800">
          ⌘K
        </kbd>
      </button>

      {/* Right: Operational Clock, Theme Switcher, Notifications & User */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live UTC Clock */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg-secondary/80 dark:bg-slate-950/60 border border-border-subtle dark:border-slate-800/80 text-[11px] font-mono text-cyan-600 dark:text-cyan-300">
          <Clock className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400 animate-pulse" />
          <span>{utcTime || '00:00:00 UTC'}</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-xl bg-bg-secondary/80 dark:bg-slate-900/60 hover:bg-bg-secondary dark:hover:bg-slate-800/60 border border-border-subtle dark:border-slate-800 text-fg-secondary dark:text-slate-300 hover:text-fg-primary dark:hover:text-white transition-colors cursor-pointer"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
        </button>

        {/* Storefront Link */}
        <Link
          href="/"
          target="_blank"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-secondary/80 dark:bg-slate-900/60 hover:bg-bg-secondary dark:hover:bg-slate-800/60 border border-border-subtle dark:border-slate-800 text-fg-secondary dark:text-slate-300 hover:text-fg-primary dark:hover:text-white text-xs transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5 text-fg-muted dark:text-slate-400" />
          <span>Storefront</span>
        </Link>

        {/* Notifications Popover Trigger */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className={cn(
              'p-2 rounded-xl border transition-all relative cursor-pointer',
              isNotifOpen
                ? 'bg-cyan-500/10 dark:bg-cyan-400/10 border-cyan-500/40 dark:border-cyan-400/40 text-cyan-600 dark:text-cyan-300 shadow-[0_0_12px_rgba(0,245,212,0.2)]'
                : 'bg-bg-secondary/80 dark:bg-slate-900/60 hover:bg-bg-secondary dark:hover:bg-slate-800/60 border-border-subtle dark:border-slate-800 text-fg-secondary dark:text-slate-300 hover:text-fg-primary dark:hover:text-white'
            )}
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-500 text-slate-950 font-mono font-bold text-[9px] rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl bg-bg-elevated/95 dark:bg-[#090E1F]/95 backdrop-blur-2xl border border-border-subtle dark:border-slate-800 shadow-2xl p-4 space-y-3 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between border-b border-border-subtle dark:border-slate-800/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-display font-semibold text-xs text-fg-primary dark:text-white">
                    Operational Alerts
                  </span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/30">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-mono cursor-pointer"
                  >
                    <CheckCheck className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-fg-muted dark:text-slate-400 font-mono">
                    Zero pending operational alerts.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif.id, notif.action_url)}
                      className={cn(
                        'p-3 rounded-xl border text-xs transition-all cursor-pointer flex items-start gap-3',
                        notif.is_read
                          ? 'bg-bg-secondary/40 dark:bg-slate-900/30 border-border-subtle/40 dark:border-slate-800/40 text-fg-secondary dark:text-slate-400'
                          : 'bg-bg-secondary dark:bg-slate-900/90 border-cyan-500/30 dark:border-cyan-400/30 text-fg-primary dark:text-slate-200 shadow-sm'
                      )}
                    >
                      <div className="mt-0.5 shrink-0">
                        {notif.notification_type === 'ORDER' && (
                          <ShoppingBag className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                        )}
                        {notif.notification_type === 'STOCK' && (
                          <Boxes className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                        )}
                        {notif.notification_type === 'REVIEW' && (
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                        )}
                        {notif.notification_type === 'SYSTEM' && (
                          <Activity className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                        )}
                      </div>
                      <div className="space-y-0.5 overflow-hidden w-full">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-xs truncate">{notif.title}</span>
                          <span className="text-[10px] font-mono text-fg-muted dark:text-slate-400 shrink-0">
                            {notif.timestamp}
                          </span>
                        </div>
                        <p className="text-[11px] text-fg-secondary dark:text-slate-400 leading-snug line-clamp-2">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Identity Profile Trigger */}
        <div className="relative">
          <button
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2.5 p-1.5 pr-3 rounded-xl bg-bg-secondary/80 dark:bg-slate-900/60 hover:bg-bg-secondary dark:hover:bg-slate-800/60 border border-border-subtle dark:border-slate-800 text-xs transition-colors cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white font-mono font-bold text-xs shadow-[0_0_10px_rgba(0,245,212,0.3)] shrink-0">
              {user?.first_name ? user.first_name[0].toUpperCase() : 'A'}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="font-medium text-xs text-fg-primary dark:text-white leading-none truncate max-w-[120px]">
                {user?.full_name || user?.email?.split('@')[0]}
              </span>
              <span className="text-[9px] font-mono text-cyan-600 dark:text-cyan-400 tracking-wider uppercase font-semibold">
                {user?.is_superuser ? 'SUPERUSER' : 'STAFF ATELIER'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-fg-muted dark:text-slate-400" />
          </button>

          {/* User Profile Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-3 w-56 rounded-2xl bg-bg-elevated/95 dark:bg-[#090E1F]/95 backdrop-blur-2xl border border-border-subtle dark:border-slate-800 shadow-2xl p-2 space-y-1 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="px-3 py-2 border-b border-border-subtle dark:border-slate-800/80 mb-1">
                <div className="font-semibold text-xs text-fg-primary dark:text-white truncate">
                  {user?.full_name || 'Administrator'}
                </div>
                <div className="text-[10px] font-mono text-fg-muted dark:text-slate-400 truncate">
                  {user?.email}
                </div>
              </div>

              <Link
                href="/admin/profile"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-fg-secondary dark:text-slate-300 hover:text-fg-primary dark:hover:text-white hover:bg-bg-secondary dark:hover:bg-slate-800/60 transition-colors"
              >
                <User className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
                <span>Admin Clearance</span>
              </Link>

              <Link
                href="/admin/settings"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-fg-secondary dark:text-slate-300 hover:text-fg-primary dark:hover:text-white hover:bg-bg-secondary dark:hover:bg-slate-800/60 transition-colors"
              >
                <Shield className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                <span>System Settings</span>
              </Link>

              <div className="border-t border-border-subtle dark:border-slate-800/80 my-1" />

              <button
                onClick={async () => {
                  setIsProfileOpen(false);
                  await logout();
                  router.push('/admin/login');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-rose-500 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Terminate Session</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
