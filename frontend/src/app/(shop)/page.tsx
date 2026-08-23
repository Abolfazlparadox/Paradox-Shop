'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProductCard } from '@/components/ui/ProductCard';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { MouseSpotlight } from '@/components/ui/MouseSpotlight';
import { SectionDivider } from '@/components/ui/SectionDivider';
import { useProducts } from '@/features/catalog/queries/useProducts';
import { useCategoryTree } from '@/features/catalog/queries/useCategoryTree';
import { useUIStore } from '@/stores/ui';
import { notify } from '@/stores/notifications';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cartApi } from '@/lib/api/endpoints';
import { ProductListItem } from '@/types/api';
import {
  ArrowRight,
  ShieldCheck,
  Cpu,
  Sparkles,
  Layers,
  Compass,
  Package,
} from 'lucide-react';

// Dynamically import Three.js Penrose Hero to keep critical initial JS bundle tiny
const PenroseHero3D = dynamic(
  () => import('@/components/3d/PenroseHero3D').then((mod) => mod.PenroseHero3D),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-72 sm:h-96 flex items-center justify-center">
        <div className="w-24 h-24 rounded-full border border-border-subtle flex items-center justify-center font-mono text-xs text-fg-muted animate-pulse">
          PX • 3D
        </div>
      </div>
    ),
  }
);

