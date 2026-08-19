'use client';

import React, { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        retry: (failureCount, error: any) => {
          // Do not retry client auth/validation errors
          const status = error?.response?.status;
          if (status === 400 || status === 401 || status === 403 || status === 404) {
            return false;
          }
          return failureCount < 2;
        },
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

function StoreInitializer() {
  const initializeAuth = useAuthStore((s) => s.initializeAuth);
  const setTheme = useUIStore((s) => s.setTheme);

  useEffect(() => {
    // Initialize Theme
    const savedTheme = (localStorage.getItem('pdx_theme') as any) || 'dark';
    setTheme(savedTheme);

    // Initialize Auth Session
    initializeAuth();
  }, [initializeAuth, setTheme]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <StoreInitializer />
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
      )}
    </QueryClientProvider>
  );
}
