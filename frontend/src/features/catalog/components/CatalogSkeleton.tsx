import React from 'react';
import { Skeleton } from '@/components/ui/Skeleton';

export function CatalogSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col bg-bg-elevated border border-border-subtle rounded-lg overflow-hidden p-4 space-y-4">
          <Skeleton className="aspect-[4/5] w-full rounded-md" />
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-1/3" />
              <Skeleton className="h-3 w-1/4" />
            </div>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="pt-3 border-t border-border-subtle/50 flex justify-between items-center">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-16 rounded-sm" />
          </div>
        </div>
      ))}
    </div>
  );
}
