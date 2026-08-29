'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  LayoutDashboard,
  ShoppingBag,
  Package,
  Users,
  BarChart3,
  MessageSquare,
  Tag,
  Sparkles,
  Settings,
  Plus,
  ArrowRight,
  ExternalLink,
  Shield,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Actions' | 'Quick Links';
  icon: React.ReactNode;
  url?: string;
  action?: () => void;
  shortcut?: string;
}

export function CommandPalette({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: CommandItem[] = [
    {
      id: 'nav-dash',
      title: 'Analytics Dashboard',
      category: 'Navigation',
      icon: <LayoutDashboard className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />,
      url: '/admin',
      shortcut: 'G D',
    },
    {
      id: 'nav-orders',
      title: 'Manage Orders',
      category: 'Navigation',
      icon: <ShoppingBag className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />,
      url: '/admin/orders',
      shortcut: 'G O',
    },
    {
      id: 'nav-products',
      title: 'Catalog & Products',
      category: 'Navigation',
      icon: <Package className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />,
      url: '/admin/products',
      shortcut: 'G P',
    },
    {
      id: 'nav-cust',
      title: 'Customer Directory',
      category: 'Navigation',
      icon: <Users className="w-4 h-4 text-amber-500 dark:text-amber-400" />,
      url: '/admin/customers',
      shortcut: 'G C',
    },
    {
      id: 'nav-analytics',
      title: 'Deep Analytics Hub',
      category: 'Navigation',
      icon: <BarChart3 className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />,
      url: '/admin/analytics',
      shortcut: 'G A',
    },
    {
      id: 'nav-mod',
      title: 'Comments & Moderation Queue',
      category: 'Navigation',
      icon: <MessageSquare className="w-4 h-4 text-rose-500 dark:text-rose-400" />,
      url: '/admin/comments',
      shortcut: 'G M',
    },
    {
      id: 'nav-promotions',
      title: 'Promotion Rules & Campaigns',
      category: 'Navigation',
      icon: <Sparkles className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />,
      url: '/admin/promotions',
      shortcut: 'G R',
    },
    {
      id: 'nav-coupons',
      title: 'Vouchers & Coupon Vault',
      category: 'Navigation',
      icon: <Tag className="w-4 h-4 text-amber-500 dark:text-amber-400" />,
      url: '/admin/promotions/coupons',
      shortcut: 'G V',
    },
    {
      id: 'nav-promotions-reports',
      title: 'Discount Reports & Telemetry',
      category: 'Navigation',
      icon: <BarChart3 className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />,
      url: '/admin/promotions/reports',
    },
    {
      id: 'nav-inv',
      title: 'Inventory & Reserve Stock',
      category: 'Navigation',
      icon: <Package className="w-4 h-4 text-amber-500 dark:text-amber-400" />,
      url: '/admin/inventory',
      shortcut: 'G I',
    },
    {
      id: 'nav-payments',
      title: 'Payment Transactions & Gateway',
      category: 'Navigation',
      icon: <ShoppingBag className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />,
      url: '/admin/payments',
    },
    {
      id: 'nav-reviews',
      title: 'Reviews & Feedback Moderation',
      category: 'Navigation',
      icon: <MessageSquare className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />,
      url: '/admin/reviews',
      shortcut: 'G R',
    },
    {
      id: 'nav-act',
      title: 'Audit Logs & Activity Stream',
      category: 'Navigation',
      icon: <LayoutDashboard className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />,
      url: '/admin/activity',
    },
    {
      id: 'nav-set',
      title: 'Store & System Settings',
      category: 'Navigation',
      icon: <Settings className="w-4 h-4 text-slate-400" />,
      url: '/admin/settings',
      shortcut: 'G S',
    },
    {
      id: 'nav-prof',
      title: 'Admin Clearance & Profile',
      category: 'Navigation',
      icon: <Shield className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />,
      url: '/admin/profile',
    },
    {
      id: 'act-new-prod',
      title: 'Create New Atelier Product',
      category: 'Actions',
      icon: <Plus className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />,
      url: '/admin/products?action=new',
    },
    {
      id: 'link-store',
      title: 'Open Public Storefront',
      category: 'Quick Links',
      icon: <ExternalLink className="w-4 h-4 text-fg-muted dark:text-slate-400" />,
      url: '/',
    },
  ];


  const filtered = commands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = useCallback(
    (item: CommandItem) => {
      onClose();
      if (item.action) {
        item.action();
      } else if (item.url) {
        router.push(item.url);
      }
    },
    [onClose, router]
  );

  // Keydown event listener for Cmd+K and arrow keys
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          setQuery('');
          setSelectedIndex(0);
        }
      }

      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        handleSelect(filtered[selectedIndex]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose, filtered, selectedIndex, handleSelect]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 sm:pt-28 p-4 bg-black/60 dark:bg-black/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: -10 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="w-full max-w-2xl rounded-2xl bg-bg-elevated border border-border-subtle shadow-2xl overflow-hidden flex flex-col text-fg-primary"
      >
        {/* Search Bar Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-subtle bg-bg-secondary/40">
          <Search className="w-4 h-4 text-fg-muted shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search commands, navigate views, or trigger actions..."
            className="w-full bg-transparent text-sm text-fg-primary placeholder-fg-muted focus:outline-none font-sans"
          />
          <button
            onClick={onClose}
            className="text-fg-muted hover:text-fg-primary p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-border-subtle/40">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-xs text-fg-muted font-mono">
              No matching administrative commands or resources found.
            </div>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all ${
                  selectedIndex === idx
                    ? 'bg-accent text-accent-fg font-semibold shadow-subtle'
                    : 'text-fg-secondary hover:bg-bg-secondary border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-bg-secondary border border-border-subtle">
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-xs font-semibold font-display tracking-wide text-fg-primary">
                      {item.title}
                    </div>
                    <div className="text-[10px] font-mono text-fg-muted">
                      {item.category}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {item.shortcut && (
                    <span className="hidden sm:inline-block text-[10px] font-mono text-fg-muted px-1.5 py-0.5 rounded bg-bg-secondary border border-border-subtle">
                      {item.shortcut}
                    </span>
                  )}
                  <ArrowRight className="w-3.5 h-3.5 text-fg-muted opacity-60" />
                </div>
              </button>
            ))
          )}
        </div>

        {/* Palette Footer */}
        <div className="px-4 py-2.5 bg-bg-secondary/60 border-t border-border-subtle flex items-center justify-between text-[11px] font-mono text-fg-muted">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1 py-0.5 rounded bg-bg-elevated border border-border-subtle text-fg-secondary">↑↓</kbd> Navigate</span>
            <span><kbd className="px-1 py-0.5 rounded bg-bg-elevated border border-border-subtle text-fg-secondary">↵</kbd> Select</span>
            <span><kbd className="px-1 py-0.5 rounded bg-bg-elevated border border-border-subtle text-fg-secondary">ESC</kbd> Close</span>
          </div>
          <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
            <Shield className="w-3 h-3" />
            <span>Paradox Atelier OS</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
