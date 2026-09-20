import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Container } from '@/components/ui/Container';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { categoriesApi, productsApi } from '@/lib/api/endpoints';
import { Compass, Layers, ShoppingBag, ShieldCheck, MapPin } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Visual Sitemap — Navigation Index',
  description: 'Complete visual taxonomy and sitemap directory for Paradox Shop.',
};

export default async function SitemapPage() {
  let categories: any[] = [];
  let products: any[] = [];

  try {
    const [treeRes, prodRes] = await Promise.all([
      categoriesApi.getTree(),
      productsApi.getList({ page_size: 24 }),
    ]);
    categories = treeRes || [];
    products = prodRes.results || [];
  } catch {
    // Graceful fallback
  }

  return (
    <main className="py-12 sm:py-20 bg-bg-primary min-h-screen">
      <Container size="lg" className="space-y-12">
        {/* Header */}
        <div className="space-y-3 pb-8 border-b border-border-subtle">
          <div className="flex items-center gap-2 text-xs font-mono text-fg-muted">
            <Compass className="w-3.5 h-3.5" />
            <span>NAVIGATION DIRECTORY</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold font-display text-fg-primary tracking-tight">
            Platform Sitemap
          </h1>
          <p className="text-sm text-fg-secondary max-w-xl">
            Explore the complete taxonomy, discipline hierarchies, and indexable public artifacts across the Paradox commerce platform.
          </p>
        </div>

        {/* Directory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Column 1: Core Navigation & Disciplines */}
          <ScrollReveal variant="fade-up" delay={0.05} className="space-y-6">
            <div className="bg-bg-elevated border border-border-subtle rounded-xl p-6 shadow-card space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-fg-primary font-semibold uppercase tracking-wider pb-2 border-b border-border-subtle">
                <Layers className="w-4 h-4 text-fg-muted" />
                <span>Primary Portals</span>
              </div>
              <ul className="space-y-2.5 text-xs font-mono">
                <li>
                  <Link href="/" className="text-fg-secondary hover:text-accent transition-colors">
                    / — Home / Mission Thesis
                  </Link>
                </li>
                <li>
                  <Link href="/products" className="text-fg-secondary hover:text-accent transition-colors">
                    /products — Full Artifact Catalog
                  </Link>
                </li>
                <li>
                  <Link href="/products?is_featured=true" className="text-fg-secondary hover:text-accent transition-colors">
                    /products?is_featured=true — Curated Selection
                  </Link>
                </li>
                <li>
                  <Link href="/cart" className="text-fg-secondary hover:text-accent transition-colors">
                    /cart — Shopping Bag & Review
                  </Link>
                </li>
                <li>
                  <Link href="/checkout" className="text-fg-secondary hover:text-accent transition-colors">
                    /checkout — Secure Order Processing
                  </Link>
                </li>
              </ul>
            </div>

            <div className="bg-bg-elevated border border-border-subtle rounded-xl p-6 shadow-card space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-fg-primary font-semibold uppercase tracking-wider pb-2 border-b border-border-subtle">
                <MapPin className="w-4 h-4 text-fg-muted" />
                <span>Discipline Taxonomy</span>
              </div>
              <ul className="space-y-2.5 text-xs font-mono">
                {categories.map((cat) => (
                  <li key={cat.id}>
                    <Link
                      href={`/products?category=${cat.slug}`}
                      className="text-fg-secondary hover:text-accent transition-colors"
                    >
                      /products?category={cat.slug} — {cat.name}
                    </Link>
                    {cat.children && cat.children.length > 0 && (
                      <ul className="ps-4 mt-1.5 space-y-1 text-fg-muted text-[11px]">
                        {cat.children.map((sub: any) => (
                          <li key={sub.id}>
                            <Link
                              href={`/products?category=${sub.slug}`}
                              className="hover:text-fg-primary transition-colors"
                            >
                              ↳ {sub.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>

          {/* Column 2: Active Artifacts Index */}
          <ScrollReveal variant="fade-up" delay={0.1} className="md:col-span-2 space-y-6">
            <div className="bg-bg-elevated border border-border-subtle rounded-xl p-6 shadow-card space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-fg-primary font-semibold uppercase tracking-wider pb-2 border-b border-border-subtle">
                <ShoppingBag className="w-4 h-4 text-fg-muted" />
                <span>Indexed Products & Engineering Artifacts</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                {products.map((prod) => (
                  <Link
                    key={prod.id}
                    href={`/products/${prod.slug}`}
                    className="p-2.5 bg-bg-secondary/40 hover:bg-bg-secondary border border-border-subtle/60 rounded-md transition-colors flex items-center justify-between group"
                  >
                    <span className="truncate group-hover:text-accent transition-colors">
                      {prod.name}
                    </span>
                    <span className="text-[10px] text-fg-muted uppercase shrink-0 ms-2">
                      {prod.category?.name}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="bg-bg-elevated border border-border-subtle rounded-xl p-6 shadow-card space-y-4">
              <div className="flex items-center gap-2 text-xs font-mono text-fg-primary font-semibold uppercase tracking-wider pb-2 border-b border-border-subtle">
                <ShieldCheck className="w-4 h-4 text-fg-muted" />
                <span>Account & Encrypted Portals</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs font-mono">
                <Link href="/login" className="text-fg-secondary hover:text-accent transition-colors">
                  /login — Account Authentication
                </Link>
                <Link href="/register" className="text-fg-secondary hover:text-accent transition-colors">
                  /register — Client Account Onboarding
                </Link>
                <Link href="/dashboard/orders" className="text-fg-secondary hover:text-accent transition-colors">
                  /dashboard/orders — Order Ledger
                </Link>
                <Link href="/dashboard/addresses" className="text-fg-secondary hover:text-accent transition-colors">
                  /dashboard/addresses — Address Registry
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </Container>
    </main>
  );
}
