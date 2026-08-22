'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth';
import { parseApiError } from '@/lib/api/error-handler';
import { notify } from '@/stores/notifications';
import { Mail, Lock, AlertCircle, ArrowRight, ShieldCheck, Clock } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/';

  const { login, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [throttleSeconds, setThrottleSeconds] = useState<number | null>(null);

  // Active throttle countdown timer
  React.useEffect(() => {
    if (throttleSeconds === null || throttleSeconds <= 0) return;
    const interval = setInterval(() => {
      setThrottleSeconds((prev) => {
        if (prev === null || prev <= 1) {
          setErrorMessage(null);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [throttleSeconds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (throttleSeconds && throttleSeconds > 0) return;

    setErrorMessage(null);

    try {
      await login({ email, password });
      notify.success('Authentication Successful', 'Welcome back to Paradox Shop.');
      router.push(redirectUrl);
    } catch (err: any) {
      const parsed = parseApiError(err, 'login');
      setErrorMessage(parsed.message);
      if (parsed.isThrottled && parsed.retryAfterSeconds) {
        setThrottleSeconds(parsed.retryAfterSeconds);
      }
    }
  };

  return (
    <div className="w-full max-w-md bg-bg-elevated border border-border-subtle rounded-xl p-6 sm:p-8 shadow-card backdrop-blur-sm space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <Link href="/" className="inline-block focus-ring rounded-sm">
          <div className="w-10 h-10 rounded-sm bg-accent text-accent-fg font-mono font-bold text-xs flex items-center justify-center mx-auto tracking-tighter shadow-subtle">
            PX
          </div>
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold font-display text-fg-primary tracking-tight">
          Sign In to Paradox
        </h1>
        <p className="text-xs text-fg-secondary">
          Access your orders, addresses, and encrypted account settings.
        </p>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 rounded-md bg-status-error/10 border border-status-error/20 flex items-start gap-2.5 text-status-error text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-relaxed">{errorMessage}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          leftIcon={<Mail className="w-4 h-4 text-fg-muted" />}
          autoComplete="email"
          required
          className="text-xs h-10"
        />

        <div>
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            leftIcon={<Lock className="w-4 h-4 text-fg-muted" />}
            autoComplete="current-password"
            required
            className="text-xs h-10"
          />
          <div className="flex justify-end mt-1.5">
            <Link
              href="/forgot-password"
              className="text-[11px] font-mono text-fg-muted hover:text-accent transition-colors"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          isLoading={isLoading}
          disabled={isLoading || Boolean(throttleSeconds && throttleSeconds > 0)}
          className="w-full text-xs font-semibold mt-2"
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          {throttleSeconds && throttleSeconds > 0
            ? `Retry in ${throttleSeconds}s`
            : 'Sign In to Account'}
        </Button>
      </form>

      {/* Trust & Guarantee */}
      <div className="pt-4 border-t border-border-subtle flex items-center justify-between text-xs text-fg-muted">
        <span className="flex items-center gap-1.5 font-mono text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          JWT Encrypted
        </span>
        <Link
          href={`/register${redirectUrl !== '/' ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
          className="font-medium text-fg-primary hover:underline text-xs"
        >
          Create Account →
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4 bg-grid-pattern relative">
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />
      <Container size="sm" className="relative z-10 flex justify-center">
        <Suspense fallback={<div className="w-full max-w-md h-96 bg-bg-elevated rounded-xl animate-pulse" />}>
          <LoginForm />
        </Suspense>
      </Container>
    </main>
  );
}
