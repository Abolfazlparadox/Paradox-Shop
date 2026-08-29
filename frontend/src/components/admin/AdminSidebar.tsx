'use client';

import React, { useState, useEffect } from 'react';
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
  Truck,
  X,
  Sparkles,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { usePermissions } from '@/hooks/usePermissions';
import { useAdminDashboard, useAdminNotifications } from '@/hooks/useAdminData';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeVariant?: 'amber' | 'emerald' | 'rose' | 'neutral';
  permission?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface AdminSidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function AdminSidebar({ isMobileOpen = false, onCloseMobile }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { can } = usePermissions();
  const { data: dashboardData } = useAdminDashboard();
  const { data: notifications } = useAdminNotifications();

  // Close mobile drawer on route change
  useEffect(() => {
    if (onCloseMobile) {
      onCloseMobile();
    }
  }, [pathname, onCloseMobile]);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileOpen && onCloseMobile) {
        onCloseMobile();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, onCloseMobile]);

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
          badgeVariant: 'amber',
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
          badgeVariant: 'rose',
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
        {
          title: 'Shipping & Delivery',
          href: '/admin/shipping',
          icon: Truck,
          permission: 'settings.view',
        },
      ],
    },
    {
      label: 'Campaigns & Vault',
      items: [
        {
          title: 'Promotion Rules',
          href: '/admin/promotions',
          icon: Sparkles,
          permission: 'promotions.view',
        },
        {
          title: 'Vouchers & Coupons',
          href: '/admin/promotions/coupons',
          icon: Tag,
          permission: 'promotions.view',
        },
        {
          title: 'Discount Telemetry',
          href: '/admin/promotions/reports',
          icon: BarChart3,
          permission: 'promotions.view',
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

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between">
      {/* Top: Brand Header */}
      <div>
        <div className="h-16 flex items-center justify-between px-5 border-b border-border-subtle">
          <Link
            href="/admin"
            className={cn(
              'flex items-center gap-3 transition-opacity overflow-hidden',
              isCollapsed && 'lg:justify-center lg:w-full'
            )}
          >
            <div className="w-8 h-8 rounded-xl bg-accent text-accent-fg border border-border-subtle flex items-center justify-center font-mono font-black text-sm shadow-subtle shrink-0">
              PX
            </div>
            {(!isCollapsed || isMobileOpen) && (
              <div className="flex flex-col text-left">
                <span className="font-display font-bold text-sm tracking-wider text-fg-primary uppercase">
                  Control
                </span>
                <span className="text-[10px] font-mono tracking-widest text-amber-600 dark:text-amber-400 font-semibold uppercase -mt-0.5">
                  Center
                </span>
              </div>
            )}
          </Link>

          {/* Close button on mobile drawer */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-fg-muted hover:text-fg-primary hover:bg-bg-secondary transition-colors"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
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
                {(!isCollapsed || isMobileOpen) && (
                  <div className="px-3 py-1 text-[10px] font-mono font-bold tracking-widest text-fg-muted uppercase text-left">
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
                      title={isCollapsed && !isMobileOpen ? item.title : undefined}
                      className={cn(
                        'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all relative text-left',
                        isActive
                          ? 'bg-accent text-accent-fg font-semibold shadow-subtle'
                          : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary',
                        isCollapsed && !isMobileOpen && 'lg:justify-center lg:px-0'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'w-4 h-4 shrink-0 transition-transform group-hover:scale-105',
                          isActive ? 'text-accent-fg' : 'text-fg-muted'
                        )}
                      />
                      {(!isCollapsed || isMobileOpen) && <span className="truncate">{item.title}</span>}

                      {(!isCollapsed || isMobileOpen) && item.badge && (
                        <span
                          className={cn(
                            'ms-auto px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold tracking-wide uppercase',
                            isActive
                              ? 'bg-accent-fg/20 text-accent-fg'
                              : item.badgeVariant === 'amber'
                              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              : item.badgeVariant === 'rose'
                              ? 'bg-status-error/15 text-status-error border border-status-error/20'
                              : 'bg-bg-secondary text-fg-muted border border-border-subtle'
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

      {/* Bottom: Desktop Collapse Toggle */}
      <div className="hidden lg:block p-3 border-t border-border-subtle">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary transition-colors text-xs cursor-pointer"
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
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar (>= lg) */}
      <aside
        className={cn(
          'hidden lg:flex relative bg-bg-elevated border-r border-border-subtle flex-col justify-between transition-all duration-300 z-30 select-none shrink-0 shadow-card',
          isCollapsed ? 'w-20' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Backdrop & Drawer (< lg) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            onClick={onCloseMobile}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />

          {/* Drawer Slide-in */}
          <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-bg-elevated border-r border-border-subtle shadow-2xl z-50 flex flex-col animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
