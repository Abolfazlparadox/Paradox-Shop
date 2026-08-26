'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { useUIStore } from '@/stores/ui';
import { useAuthStore } from '@/stores/auth';
import { useQuery } from '@tanstack/react-query';
import { cartApi, categoriesApi } from '@/lib/api/endpoints';
import { Cart, CategoryTreeNode } from '@/types/api';
import { SearchModal } from './SearchModal';
import { CartDrawer } from './CartDrawer';
import { AuthModal } from './AuthModal';
import { MobileNav } from './MobileNav';
import {
  ShoppingBag,
  Heart,
  Search,
  User,
  Moon,
  Sun,
  Menu,
  ChevronDown,
  Layers,
  LogOut,
  ShieldCheck,
  LayoutDashboard,
} from 'lucide-react';
import { useWishlist } from '@/features/wishlist/hooks/use-wishlist';

import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

export function Navbar() {
  const {
    theme,
    setTheme,
    toggleCartDrawer,
    setMobileMenuOpen,
    openModal,
  } = useUIStore();
  const { isAuthenticated, user, logout } = useAuthStore();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Dynamic scroll listener
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Global Keyboard shortcut for search (⌘K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch Cart data for live navbar counter
  const { data: cart } = useQuery<Cart>({
    queryKey: ['cart'],
    queryFn: cartApi.getCart,
    staleTime: 30000,
  });

  // Fetch Category taxonomy tree
  const { data: categoryTree } = useQuery<CategoryTreeNode[]>({
    queryKey: ['categoryTree'],
    queryFn: categoriesApi.getTree,
    staleTime: 5 * 60 * 1000,
  });

  const totalItems = cart?.items_count ?? cart?.total_items ?? 0;
  const { totalItemsCount: totalWishlistItems } = useWishlist();

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-40 w-full border-b transition-all duration-300 ease-out-cubic',
          isScrolled
            ? 'border-border-accent bg-bg-glass/95 backdrop-blur-md shadow-subtle py-0.5'
            : 'border-border-subtle bg-bg-glass/80 backdrop-blur-sm'
        )}
      >
        <Container size="lg">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* Left: Brand Mark & Identity */}
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2.5 focus-ring rounded-sm group">
                <div className="w-8 h-8 rounded-sm bg-accent text-accent-fg font-mono font-bold text-xs flex items-center justify-center tracking-tighter shadow-subtle transition-transform duration-200 group-hover:scale-105">
                  PX
                </div>
                <span className="font-display font-bold text-base tracking-tight text-fg-primary">
                  PARADOX
                </span>
              </Link>

              {/* Desktop Navigation Links */}
              <nav className="hidden md:flex items-center gap-5">
                <Link
                  href="/products"
                  className="text-xs font-medium text-fg-secondary hover:text-fg-primary transition-colors"
                >
                  All Products
                </Link>

                <Link
                  href="/track"
                  className="text-xs font-medium text-fg-secondary hover:text-fg-primary transition-colors"
                >
                  Track Order
                </Link>

                {/* Category Dropdown */}
                <div
                  className="relative"
                  onMouseEnter={() => setIsCategoryMenuOpen(true)}
                  onMouseLeave={() => setIsCategoryMenuOpen(false)}
                >
                  <button
                    className="inline-flex items-center gap-1 text-xs font-medium text-fg-secondary hover:text-fg-primary transition-colors focus-ring py-2"
                    aria-expanded={isCategoryMenuOpen}
                  >
                    <span>Categories</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  </button>

                  {isCategoryMenuOpen && (
                    <div className="absolute top-full start-0 w-64 p-2 bg-bg-elevated border border-border-subtle rounded-lg shadow-elevated z-50 flex flex-col gap-1">
                      <Link
                        href="/products"
                        onClick={() => setIsCategoryMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-fg-primary hover:bg-bg-secondary rounded-md transition-colors"
                      >
                        <Layers className="w-4 h-4 text-fg-muted" />
                        <span>All Collections</span>
                      </Link>

                      {categoryTree?.map((cat) => (
                        <Link
                          key={cat.id}
                          href={`/products?category=${cat.slug}`}
                          onClick={() => setIsCategoryMenuOpen(false)}
                          className="flex items-center justify-between px-3 py-2 text-xs font-medium text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary rounded-md transition-colors"
                        >
                          <span>{cat.name}</span>
                          {cat.children && cat.children.length > 0 && (
                            <span className="text-[10px] font-mono text-fg-muted">
                              {cat.children.length}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </nav>
            </div>

            {/* Right: Search, Cart, Auth & Theme Controls */}
            <div className="flex items-center gap-2.5">
              {/* Search Command Trigger */}
              <button
                onClick={() => setIsSearchOpen(true)}
                className="hidden sm:inline-flex items-center gap-3 px-3 py-1.5 h-9 bg-bg-secondary hover:bg-border-subtle text-fg-muted hover:text-fg-secondary border border-border-subtle rounded-md text-xs font-mono transition-colors focus-ring"
                aria-label="Search catalog"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="pe-4">Search...</span>
                <kbd className="px-1.5 py-0.5 text-[10px] bg-bg-elevated border border-border-accent rounded text-fg-muted">
                  ⌘K
                </kbd>
              </button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search catalog"
                className="sm:hidden h-9 w-9"
              >
                <Search className="w-4 h-4" />
              </Button>

              {/* Theme Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                aria-label="Toggle theme"
                className="h-9 w-9"
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>

              {/* Wishlist Link with Live Counter */}
              <Link
                href="/wishlist"
                data-cursor="action"
                className="relative inline-flex items-center justify-center h-9 px-3 rounded-md bg-bg-secondary hover:bg-border-subtle text-fg-primary border border-border-subtle transition-colors focus-ring cursor-pointer"
                aria-label={`Wishlist with ${totalWishlistItems} saved items`}
              >
                <Heart className="w-4 h-4" />
                <AnimatePresence mode="wait">
                  {totalWishlistItems > 0 && (
                    <motion.span
                      key={totalWishlistItems}
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      className="ms-1.5 text-xs font-mono font-semibold text-rose-500"
                    >
                      {totalWishlistItems}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>

              {/* Cart Drawer Trigger with Authoritative Counter */}
              <button
                onClick={toggleCartDrawer}
                data-cursor="action"
                className="relative inline-flex items-center justify-center h-9 px-3 rounded-md bg-bg-secondary hover:bg-border-subtle text-fg-primary border border-border-subtle transition-colors focus-ring cursor-pointer"
                aria-label={`Cart with ${totalItems} items`}
              >
                <ShoppingBag className="w-4 h-4" />
                <AnimatePresence mode="wait">
                  {totalItems > 0 && (
                    <motion.span
                      key={totalItems}
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.6, opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      className="ms-1.5 text-xs font-mono font-semibold text-accent"
                    >
                      {totalItems}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>

              {/* User Account Button / Dropdown */}
              {isAuthenticated ? (
                <div
                  className="relative hidden sm:block"
                  onMouseEnter={() => setIsUserMenuOpen(true)}
                  onMouseLeave={() => setIsUserMenuOpen(false)}
                >
                  <button
                    className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-bg-secondary hover:bg-border-subtle text-fg-primary border border-border-subtle text-xs font-medium focus-ring"
                    aria-expanded={isUserMenuOpen}
                  >
                    <User className="w-3.5 h-3.5 text-fg-muted" />
                    <span className="max-w-[100px] truncate font-display">
                      {user?.first_name || 'Account'}
                    </span>
                    <ChevronDown className="w-3 h-3 text-fg-muted" />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute top-full end-0 w-52 p-2 bg-bg-elevated border border-border-subtle rounded-lg shadow-elevated z-50 flex flex-col gap-1">
                      <div className="px-3 py-2 bg-bg-secondary/50 rounded-md mb-1">
                        <div className="text-xs font-semibold text-fg-primary font-display truncate">
                          {user?.first_name ? `${user.first_name} ${user.last_name || ''}` : user?.email}
                        </div>
                        <div className="text-[10px] font-mono text-fg-muted truncate">{user?.email}</div>
                      </div>

                      {(user?.is_staff || user?.is_superuser) && (
                        <Link
                          href="/admin"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-accent hover:bg-accent/10 border border-accent/20 rounded-md transition-colors shadow-sm mb-1"
                        >
                          <div className="flex items-center gap-2">
                            <LayoutDashboard className="w-3.5 h-3.5 text-accent" />
                            <span>Admin Console</span>
                          </div>
                          <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-accent text-accent-fg">
                            Staff
                          </span>
                        </Link>
                      )}

                      <Link
                        href="/dashboard/orders"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-fg-primary hover:bg-bg-secondary rounded-md transition-colors"
                      >
                        <ShoppingBag className="w-3.5 h-3.5 text-fg-muted" />
                        <span>Orders</span>
                      </Link>

                      <Link
                        href="/dashboard/wishlist"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-fg-primary hover:bg-bg-secondary rounded-md transition-colors"
                      >
                        <Heart className="w-3.5 h-3.5 text-fg-muted" />
                        <span>Wishlist & Saved</span>
                      </Link>

                      <Link
                        href="/dashboard/addresses"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-fg-primary hover:bg-bg-secondary rounded-md transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-fg-muted" />
                        <span>Addresses</span>
                      </Link>

                      <button
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          logout();
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-status-error hover:bg-status-error/10 rounded-md transition-colors w-full text-start"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => openModal('auth')}
                  className="hidden sm:inline-flex text-xs h-9"
                  leftIcon={<User className="w-3.5 h-3.5" />}
                >
                  Sign In
                </Button>
              )}

              {/* Mobile Navigation Toggle */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open mobile navigation menu"
                className="md:hidden h-9 w-9"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </Container>
      </header>

      {/* Global Modals & Slide-Over Drawers */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <CartDrawer />
      <AuthModal />
      <MobileNav
        categories={categoryTree}
        onOpenSearch={() => setIsSearchOpen(true)}
      />
    </>
  );
}
