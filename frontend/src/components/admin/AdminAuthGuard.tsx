'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, initializeAuth } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  // If we are on /admin/login, bypass the guard
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    let isMounted = true;

    async function checkAdminAccess() {
      if (isLoginPage) {
        if (isMounted) setIsChecking(false);
        return;
      }

      // If auth not yet initialized, wait or initialize
      if (isLoading) {
        await initializeAuth();
      }

      const currentUser = useAuthStore.getState().user;
      const currentAuth = useAuthStore.getState().isAuthenticated;

      if (!currentAuth || !currentUser) {
        router.replace(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      const isStaffOrSuper = Boolean(currentUser.is_staff || currentUser.is_superuser);
      if (!isStaffOrSuper) {
        if (isMounted) setIsChecking(false);
        return;
      }

      if (isMounted) setIsChecking(false);
    }

    checkAdminAccess();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user, isLoading, pathname, isLoginPage, router, initializeAuth]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  // Initial loading spinner
  if (isLoading || isChecking) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center text-fg-secondary space-y-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-xl bg-bg-elevated border border-border-subtle flex items-center justify-center text-cyan-500 dark:text-cyan-400 font-mono font-bold text-sm shadow-[0_0_25px_rgba(0,245,212,0.2)]">
            PX
          </div>
          <Loader2 className="w-6 h-6 animate-spin text-cyan-500 dark:text-cyan-400 absolute -top-1 -right-1" />
        </div>
        <div className="text-xs font-mono tracking-wider text-fg-muted uppercase">
          Verifying Atelier Access Key...
        </div>
      </div>
    );
  }

  // Unauthorized screen for non-staff logged-in accounts
  const isStaffOrSuper = Boolean(user?.is_staff || user?.is_superuser);
  if (!isStaffOrSuper) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-8 rounded-2xl bg-bg-elevated border border-rose-500/30 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(244,63,94,0.15)]">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold font-display text-fg-primary tracking-tight">
              Access Restricted (403)
            </h2>
            <p className="text-xs text-fg-secondary leading-relaxed">
              The account <span className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold">{user?.email}</span> does not possess administrative staff clearance for the Paradox Atelier Console.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/')}
              className="text-xs border-border-subtle hover:bg-bg-secondary text-fg-primary"
            >
              Return to Storefront
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => router.push('/admin/login')}
              className="text-xs bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-400 dark:hover:bg-cyan-500 text-white dark:text-slate-950 font-semibold"
            >
              Switch Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
