'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { notify } from '@/stores/notifications';
import { parseApiError } from '@/lib/api/error-handler';
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  ArrowRight,
  Sparkles,
  AlertCircle,
  Clock,
  Shield,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/admin';

  const { login, isLoading } = useAuthStore();

  const [email, setEmail] = useState('admin_staff@example.com');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [require2FA, setRequire2FA] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [lockedSeconds, setLockedSeconds] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockedSeconds > 0) return;

    setErrorMessage(null);

    // If 2FA requested but not filled
    if (require2FA && totpCode.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit authenticator code.');
      return;
    }

    try {
      await login({ email: email.trim(), password });
      const user = useAuthStore.getState().user;

      if (!user?.is_staff && !user?.is_superuser) {
        setErrorMessage('Access denied. Account is authenticated but lacks staff clearance.');
        notify.error('Access Denied', 'Your account does not possess administrative staff privileges.');
        return;
      }

      notify.success('Clearance Granted', `Welcome to Paradox Atelier Console, ${user.first_name || 'Director'}.`);
      router.replace(redirectUrl);
    } catch (err: any) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (newAttempts >= 5) {
        setLockedSeconds(60);
        const timer = setInterval(() => {
          setLockedSeconds((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              setAttempts(0);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }

      const parsed = parseApiError(err);
      setErrorMessage(parsed.message || 'Invalid administrative credentials provided.');
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary text-fg-primary flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden transition-colors">
      {/* Background Radial Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Identity Header */}
      <header className="w-full max-w-6xl mx-auto flex items-center justify-between z-10">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500 dark:bg-cyan-400 text-white dark:text-slate-950 font-mono font-bold text-xs flex items-center justify-center">
            PX
          </div>
          <span className="font-display font-bold text-xs tracking-wider text-fg-primary uppercase">
            Paradox <span className="text-cyan-600 dark:text-cyan-400">Atelier OS</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 text-xs font-mono text-fg-muted">
          <Shield className="w-3.5 h-3.5 text-status-success" />
          <span>Security Protocol v4.8</span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="w-full max-w-md mx-auto my-auto z-10 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl bg-bg-elevated border border-border-subtle backdrop-blur-2xl p-6 sm:p-8 shadow-2xl space-y-6 transition-colors"
        >
          {/* Card Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-300 text-[11px] font-mono uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3 text-cyan-500 dark:text-cyan-400" />
              Administrative Gateway
            </div>
            <h1 className="text-2xl font-bold font-display text-fg-primary tracking-tight">
              Command Console
            </h1>
            <p className="text-xs text-fg-secondary">
              Provide your Atelier staff cryptographic credentials to continue.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {lockedSeconds > 0 && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2 font-mono">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Rate limit enforced: Locked for {lockedSeconds}s</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-mono uppercase tracking-wider text-fg-secondary font-medium">
                Staff Identity / Email
              </label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="director@paradox.art"
                leftIcon={<Mail className="w-4 h-4 text-fg-muted" />}
                className="bg-bg-secondary border-border-subtle focus:border-cyan-500 text-xs text-fg-primary"
                disabled={isLoading || lockedSeconds > 0}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-mono uppercase tracking-wider text-fg-secondary font-medium">
                  Secret Key / Password
                </label>
              </div>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                leftIcon={<Lock className="w-4 h-4 text-fg-muted" />}
                className="bg-bg-secondary border-border-subtle focus:border-cyan-500 text-xs text-fg-primary"
                disabled={isLoading || lockedSeconds > 0}
              />
            </div>

            {/* 2FA Toggle & Input */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setRequire2FA(!require2FA)}
                className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{require2FA ? 'Disable 2FA Token field' : 'Use Hardware 2FA / TOTP Token'}</span>
              </button>

              <AnimatePresence>
                {require2FA && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="pt-2 space-y-1 overflow-hidden"
                  >
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-fg-muted">
                      6-Digit Authenticator Code
                    </label>
                    <Input
                      type="text"
                      maxLength={6}
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="849201"
                      className="bg-bg-secondary border-cyan-500/40 text-center tracking-[0.4em] font-mono text-sm text-cyan-600 dark:text-cyan-400"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button
              type="submit"
              size="lg"
              isLoading={isLoading}
              disabled={isLoading || lockedSeconds > 0 || !email.trim() || !password}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="w-full text-xs font-semibold bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-400 dark:hover:bg-cyan-500 text-white dark:text-slate-950 shadow-md h-10 mt-2"
            >
              {lockedSeconds > 0 ? `Wait ${lockedSeconds}s` : 'Authenticate Console'}
            </Button>
          </form>

          {/* Quick Demo Hint */}
          <div className="p-3 rounded-lg bg-bg-secondary border border-border-subtle text-[11px] font-mono text-fg-muted space-y-1">
            <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Staff Verification Gate</span>
            </div>
            <p className="text-[10px] text-fg-secondary">
              Only authenticated users with <code className="text-fg-primary font-bold">is_staff: true</code> can access administrative modules.
            </p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-fg-muted z-10">
        <div>Paradox Shop OS v2.4.0 — High Density Atelier</div>
        <Link href="/" className="hover:text-fg-primary transition-colors">
          Return to Public Storefront →
        </Link>
      </footer>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-primary" />}>
      <AdminLoginContent />
    </Suspense>
  );
}
