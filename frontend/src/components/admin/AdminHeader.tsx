'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { adminApi } from '@/lib/api/admin';
import { AdminNotification } from '@/types/admin';
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
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function AdminHeader({ onOpenCommandPalette }: { onOpenCommandPalette: () => void }) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useUIStore();

  const [utcTime, setUtcTime] = useState<string>('');
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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

  // Fetch notifications
  useEffect(() => {
    adminApi.getNotifications().then(setNotifications);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAllRead = async () => {
    await adminApi.markNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
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
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-secondary/80 dark:bg-slate-900/60 hover:bg-bg-secondary dark:hover:bg-slate-800/60 border border-border-subtle dark:border-slate-800 text-xs font-mono text-fg-secondary dark:text-slate-300 hover:text-fg-primary dark:hover:text-white transition-colors"
        >
          <span>Storefront</span>
          <ExternalLink className="w-3 h-3 text-fg-muted dark:text-slate-400" />
        </Link>

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setIsNotifOpen(!isNotifOpen);
              setIsProfileOpen(false);
            }}
            className="relative p-2 rounded-xl bg-bg-secondary/80 dark:bg-slate-900/60 hover:bg-bg-secondary dark:hover:bg-slate-800/60 border border-border-subtle dark:border-slate-800 text-fg-secondary dark:text-slate-300 hover:text-fg-primary dark:hover:text-white transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-cyan-500 dark:bg-cyan-400 text-white dark:text-slate-950 text-[9px] font-mono font-bold flex items-center justify-center shadow-[0_0_10px_#00F5D4]">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute top-full end-0 mt-2 w-80 sm:w-96 rounded-2xl bg-bg-elevated dark:bg-slate-900 border border-border-subtle dark:border-slate-800 shadow-2xl p-4 space-y-3 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-border-subtle dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold font-display text-fg-primary dark:text-white">Event Log</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 rounded border border-cyan-500/30">
                      {unreadCount} Unread
                    </span>
                  )}
                </div>
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <CheckCheck className="w-3 h-3" />
                  Mark read
                </button>
              </div>

              <div className="divide-y divide-border-subtle/60 dark:divide-slate-800/60 max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-xs text-fg-muted dark:text-slate-400 font-mono">
                    No active administrative alerts.
                  </div>
                ) : (
                  notifications.map((n) => (
                    <div key={n.id} className="py-2.5 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-fg-primary dark:text-white font-display flex items-center gap-1.5">
                          {n.type === 'ORDER' && <ShoppingBag className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />}
                          {n.type === 'STOCK' && <Package className="w-3 h-3 text-amber-500 dark:text-amber-400" />}
                          {n.type === 'REVIEW' && <Sparkles className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />}
                          {n.title}
                        </span>
                        <span className="text-[10px] font-mono text-fg-muted dark:text-slate-400">{n.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-fg-secondary dark:text-slate-400 leading-snug">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Admin Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsProfileOpen(!isProfileOpen);
              setIsNotifOpen(false);
            }}
            className="flex items-center gap-2 p-1.5 sm:px-2.5 rounded-xl bg-bg-secondary/80 dark:bg-slate-900/80 hover:bg-bg-secondary dark:hover:bg-slate-800 border border-border-subtle dark:border-slate-800 transition-colors cursor-pointer"
          >
            <div className="w-6 h-6 rounded-lg bg-cyan-500 dark:bg-cyan-400 text-white dark:text-slate-950 font-mono font-bold text-[10px] flex items-center justify-center">
              {user?.first_name ? user.first_name[0].toUpperCase() : 'A'}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-semibold text-fg-primary dark:text-white font-display leading-tight truncate max-w-[110px]">
                {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : 'Director'}
              </span>
              <span className="text-[9px] font-mono text-cyan-600 dark:text-cyan-400 uppercase tracking-widest">
                Staff Master
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-fg-muted dark:text-slate-400" />
          </button>

          {isProfileOpen && (
            <div className="absolute top-full end-0 mt-2 w-56 rounded-2xl bg-bg-elevated dark:bg-slate-900 border border-border-subtle dark:border-slate-800 shadow-2xl p-2 space-y-1 z-50">
              <div className="px-3 py-2 bg-bg-secondary/80 dark:bg-slate-950/60 rounded-xl mb-1">
                <div className="text-xs font-bold text-fg-primary dark:text-white font-display truncate">
                  {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : 'Director'}
                </div>
                <div className="text-[10px] font-mono text-fg-muted dark:text-slate-400 truncate">{user?.email}</div>
                <div className="mt-1 inline-flex items-center gap-1 text-[9px] font-mono text-cyan-600 dark:text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                  <Shield className="w-2.5 h-2.5" />
                  SUPER_ADMIN
                </div>
              </div>

              <Link
                href="/admin/settings"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-fg-secondary dark:text-slate-300 hover:text-fg-primary dark:hover:text-white hover:bg-bg-secondary dark:hover:bg-slate-800 transition-colors"
              >
                <span>Store & API Settings</span>
              </Link>

              <button
                onClick={async () => {
                  setIsProfileOpen(false);
                  await logout();
                  router.push('/admin/login');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-status-error hover:bg-status-error/10 transition-colors cursor-pointer text-left"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Disconnect Console</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
