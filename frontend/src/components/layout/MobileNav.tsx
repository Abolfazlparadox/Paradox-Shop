'use client';

import React from 'react';
import Link from 'next/link';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { useUIStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';
import { CategoryTreeNode } from '@/types/api';
import {
  Layers,
  ShoppingBag,
  Heart,
  User,
  LogOut,
  Moon,
  Sun,
  ShieldCheck,
  Search,
  ExternalLink,
  Truck,
} from 'lucide-react';

export interface MobileNavProps {
  categories?: CategoryTreeNode[];
  onOpenSearch: () => void;
}

export function MobileNav({ categories = [], onOpenSearch }: MobileNavProps) {
  const { isMobileMenuOpen, setMobileMenuOpen, openModal, theme, setTheme } = useUIStore();
  const { isAuthenticated, user, logout } = useAuthStore();

  const handleClose = () => setMobileMenuOpen(false);

  return (
    <Drawer
      isOpen={isMobileMenuOpen}
      onClose={handleClose}
      title="Navigation"
      side="left"
    >
      <div className="flex flex-col h-full justify-between gap-6">
        {/* Top Search Button */}
        <div className="space-y-4">
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              handleClose();
              onOpenSearch();
            }}
            leftIcon={<Search className="w-4 h-4 text-fg-muted" />}
            className="w-full justify-start text-xs text-fg-secondary font-mono"
          >
            Search catalog (⌘K)...
          </Button>

          {/* Primary Navigation Links */}
          <nav className="flex flex-col space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-fg-muted px-2 mb-1">
              Store Collections
            </span>
            <Link
              href="/products"
              onClick={handleClose}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-fg-primary hover:bg-bg-secondary transition-colors"
            >
              <Layers className="w-4 h-4 text-fg-muted" />
              All Artifacts
            </Link>

            <Link
              href="/track"
              onClick={handleClose}
              className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary transition-colors"
            >
              <Truck className="w-4 h-4 text-fg-muted" />
              Track Shipment
            </Link>

            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?category=${cat.slug}`}
                onClick={handleClose}
                className="flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary transition-colors"
              >
                <span>{cat.name}</span>
                {cat.children && cat.children.length > 0 && (
                  <span className="text-[10px] font-mono text-fg-muted">
                    {cat.children.length}
                  </span>
                )}
              </Link>
            ))}
          </nav>

          {/* Account Section */}
          <div className="pt-4 border-t border-border-subtle flex flex-col space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-fg-muted px-2 mb-1">
              Account & Security
            </span>

            {isAuthenticated ? (
              <>
                <div className="px-3 py-2 bg-bg-secondary rounded-md mb-2">
                  <div className="text-xs font-semibold text-fg-primary font-display">
                    {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.email}
                  </div>
                  <div className="text-[10px] font-mono text-fg-muted truncate">{user?.email}</div>
                </div>

                <Link
                  href="/wishlist"
                  onClick={handleClose}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-fg-primary hover:bg-bg-secondary transition-colors"
                >
                  <Heart className="w-4 h-4 text-fg-muted" />
                  Wishlist & Saved
                </Link>

                <Link
                  href="/dashboard/orders"
                  onClick={handleClose}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-fg-primary hover:bg-bg-secondary transition-colors"
                >
                  <ShoppingBag className="w-4 h-4 text-fg-muted" />
                  My Orders
                </Link>

                <Link
                  href="/dashboard/addresses"
                  onClick={handleClose}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-fg-primary hover:bg-bg-secondary transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-fg-muted" />
                  Shipping Addresses
                </Link>

                <button
                  onClick={() => {
                    logout();
                    handleClose();
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-status-error hover:bg-status-error/10 transition-colors w-full text-start"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </>
            ) : (
              <div className="p-2 flex flex-col gap-2">
                <Button
                  size="md"
                  onClick={() => {
                    handleClose();
                    openModal('auth');
                  }}
                  leftIcon={<User className="w-4 h-4" />}
                  className="w-full text-xs"
                >
                  Sign In / Register
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Footer Settings */}
        <div className="pt-4 border-t border-border-subtle flex items-center justify-between">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="inline-flex items-center gap-2 text-xs font-mono text-fg-secondary hover:text-fg-primary"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <span className="text-[10px] font-mono text-fg-muted">
            PARADOX v1.0
          </span>
        </div>
      </div>
    </Drawer>
  );
}