export default function HomePage() {
  const { toggleCartDrawer } = useUIStore();
  const queryClient = useQueryClient();

  // Real Featured Products
  const { data: featuredData, isLoading: isFeaturedLoading } = useProducts({
    is_featured: true,
    page_size: 3,
  });

  // Real Categories
  const { data: categoryTree } = useCategoryTree();

  const addToCartMutation = useMutation({
    mutationFn: (product: ProductListItem) =>
      cartApi.addItem({ product_id: product.id, quantity: 1 }),
    onSuccess: (_, product) => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      notify.success('Added to Bag', `${product.name} has been added to your shopping bag.`);
      toggleCartDrawer();
    },
    onError: (err) => {
      notify.error('Unable to add item to bag', err);
    },
  });

  const featuredProducts = featuredData?.results || [];

  return (
    <main className="min-h-screen bg-bg-primary">
      {/* 1. HERO SECTION: Impossible Minimalism Thesis */}
      <MouseSpotlight size={600} className="relative py-16 sm:py-24 border-b border-border-subtle overflow-hidden bg-grid-pattern">
        <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />

        <Container size="lg" className="relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Hero Typography & Intent */}
            <div className="lg:col-span-7 space-y-6">
              <ScrollReveal variant="fade-down" delay={0.1}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-bg-elevated border border-border-accent text-fg-secondary text-xs font-mono shadow-subtle">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  ENGINEERED LUXURY PLATFORM
                </div>
              </ScrollReveal>

              <ScrollReveal variant="fade-up" delay={0.2}>
                <h1 className="text-4xl sm:text-6xl font-bold font-display text-fg-primary tracking-tight leading-[1.05]">
                  Impossible <br />
                  <span className="text-fg-secondary font-normal">Minimalism.</span>
                </h1>
              </ScrollReveal>

              <ScrollReveal variant="fade-up" delay={0.3}>
                <p className="text-base sm:text-lg text-fg-secondary leading-relaxed max-w-xl">
                  Curated lifestyle artifacts, precision mechanical instruments, and architectural desktop monoliths
                  for modern technologists.
                </p>
              </ScrollReveal>

              <ScrollReveal variant="fade-up" delay={0.4}>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Link href="/products">
                    <Button size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                      Explore All Artifacts
                    </Button>
                  </Link>
                  <Link href="/products?is_featured=true">
                    <Button variant="secondary" size="lg" leftIcon={<Sparkles className="w-4 h-4" />}>
                      Curated Highlights
                    </Button>
                  </Link>
                </div>
              </ScrollReveal>
            </div>

            {/* Hero 3D Penrose Monolith Stage */}
            <div className="lg:col-span-5 flex items-center justify-center relative">
              <ScrollReveal variant="scale-up" delay={0.35} className="w-full max-w-md">
                <div className="bg-bg-elevated/40 border border-border-subtle/70 rounded-2xl p-4 backdrop-blur-sm shadow-card hover:border-border-accent transition-colors">
                  <PenroseHero3D />
                  <div className="text-center pt-2 border-t border-border-subtle/50 text-[11px] font-mono text-fg-muted">
                    NON-EUCLIDEAN SPATIAL GEOMETRY • GRADE 5
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </Container>
      </MouseSpotlight>

      {/* 2. FEATURED COLLECTION */}
      <section className="py-16 sm:py-24 border-b border-border-subtle">
        <Container size="lg" className="space-y-12">
          <ScrollReveal variant="fade-up">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-fg-muted mb-2">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>CURATED SELECTION</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold font-display text-fg-primary tracking-tight">
                  Featured Engineering Artifacts
                </h2>
              </div>

              <Link href="/products">
                <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  View All Catalog
                </Button>
              </Link>
            </div>
          </ScrollReveal>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {isFeaturedLoading &&
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-bg-elevated border border-border-subtle rounded-lg p-4 h-96 animate-pulse" />
              ))}

            {!isFeaturedLoading &&
              featuredProducts.map((product, idx) => (
                <ScrollReveal key={product.id} variant="fade-up" delay={idx * 0.1}>
                  <ProductCard
                    product={product}
                    priority={idx < 3}
                    onAddToCart={(p) => addToCartMutation.mutate(p)}
                  />
                </ScrollReveal>
              ))}
          </div>
        </Container>
      </section>

      {/* 3. CATEGORY DISCOVERY */}
      <section className="py-16 sm:py-24 border-b border-border-subtle bg-bg-secondary/30">
        <Container size="lg" className="space-y-12">
          <ScrollReveal variant="fade-up">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-fg-muted mb-2">
                <Compass className="w-3.5 h-3.5" />
                <span>TAXONOMY</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold font-display text-fg-primary tracking-tight">
                Explore by Discipline
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categoryTree?.map((cat, idx) => (
              <ScrollReveal key={cat.id} variant="fade-up" delay={idx * 0.08}>
                <Link
                  href={`/products?category=${cat.slug}`}
                  data-cursor="pointer"
                  className="group flex flex-col justify-between p-6 bg-bg-elevated border border-border-subtle rounded-lg hover:border-border-accent hover:shadow-card transition-all duration-300 h-full"
                >
                  <div className="space-y-2">
                    <span className="w-10 h-10 rounded-md bg-bg-secondary border border-border-subtle flex items-center justify-center text-fg-primary mb-4 font-mono text-xs font-bold group-hover:scale-105 group-hover:border-accent transition-all">
                      {cat.name.slice(0, 2).toUpperCase()}
                    </span>
                    <h3 className="text-base font-semibold font-display text-fg-primary group-hover:text-accent transition-colors">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-fg-secondary line-clamp-2">
                      Curated collection under {cat.name} engineering taxonomy.
                    </p>
                  </div>

                  <div className="pt-4 mt-6 border-t border-border-subtle/50 flex items-center justify-between text-xs font-mono text-fg-muted">
                    <span>Browse Collection</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform text-fg-muted group-hover:text-fg-primary" />
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </Container>
      </section>

      {/* 4. EDITORIAL / MATERIAL STORY */}
      <section className="py-16 sm:py-24 border-b border-border-subtle">
        <Container size="lg">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <ScrollReveal variant="fade-up">
                <div className="flex items-center gap-2 text-xs font-mono text-fg-muted">
                  <Layers className="w-3.5 h-3.5" />
                  <span>MATERIAL PHILOSOPHY</span>
                </div>

                <h2 className="text-3xl sm:text-4xl font-bold font-display text-fg-primary tracking-tight leading-tight mt-2">
                  Sub-Micron Machining. <br />
                  <span className="text-fg-secondary font-normal">Aerospace Metallurgy.</span>
                </h2>

                <p className="text-sm text-fg-secondary leading-relaxed mt-4">
                  Every artifact featured in the Paradox collection undergoes rigorous material selection.
                  From Grade 5 Titanium alloy turned on Swiss lathes to optical K9 crystal annealed over 120 hours,
                  each piece balances mechanical permanence with mathematical clarity.
                </p>

                <div className="grid grid-cols-2 gap-4 pt-4 font-mono text-xs">
                  <div className="p-3.5 bg-bg-secondary rounded-md border border-border-subtle">
                    <span className="text-fg-muted block text-[10px]">TOLERANCE</span>
                    <span className="font-semibold text-fg-primary mt-1 block">±0.005mm CNC</span>
                  </div>
                  <div className="p-3.5 bg-bg-secondary rounded-md border border-border-subtle">
                    <span className="text-fg-muted block text-[10px]">ALLOY</span>
                    <span className="font-semibold text-fg-primary mt-1 block">Ti-6Al-4V Grade 5</span>
                  </div>
                </div>
              </ScrollReveal>
            </div>

            <div className="lg:col-span-6">
              <ScrollReveal variant="scale-up" delay={0.2}>
                <div className="bg-bg-elevated border border-border-subtle rounded-2xl p-8 space-y-6 shadow-card hover:border-border-accent transition-colors">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-fg-primary font-semibold pb-2 border-b border-border-subtle">
                    Authenticity & Platform Guarantees
                  </h3>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-md bg-bg-secondary flex items-center justify-center text-emerald-400 shrink-0 border border-border-subtle">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold font-display text-fg-primary">
                          Verified Purchase Integrity
                        </h4>
                        <p className="text-xs text-fg-secondary mt-0.5">
                          Reviews are strictly reserved for buyers with delivered order status verified on-chain and in-database.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-md bg-bg-secondary flex items-center justify-center text-emerald-400 shrink-0 border border-border-subtle">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold font-display text-fg-primary">
                          Atomic Inventory Locking
                        </h4>
                        <p className="text-xs text-fg-secondary mt-0.5">
                          Row-level locks prevent overselling during checkout; prices are securely snapshotted in real-time.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-md bg-bg-secondary flex items-center justify-center text-emerald-400 shrink-0 border border-border-subtle">
                        <Package className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold font-display text-fg-primary">
                          Curated Dispatch
                        </h4>
                        <p className="text-xs text-fg-secondary mt-0.5">
                          Monolithic packaging with custom die-cut foam inserts for safe global courier delivery.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </Container>
      </section>
    </main>
  );
}
