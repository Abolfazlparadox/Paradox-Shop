import React from 'react';
import { Container } from '@/components/ui/Container';
import { Skeleton } from '@/components/ui/Skeleton';

export default function ProductLoading() {
  return (
    <main className="py-10 sm:py-16 bg-bg-primary">
      <Container size="lg" className="space-y-12">
        <Skeleton className="h-4 w-48" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-7 space-y-4">
            <Skeleton className="aspect-[4/5] w-full rounded-lg" />
            <div className="flex gap-3">
              <Skeleton className="w-16 h-16 rounded-md" />
              <Skeleton className="w-16 h-16 rounded-md" />
              <Skeleton className="w-16 h-16 rounded-md" />
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-20 w-full rounded-lg" />
            <div className="grid grid-cols-2 gap-3">
              <Skeleton className="h-16 rounded-md" />
              <Skeleton className="h-16 rounded-md" />
            </div>
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
        </div>
      </Container>
    </main>
  );
}
