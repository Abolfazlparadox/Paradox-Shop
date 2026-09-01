'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { useAuthStore } from '@/stores/auth';
import {
  LayoutDashboard,
  Package,
  Heart,
  MapPin,
  User,
  LogOut,
  ShieldCheck,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/orders', label: 'Orders & Tracking', icon: Package },
  { href: '/dashboard/reviews', label: 'My Reviews & Q&A', icon: Star },
  { href: '/dashboard/wishlist', label: 'Wishlist & Saved', icon: Heart },
  { href: '/dashboard/addresses', label: 'Delivery Addresses', icon: MapPin },
  { href: '/dashboard/profile', label: 'Profile & Security', icon: User },
];


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, isLoading, user, logout } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading) {
    return (
      <main className="py-10 sm:py-16 bg-bg-primary min-h-screen">
        <Container size="lg" className="space-y-8">
          <div className="h-10 w-48 bg-bg-elevated rounded-md animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-3 h-80 bg-bg-elevated rounded-xl animate-pulse" />
            <div className="lg:col-span-9 h-96 bg-bg-elevated rounded-xl animate-pulse" />
          </div>
        </Container>
      </main>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <main className="py-8 sm:py-16 bg-bg-primary min-h-screen transition-colors">
      <Container size="lg" className="space-y-6 sm:space-y-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 sm:pb-6 border-b border-border-subtle">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-fg-muted mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>CLIENT ACCOUNT DASHBOARD</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-bold font-display text-fg-primary tracking-tight">
              {user?.first_name ? `Welcome back, ${user.first_name}` : 'Client Dashboard'}
            </h1>
          </div>

          <div className="text-xs font-mono text-fg-muted">
            AUTHENTICATED: <span className="text-fg-primary font-semibold">{user?.email}</span>
          </div>
        </div>

        {/* Mobile Horizontal Navigation Tabs (< lg) */}
        <div className="lg:hidden">
          <nav
            aria-label="Dashboard mobile navigation"
            className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 border',
                    isActive
                      ? 'bg-accent text-accent-fg border-accent font-semibold shadow-subtle'
                      : 'bg-bg-elevated text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary border-border-subtle'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <button
              onClick={() => logout()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap text-status-error bg-bg-elevated hover:bg-status-error/10 border border-status-error/20 transition-all shrink-0 cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Sign Out</span>
            </button>
          </nav>
        </div>

        {/* Desktop Grid Layout: Sidebar + Main Content (>= lg) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Desktop Sidebar (Hidden on mobile) */}
          <aside className="hidden lg:block lg:col-span-3 bg-bg-elevated border border-border-subtle rounded-2xl p-4 space-y-1.5 shadow-card sticky top-24">
            <span className="text-[10px] font-mono uppercase tracking-wider text-fg-muted px-3 py-1 block">
              Navigation Menu
            </span>

            {NAV_ITEMS.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname.startsWith(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all focus-ring',
                    isActive
                      ? 'bg-accent text-accent-fg font-semibold shadow-subtle'
                      : 'text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            <div className="pt-2 mt-2 border-t border-border-subtle">
              <button
                onClick={() => logout()}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-status-error hover:bg-status-error/10 transition-colors text-start focus-ring cursor-pointer"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="lg:col-span-9 w-full min-w-0">{children}</div>
        </div>
      </Container>
    </main>
  );
}
