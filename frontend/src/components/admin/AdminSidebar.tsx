'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BarChart3,
  ShoppingBag,
  Package,
  Users,
  MessageSquare,
  Tag,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  badgeVariant?: 'cyan' | 'amber' | 'emerald' | 'rose';
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navigation: NavGroup[] = [
    {
      label: 'Intelligence',
      items: [
        {
          title: 'Command Overview',
          href: '/admin',
          icon: LayoutDashboard,
        },
        {
          title: 'Deep Analytics',
          href: '/admin/analytics',
          icon: BarChart3,
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
          badge: '4 Active',
          badgeVariant: 'cyan',
        },
        {
          title: 'Artifacts & Catalog',
          href: '/admin/products',
          icon: Package,
          badge: '4 Items',
          badgeVariant: 'emerald',
        },
        {
          title: 'Client Directory',
          href: '/admin/customers',
          icon: Users,
        },
      ],
    },
    {
      label: 'Governance',
      items: [
        {
          title: 'Q&A Moderation',
          href: '/admin/comments',
          icon: MessageSquare,
          badge: '1 New',
          badgeVariant: 'amber',
        },
        {
          title: 'Coupons & Vault',
          href: '/admin/marketing',
          icon: Tag,
        },
        {
          title: 'System Settings',
          href: '/admin/settings',
          icon: Settings,
        },
      ],
    },
  ];

  return (
    <aside
      className={cn(
        'relative h-screen sticky top-0 bg-bg-elevated dark:bg-[#070C18] border-r border-border-subtle dark:border-slate-800/80 flex flex-col justify-between transition-all duration-300 ease-out select-none z-30',
        isCollapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Top Identity Header */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-border-subtle dark:border-slate-800/80 bg-bg-secondary/40 dark:bg-slate-950/40">
          <Link
            href="/admin"
            className={cn('flex items-center gap-3 overflow-hidden transition-all', isCollapsed && 'justify-center w-full')}
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-500 dark:bg-cyan-400 text-white dark:text-slate-950 font-mono font-bold text-xs flex items-center justify-center tracking-tighter shrink-0 shadow-[0_0_15px_rgba(0,245,212,0.25)]">
              PX
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-display font-bold text-xs tracking-wider text-fg-primary dark:text-white uppercase flex items-center gap-1.5">
                  Paradox <span className="text-cyan-600 dark:text-cyan-400">Atelier</span>
                </span>
                <span className="text-[9px] font-mono text-fg-muted dark:text-slate-400 uppercase tracking-widest">
                  Command Center
                </span>
              </div>
            )}
          </Link>

          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1 rounded-md text-fg-muted hover:text-fg-primary dark:text-slate-400 dark:hover:text-white hover:bg-bg-secondary dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              title="Collapse Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Items Group */}
        <nav className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-140px)]">
          {navigation.map((group) => (
            <div key={group.label} className="space-y-1">
              {!isCollapsed ? (
                <h4 className="px-3 text-[10px] font-mono uppercase tracking-widest text-fg-muted dark:text-slate-400 font-semibold mb-2">
                  {group.label}
                </h4>
              ) : (
                <div className="h-[1px] bg-border-subtle dark:bg-slate-800/60 my-3 mx-2" />
              )}

              {group.items.map((item) => {
                const isActive =
                  item.href === '/admin'
                    ? pathname === '/admin'
                    : pathname.startsWith(item.href);

                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={isCollapsed ? item.title : undefined}
                    className={cn(
                      'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all relative',
                      isActive
                        ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-300 font-semibold border border-cyan-500/20 shadow-sm'
                        : 'text-fg-secondary dark:text-slate-400 hover:text-fg-primary dark:hover:text-slate-200 hover:bg-bg-secondary dark:hover:bg-slate-800/40 border border-transparent',
                      isCollapsed && 'justify-center px-2'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-4 h-4 shrink-0 transition-colors',
                        isActive ? 'text-cyan-500 dark:text-cyan-400' : 'text-fg-muted dark:text-slate-400 group-hover:text-fg-primary dark:group-hover:text-slate-300'
                      )}
                    />

                    {!isCollapsed && (
                      <span className="truncate flex-1 tracking-wide">{item.title}</span>
                    )}

                    {!isCollapsed && item.badge && (
                      <span
                        className={cn(
                          'text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full',
                          item.badgeVariant === 'cyan' && 'bg-cyan-500/10 dark:bg-cyan-400/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/20',
                          item.badgeVariant === 'emerald' && 'bg-emerald-500/10 dark:bg-emerald-400/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20',
                          item.badgeVariant === 'amber' && 'bg-amber-500/10 dark:bg-amber-400/20 text-amber-600 dark:text-amber-300 border border-amber-500/20',
                          item.badgeVariant === 'rose' && 'bg-rose-500/10 dark:bg-rose-400/20 text-rose-600 dark:text-rose-300 border border-rose-500/20'
                        )}
                      >
                        {item.badge}
                      </span>
                    )}

                    {/* Active Pip */}
                    {isActive && (
                      <span className="absolute start-0 top-2 bottom-2 w-1 bg-cyan-500 dark:bg-cyan-400 rounded-r-full shadow-[0_0_8px_#00F5D4]" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Footer System Status & Expand Toggle */}
      <div className="p-3 border-t border-border-subtle dark:border-slate-800/80 bg-bg-secondary/40 dark:bg-slate-950/60 space-y-2">
        {isCollapsed ? (
          <button
            onClick={() => setIsCollapsed(false)}
            className="w-full flex items-center justify-center p-2 rounded-lg text-fg-muted dark:text-slate-400 hover:text-fg-primary dark:hover:text-white hover:bg-bg-secondary dark:hover:bg-slate-800/60 transition-colors"
            title="Expand Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <div className="p-2.5 rounded-xl bg-bg-elevated dark:bg-slate-900/60 border border-border-subtle dark:border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-mono">
              <div className="flex items-center gap-1.5 text-status-success font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-status-success" />
                </span>
                <span>SYSTEM ONLINE</span>
              </div>
              <span className="text-fg-muted dark:text-slate-400">99.98%</span>
            </div>

            <div className="flex items-center justify-between text-[9px] font-mono text-fg-muted dark:text-slate-400 pt-0.5 border-t border-border-subtle/60 dark:border-slate-800/60">
              <span>OS v2.4.0</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-semibold">ATELIER ENGINE</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
