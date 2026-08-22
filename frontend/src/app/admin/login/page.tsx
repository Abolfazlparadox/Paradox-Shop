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

      notify.success('Welcome, Director', `Authenticated as ${user.first_name || user.email}`);
      router.replace(redirectUrl);
    } catch (err: any) {
      setAttempts((prev) => prev + 1);

      if (attempts >= 4) {
        setLockedSeconds(30);
        const timer = setInterval(() => {
          setLockedSeconds((s) => {
            if (s <= 1) {
              clearInterval(timer);
              return 0;
            }
            return s - 1;
          });
        }, 1000);
      }

      const parsed = parseApiError(err, 'login');
      setErrorMessage(parsed.message || 'Invalid administrative credentials.');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#060913] text-slate-100 flex flex-col justify-between p-4 sm:p-8 relative overflow-hidden selection:bg-cyan-500 selection:text-black">
      {/* Background Decorative Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

      {/* Top Bar */}
      <header className="flex items-center justify-between w-full max-w-6xl mx-auto z-10">
        <Link href="/" className="flex items-center gap-2.5 group focus:outline-none">
          <div className="w-8 h-8 rounded-lg bg-cyan-400 text-slate-950 font-mono font-bold text-xs flex items-center justify-center tracking-tighter shadow-[0_0_20px_rgba(0,245,212,0.3)] group-hover:scale-105 transition-transform">
            PX
          </div>
          <span className="font-display font-bold text-sm tracking-widest text-white uppercase">
            Paradox <span className="text-cyan-400">Atelier</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span>Security Protocol v4.8</span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="w-full max-w-md mx-auto my-auto z-10 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl bg-slate-900/80 border border-slate-800/90 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl space-y-6"
        >
          {/* Card Header */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 text-cyan-300 text-[11px] font-mono uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              Administrative Gateway
            </div>
            <h1 className="text-2xl font-bold font-display text-white tracking-tight">
              Command Console
            </h1>
            <p className="text-xs text-slate-400">
              Provide your Atelier staff cryptographic credentials to continue.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {lockedSeconds > 0 && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center gap-2 font-mono">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Rate limit enforced: Locked for {lockedSeconds}s</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-medium">
                Staff Identity / Email
              </label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="director@paradox.art"
                leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
                className="bg-slate-950/60 border-slate-800 focus:border-cyan-400 text-xs text-white"
                disabled={isLoading || lockedSeconds > 0}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 font-medium">
                  Secret Key / Password
                </label>
              </div>
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                leftIcon={<Lock className="w-4 h-4 text-slate-400" />}
                className="bg-slate-950/60 border-slate-800 focus:border-cyan-400 text-xs text-white"
                disabled={isLoading || lockedSeconds > 0}
              />
            </div>

            {/* 2FA Toggle & Input */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setRequire2FA(!require2FA)}
                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer"
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
                    <label className="block text-[11px] font-mono uppercase tracking-wider text-slate-400">
                      6-Digit Authenticator Code
                    </label>
                    <Input
                      type="text"
                      maxLength={6}
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="849201"
                      className="bg-slate-950/60 border-cyan-500/40 text-center tracking-[0.4em] font-mono text-sm text-cyan-400"
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
              className="w-full text-xs font-semibold bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-[0_0_20px_rgba(0,245,212,0.25)] h-10 mt-2"
            >
              {lockedSeconds > 0 ? `Wait ${lockedSeconds}s` : 'Authenticate Console'}
            </Button>
          </form>

          {/* Quick Demo Hint */}
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-[11px] font-mono text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Staff Verification Gate</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Only authenticated users with <code className="text-white">is_staff: true</code> can access administrative modules.
            </p>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] font-mono text-slate-400 z-10">
        <div>Paradox Shop OS v2.4.0 — High Density Atelier</div>
        <div className="flex gap-4">
          <Link href="/" className="hover:text-cyan-400 transition-colors">
            Storefront
          </Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-cyan-400 transition-colors">
            Security Policy
          </Link>
        </div>
      </footer>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#060913] flex items-center justify-center text-cyan-400 font-mono text-xs">
          INITIALIZING GATEWAY...
        </div>
      }
    >
      <AdminLoginContent />
    </Suspense>
  );
}
