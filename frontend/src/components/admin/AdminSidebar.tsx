'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BarChart3,
  ShoppingBag,
  Package,
  Boxes,
  Users,
  MessageSquare,
  CreditCard,
  Settings,
  Activity,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { usePermissions } from '@/hooks/usePermissions';
import { useAdminDashboard, useAdminNotifications } from '@/hooks/useAdminData';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeVariant?: 'cyan' | 'amber' | 'emerald' | 'rose';
  permission?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { can, isSuperUser } = usePermissions();
  const { data: dashboardData } = useAdminDashboard();
  const { data: notifications } = useAdminNotifications();

  const unreadNotifs = (notifications || []).filter((n) => !n.is_read).length;
  const pendingOrders = dashboardData?.status_distribution?.pending || 0;
  const lowStock = dashboardData?.kpis?.low_stock_variants || 0;

  const navigation: NavGroup[] = [
    {
      label: 'Intelligence',
      items: [
        {
          title: 'Command Overview',
          href: '/admin',
          icon: LayoutDashboard,
          permission: 'analytics.view',
        },
        {
          title: 'Deep Analytics',
          href: '/admin/analytics',
          icon: BarChart3,
          permission: 'analytics.view',
        },
      ],
    },
    {
      label: 'Commerce & Atelier',
      items: [
        {
          title: 'Order Dispatch',
          href: '/admin/orders',
          icon: ShoppingBag,
          badge: pendingOrders > 0 ? `${pendingOrders} Pending` : undefined,
          badgeVariant: 'cyan',
          permission: 'orders.view',
        },
        {
          title: 'Artifacts & Catalog',
          href: '/admin/products',
          icon: Package,
          permission: 'products.view',
        },
        {
          title: 'Inventory Reserve',
          href: '/admin/inventory',
          icon: Boxes,
          badge: lowStock > 0 ? `${lowStock} Low` : undefined,
          badgeVariant: 'amber',
          permission: 'inventory.view',
        },
        {
          title: 'Client Directory',
          href: '/admin/customers',
          icon: Users,
          permission: 'customers.view',
        },
        {
          title: 'Payment Gateway',
          href: '/admin/payments',
          icon: CreditCard,
          permission: 'payments.view',
        },
      ],
    },
    {
      label: 'Governance',
      items: [
        {
          title: 'Reviews & Q&A',
          href: '/admin/reviews',
          icon: MessageSquare,
          permission: 'reviews.view',
        },
        {
          title: 'Audit Trail',
          href: '/admin/activity',
          icon: Activity,
          permission: 'audit.view',
        },
        {
          title: 'System Settings',
          href: '/admin/settings',
          icon: Settings,
          permission: 'settings.manage',
        },
        {
          title: 'Admin Clearance',
          href: '/admin/profile',
          icon: UserCheck,
        },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        'relative bg-bg-elevated/95 dark:bg-[#070C18]/95 backdrop-blur-xl border-r border-border-subtle dark:border-slate-800/80 flex flex-col justify-between transition-all duration-300 z-30 select-none shrink-0 shadow-lg',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Top: Brand Header */}
      <div>
        <div className="h-16 flex items-center justify-between px-5 border-b border-border-subtle dark:border-slate-800/80">
          <Link
            href="/admin"
            className={cn('flex items-center gap-3 transition-opacity overflow-hidden', isCollapsed && 'justify-center w-full')}
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 dark:from-cyan-400 dark:to-indigo-500 flex items-center justify-center text-white dark:text-slate-950 font-mono font-black text-sm shadow-[0_0_15px_rgba(0,245,212,0.3)] shrink-0">
              PX
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-display font-bold text-sm tracking-wider text-fg-primary dark:text-white uppercase">
                  Control
                </span>
                <span className="text-[10px] font-mono tracking-widest text-cyan-600 dark:text-cyan-400 font-semibold uppercase -mt-0.5">
                  Center
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation Items */}
        <div className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-8rem)] custom-scrollbar">
          {navigation.map((group, groupIdx) => {
            const visibleItems = group.items.filter(
              (item) => !item.permission || can(item.permission)
            );

            if (visibleItems.length === 0) return null;

            return (
              <div key={groupIdx} className="space-y-1">
                {!isCollapsed && (
                  <div className="px-3 py-1 text-[10px] font-mono font-bold tracking-widest text-fg-muted dark:text-slate-400 uppercase">
                    {group.label}
                  </div>
                )}
                {visibleItems.map((item) => {
                  const isActive =
                    item.href === '/admin'
                      ? pathname === '/admin'
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={isCollapsed ? item.title : undefined}
                      className={cn(
                        'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all relative',
                        isActive
                          ? 'bg-cyan-500/10 dark:bg-cyan-400/10 text-cyan-600 dark:text-cyan-300 font-semibold shadow-sm'
                          : 'text-fg-secondary dark:text-slate-400 hover:text-fg-primary dark:hover:text-slate-100 hover:bg-bg-secondary dark:hover:bg-slate-800/60',
                        isCollapsed && 'justify-center px-0'
                      )}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-cyan-500 dark:bg-cyan-400 rounded-r" />
                      )}
                      <item.icon
                        className={cn(
                          'w-4 h-4 shrink-0 transition-transform group-hover:scale-110',
                          isActive ? 'text-cyan-600 dark:text-cyan-400' : 'text-fg-muted dark:text-slate-400'
                        )}
                      />
                      {!isCollapsed && <span className="truncate">{item.title}</span>}

                      {!isCollapsed && item.badge && (
                        <span
                          className={cn(
                            'ms-auto px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wide uppercase',
                            item.badgeVariant === 'cyan' && 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30',
                            item.badgeVariant === 'amber' && 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30',
                            item.badgeVariant === 'emerald' && 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30',
                            item.badgeVariant === 'rose' && 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom: Collapse Button */}
      <div className="p-3 border-t border-border-subtle dark:border-slate-800/80">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-fg-secondary dark:text-slate-400 hover:text-fg-primary dark:hover:text-white hover:bg-bg-secondary dark:hover:bg-slate-800/60 transition-colors text-xs cursor-pointer"
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <>
              <ChevronLeft className="w-4 h-4" />
              <span className="font-mono text-[11px]">Collapse Console</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
