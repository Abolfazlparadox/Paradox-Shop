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
  Menu,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface AdminHeaderProps {
  onOpenCommandPalette: () => void;
  onToggleMobileMenu?: () => void;
}

export function AdminHeader({ onOpenCommandPalette, onToggleMobileMenu }: AdminHeaderProps) {
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
    <header className="h-16 sticky top-0 z-20 bg-bg-elevated/90 backdrop-blur-md border-b border-border-subtle px-4 sm:px-8 flex items-center justify-between gap-3 transition-colors">
      {/* Left: Mobile Hamburger Toggle + Quick Search Button */}
      <div className="flex items-center gap-2.5 flex-1 max-w-md">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 rounded-xl bg-bg-secondary hover:bg-bg-secondary/80 border border-border-subtle text-fg-secondary hover:text-fg-primary transition-colors cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-bg-secondary hover:bg-bg-secondary/80 border border-border-subtle text-fg-muted hover:text-fg-primary transition-all text-xs w-full max-w-xs shadow-inner cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 text-fg-muted shrink-0" />
          <span className="truncate text-start">Search console, orders, items...</span>
          <kbd className="hidden sm:inline-flex ms-auto text-[10px] font-mono text-fg-muted px-1.5 py-0.5 rounded bg-bg-elevated border border-border-subtle">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right: Operational Clock, Theme Switcher, Notifications & User */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Live UTC Clock */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-bg-secondary border border-border-subtle text-[11px] font-mono text-fg-secondary">
          <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          <span>{utcTime || '00:00:00 UTC'}</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-xl bg-bg-secondary hover:bg-bg-secondary/80 border border-border-subtle text-fg-secondary hover:text-fg-primary transition-colors cursor-pointer"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-fg-primary" />
          )}
        </button>

        {/* Storefront Link */}
        <Link
          href="/"
          target="_blank"
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-bg-secondary hover:bg-bg-secondary/80 border border-border-subtle text-fg-secondary hover:text-fg-primary text-xs transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5 text-fg-muted" />
          <span>Storefront</span>
        </Link>

        {/* Notifications Popover Trigger */}
        <div className="relative">
          <button
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className={cn(
              'p-2 rounded-xl border transition-all relative cursor-pointer',
              isNotifOpen
                ? 'bg-accent text-accent-fg border-accent shadow-subtle'
                : 'bg-bg-secondary hover:bg-bg-secondary/80 border-border-subtle text-fg-secondary hover:text-fg-primary'
            )}
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-black font-mono font-bold text-[9px] rounded-full flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl bg-bg-elevated backdrop-blur-2xl border border-border-subtle shadow-2xl p-4 space-y-3 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-display font-semibold text-xs text-fg-primary">
                    Operational Alerts
                  </span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 font-mono cursor-pointer"
                  >
                    <CheckCheck className="w-3 h-3" /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2 custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-fg-muted font-mono">
                    Zero pending operational alerts.
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif.id, notif.action_url)}
                      className={cn(
                        'p-3 rounded-xl border text-xs transition-all cursor-pointer flex items-start gap-3 text-left',
                        notif.is_read
                          ? 'bg-bg-secondary/40 border-border-subtle/50 text-fg-muted'
                          : 'bg-bg-secondary border-border-subtle text-fg-primary shadow-subtle'
                      )}
                    >
                      <div className="mt-0.5 shrink-0">
                        {notif.notification_type === 'ORDER' && (
                          <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
                        )}
                        {notif.notification_type === 'STOCK' && (
                          <Boxes className="w-3.5 h-3.5 text-status-warning" />
                        )}
                        {notif.notification_type === 'REVIEW' && (
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        )}
                        {notif.notification_type === 'SYSTEM' && (
                          <Activity className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                      </div>
                      <div className="space-y-0.5 overflow-hidden w-full">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-xs truncate text-fg-primary">{notif.title}</span>
                          <span className="text-[10px] font-mono text-fg-muted shrink-0">
                            {notif.timestamp}
                          </span>
                        </div>
                        <p className="text-[11px] text-fg-secondary leading-snug line-clamp-2">
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
            className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-xl bg-bg-secondary hover:bg-bg-secondary/80 border border-border-subtle text-xs transition-colors cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-accent text-accent-fg border border-border-subtle flex items-center justify-center font-mono font-bold text-xs shadow-subtle shrink-0">
              {user?.first_name ? user.first_name[0].toUpperCase() : 'A'}
            </div>
            <div className="hidden lg:flex flex-col text-left">
              <span className="font-medium text-xs text-fg-primary leading-none truncate max-w-[120px]">
                {user?.full_name || user?.email?.split('@')[0]}
              </span>
              <span className="text-[9px] font-mono text-amber-600 dark:text-amber-400 tracking-wider uppercase font-semibold">
                {user?.is_superuser ? 'SUPERUSER' : 'STAFF ATELIER'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-fg-muted" />
          </button>

          {/* User Profile Menu */}
          {isProfileOpen && (
            <div className="absolute right-0 mt-3 w-56 rounded-2xl bg-bg-elevated backdrop-blur-2xl border border-border-subtle shadow-2xl p-2 space-y-1 z-50 animate-in fade-in slide-in-from-top-2 text-left">
              <div className="px-3 py-2 border-b border-border-subtle mb-1">
                <div className="font-semibold text-xs text-fg-primary truncate">
                  {user?.full_name || 'Administrator'}
                </div>
                <div className="text-[10px] font-mono text-fg-muted truncate">
                  {user?.email}
                </div>
              </div>

              <Link
                href="/admin/profile"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary transition-colors"
              >
                <User className="w-3.5 h-3.5 text-fg-muted" />
                <span>Admin Clearance</span>
              </Link>

              <Link
                href="/admin/settings"
                onClick={() => setIsProfileOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary transition-colors"
              >
                <Shield className="w-3.5 h-3.5 text-fg-muted" />
                <span>System Settings</span>
              </Link>

              <div className="border-t border-border-subtle my-1" />

              <button
                onClick={async () => {
                  setIsProfileOpen(false);
                  await logout();
                  router.push('/admin/login');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-status-error hover:bg-status-error/10 transition-colors cursor-pointer text-left"
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
