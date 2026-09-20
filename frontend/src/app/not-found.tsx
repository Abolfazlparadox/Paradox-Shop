import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-[calc(100vh-12rem)] flex items-center justify-center py-20 px-4 bg-grid-pattern relative">
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />

      <Container size="sm" className="relative z-10 text-center space-y-6">
        {/* Monochromatic Penrose / Paradox Badge */}
        <div className="w-16 h-16 rounded-2xl bg-bg-elevated border border-border-accent flex items-center justify-center text-fg-primary mx-auto shadow-card">
          <span className="font-mono font-bold text-xl tracking-tighter">404</span>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-fg-muted font-semibold block">
            PARADOX ERROR — COORDINATE UNREACHABLE
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold font-display text-fg-primary tracking-tight">
            Artifact Not Located
          </h1>
          <p className="text-xs sm:text-sm text-fg-secondary max-w-md mx-auto leading-relaxed">
            The requested digital geometry does not exist in our catalog or has been archived. Verify your URL coordinates or explore our current curated releases.
          </p>
        </div>

        {/* Action CTAs */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/products" className="w-full sm:w-auto">
            <Button size="md" leftIcon={<Compass className="w-4 h-4" />} className="w-full text-xs font-semibold">
              Explore Catalog
            </Button>
          </Link>
          <Link href="/" className="w-full sm:w-auto">
            <Button variant="outline" size="md" leftIcon={<ArrowLeft className="w-4 h-4" />} className="w-full text-xs">
              Return Home
            </Button>
          </Link>
        </div>
      </Container>
    </main>
  );
}
