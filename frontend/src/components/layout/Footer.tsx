'use client';

import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { ScrollReveal } from '@/components/ui/ScrollReveal';
import { useQuery } from '@tanstack/react-query';
import { healthApi } from '@/lib/api/endpoints';
import { ShieldCheck, Terminal, Cpu } from 'lucide-react';

export function Footer() {
  const { data: health } = useQuery({
    queryKey: ['systemHealth'],
    queryFn: healthApi.check,
    staleTime: 60000,
  });

  const isHealthy = health?.status === 'ok' || health?.status === 'healthy';

  return (
    <footer className="border-t border-border-subtle bg-bg-secondary/40 transition-colors duration-200">
      <Container size="lg" className="py-12 sm:py-16">
        <ScrollReveal variant="fade-up">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            {/* Col 1: Brand Manifesto */}
            <div className="space-y-4 md:col-span-1">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-sm bg-accent text-accent-fg font-mono font-bold text-xs flex items-center justify-center tracking-tighter shadow-subtle">
                  PX
                </div>
                <span className="font-display font-bold text-sm tracking-tight text-fg-primary">
                  PARADOX SHOP
                </span>
              </div>

              <p className="text-xs text-fg-secondary leading-relaxed max-w-xs">
                Engineered luxury commerce platform. Precision design, architectural geometry, and curated artifacts.
              </p>

              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-bg-elevated border border-border-subtle text-[11px] font-mono text-fg-muted shadow-subtle">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isHealthy ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span>SYSTEM: {isHealthy ? 'ONLINE (REST API)' : 'CHECKING STATUS'}</span>
              </div>
            </div>

            {/* Col 2: Taxonomy & Collections */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-fg-primary font-semibold">
                Collections
              </h4>
              <ul className="space-y-2 text-xs text-fg-secondary">
                <li>
                  <Link href="/products" className="hover:text-fg-primary transition-colors">
                    All Artifacts
                  </Link>
                </li>
                <li>
                  <Link href="/products?is_featured=true" className="hover:text-fg-primary transition-colors">
                    Featured Artifacts
                  </Link>
                </li>
                <li>
                  <Link href="/products" className="hover:text-fg-primary transition-colors">
                    Hardware & Materials
                  </Link>
                </li>
                <li>
                  <Link href="/products" className="hover:text-fg-primary transition-colors">
                    Technical Lifestyle
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Client Services */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-fg-primary font-semibold">
                Client Care
              </h4>
              <ul className="space-y-2 text-xs text-fg-secondary">
                <li>
                  <Link href="/dashboard/orders" className="hover:text-fg-primary transition-colors">
                    Order Tracking
                  </Link>
                </li>
                <li>
                  <Link href="/dashboard/addresses" className="hover:text-fg-primary transition-colors">
                    Shipping Directory
                  </Link>
                </li>
                <li>
                  <span className="text-fg-muted flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    Verified Purchase Reviews
                  </span>
                </li>
              </ul>
            </div>

            {/* Col 4: Architecture & Engineering */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono uppercase tracking-wider text-fg-primary font-semibold flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-fg-muted" />
                Engine Architecture
              </h4>
              <div className="text-xs text-fg-muted space-y-1.5 font-mono">
                <div className="flex items-center justify-between py-1 border-b border-border-subtle/50">
                  <span>Frontend:</span>
                  <span className="text-fg-secondary font-medium">Next.js 14 App Router</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border-subtle/50">
                  <span>Backend:</span>
                  <span className="text-fg-secondary font-medium">Django 5 Modular Monolith</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-border-subtle/50">
                  <span>Contract:</span>
                  <span className="text-fg-secondary font-medium">OpenAPI 3.0.3</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between text-xs text-fg-muted font-mono gap-4">
            <div>
              PARADOX SHOP © 2026. IMPOSSIBLE MINIMALISM. ALL RIGHTS RESERVED.
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <Link href="/sitemap-page" className="hover:text-fg-primary transition-colors">
                SITEMAP
              </Link>
              <span>•</span>
              <Link href="/sitemap.xml" target="_blank" className="hover:text-fg-primary transition-colors">
                XML
              </Link>
              <span>•</span>
              <span>REST API v1</span>
              <span>•</span>
              <span>RIAL CURRENCY</span>
            </div>
          </div>
        </ScrollReveal>
      </Container>
    </footer>
  );
}
