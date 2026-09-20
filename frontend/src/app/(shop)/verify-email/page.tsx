'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/lib/api/endpoints';
import { parseApiError } from '@/lib/api/error-handler';
import { notify } from '@/stores/notifications';
import { ShieldCheck, Mail, AlertCircle, ArrowRight, RotateCcw, Clock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';
  const redirectUrl = searchParams.get('redirect') || '/dashboard';

  const { verifyEmail, isLoading } = useAuthStore();

  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  // Timers: 120s TTL for OTP expiration, 60s cooldown for resend button
  const [ttlSeconds, setTtlSeconds] = useState<number>(120);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(60);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [emailParam]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Countdown timers
  useEffect(() => {
    const timer = setInterval(() => {
      setTtlSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    // Take only the last entered digit
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setErrorMessage(null);

    // Auto-advance focus to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').trim();
    if (!/^\d{6}$/.test(pastedData)) return;

    const digits = pastedData.split('');
    setOtp(digits);
    setErrorMessage(null);
    inputRefs.current[5]?.focus();
  };

  const fullOtp = otp.join('');
  const isOtpComplete = fullOtp.length === 6;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email) {
      setErrorMessage('Please provide the account email address.');
      return;
    }
    if (!isOtpComplete) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    setErrorMessage(null);

    try {
      await verifyEmail({ email, otp: fullOtp });
      notify.success('Account Activated', 'Your email has been verified and your account is active.');
      router.push(redirectUrl);
    } catch (err: any) {
      const parsed = parseApiError(err, 'verify-email');
      setErrorMessage(parsed.message || 'Invalid or expired verification code.');
    }
  };

  const handleResend = async () => {
    if (cooldownSeconds > 0 || isResending || !email) return;

    setIsResending(true);
    setErrorMessage(null);

    try {
      const res = await authApi.resendOtp({ email, type: 'verify' });
      setTtlSeconds(res.ttl || 120);
      setCooldownSeconds(res.cooldown || 60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      notify.success('Code Resent', 'A fresh 6-digit verification code has been dispatched to your email.');
    } catch (err: any) {
      const parsed = parseApiError(err, 'resend-otp');
      setErrorMessage(parsed.message || 'Failed to resend verification code.');
    } finally {
      setIsResending(false);
    }
  };

  // Format mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
          Verify Email Address
        </h1>
        <p className="text-xs text-fg-secondary">
          Enter the 6-digit security token dispatched to{' '}
          <span className="font-mono text-fg-primary font-semibold">{email || 'your email'}</span>
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
      <form onSubmit={handleSubmit} className="space-y-6">
        {!emailParam && (
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-fg-secondary mb-1.5 font-medium">
              Account Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              className="w-full h-10 px-3 text-xs font-mono rounded-md bg-bg-secondary text-fg-primary border border-border-subtle focus:border-accent focus:outline-none transition-colors"
            />
          </div>
        )}

        {/* 6-Digit Segmented Input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase tracking-wider text-fg-secondary font-medium">
              Security Token (OTP)
            </span>
            <span className={cn('text-xs font-mono font-semibold flex items-center gap-1', ttlSeconds > 20 ? 'text-fg-muted' : 'text-status-error')}>
              <Clock className="w-3 h-3" />
              {ttlSeconds > 0 ? formatTime(ttlSeconds) : 'Expired'}
            </span>
          </div>

          <div className="grid grid-cols-6 gap-2" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="\d*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-full h-12 text-center text-lg font-mono font-bold rounded-md bg-bg-secondary text-fg-primary border border-border-subtle focus:border-accent focus:shadow-glow focus:outline-none transition-all"
                disabled={isLoading}
              />
            ))}
          </div>
        </div>

        <Button
          type="submit"
          size="lg"
          isLoading={isLoading}
          disabled={isLoading || !isOtpComplete || ttlSeconds <= 0}
          className="w-full text-xs font-semibold"
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Verify & Activate Account
        </Button>
      </form>

      {/* Resend Action */}
      <div className="pt-4 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-fg-muted">
        <span className="flex items-center gap-1.5 font-mono text-[11px]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          Hardware Level Security
        </span>

        <button
          type="button"
          onClick={handleResend}
          disabled={cooldownSeconds > 0 || isResending}
          className="font-medium text-accent hover:underline text-xs flex items-center gap-1.5 disabled:opacity-40 disabled:no-underline cursor-pointer disabled:cursor-not-allowed"
        >
          <RotateCcw className={cn('w-3 h-3', isResending && 'animate-spin')} />
          {cooldownSeconds > 0 ? `Resend Code in ${cooldownSeconds}s` : 'Resend Code'}
        </button>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4 bg-grid-pattern relative">
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />
      <Container size="sm" className="relative z-10 flex justify-center">
        <Suspense fallback={<div className="w-full max-w-md h-96 bg-bg-elevated rounded-xl animate-pulse" />}>
          <VerifyEmailForm />
        </Suspense>
      </Container>
    </main>
  );
}
