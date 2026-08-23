'use client';

import React from 'react';
import Link from 'next/link';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { AlertCircle, RotateCcw, ArrowLeft } from 'lucide-react';

export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="py-20 bg-bg-primary">
      <Container size="sm" className="text-center space-y-6">
        <div className="w-12 h-12 rounded-full bg-status-error/10 text-status-error flex items-center justify-center mx-auto border border-status-error/20">
          <AlertCircle className="w-6 h-6" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-bold font-display text-fg-primary">
            Unable to Retrieve Artifact
          </h1>
          <p className="text-xs text-fg-secondary max-w-md mx-auto">
            {error.message || 'An unexpected error occurred while loading this product specification.'}
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-4">
          <Button onClick={() => reset()} size="md" leftIcon={<RotateCcw className="w-4 h-4" />}>
            Try Again
          </Button>
          <Link href="/products">
            <Button variant="outline" size="md" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Return to Catalog
            </Button>
          </Link>
        </div>
      </Container>
    </main>
  );
}
