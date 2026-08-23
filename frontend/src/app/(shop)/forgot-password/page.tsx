'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Container } from '@/components/ui/Container';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { authApi } from '@/lib/api/endpoints';
import { parseApiError } from '@/lib/api/error-handler';
import { notify } from '@/stores/notifications';
import {
  Mail,
  Lock,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  KeyRound,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type ResetStep = 'email' | 'otp' | 'new_password' | 'success';

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [step, setStep] = useState<ResetStep>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Timers: 120s TTL for OTP expiration, 60s cooldown for resend button
  const [ttlSeconds, setTtlSeconds] = useState<number>(120);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(60);
  const [isResending, setIsResending] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer for OTP
  useEffect(() => {
    if (step !== 'otp') return;
    const timer = setInterval(() => {
      setTtlSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      setCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  // Handle segmented OTP changes
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setErrorMessage(null);

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

  // Step 1: Request OTP
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await authApi.requestPasswordReset({ email });
      setTtlSeconds(res.ttl || 120);
      setCooldownSeconds(res.cooldown || 60);
      setStep('otp');
      notify.success('Security Code Sent', 'A 6-digit recovery code has been dispatched to your email.');
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      const parsed = parseApiError(err, 'password-reset-request');
      setErrorMessage(parsed.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Confirm OTP entered and advance
  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = otp.join('');
    if (fullOtp.length !== 6) {
      setErrorMessage('Please enter all 6 digits of your reset code.');
      return;
    }
    setErrorMessage(null);
    setStep('new_password');
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (cooldownSeconds > 0 || isResending || !email) return;

    setIsResending(true);
    setErrorMessage(null);

    try {
      const res = await authApi.resendOtp({ email, type: 'reset' });
      setTtlSeconds(res.ttl || 120);
      setCooldownSeconds(res.cooldown || 60);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      notify.success('Code Resent', 'A fresh reset code has been sent to your email.');
    } catch (err: any) {
      const parsed = parseApiError(err, 'resend-otp');
      setErrorMessage(parsed.message);
    } finally {
      setIsResending(false);
    }
  };

  // Step 3: Set New Password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== newPasswordConfirm) {
      setErrorMessage('New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await authApi.confirmPasswordReset({
        email,
        otp: otp.join(''),
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      });
      setStep('success');
      notify.success('Password Reset', 'Your password has been changed successfully.');
    } catch (err: any) {
      const parsed = parseApiError(err, 'password-reset-confirm');
      setErrorMessage(parsed.message || 'Failed to reset password. The code may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <main className="min-h-[calc(100vh-8rem)] flex items-center justify-center py-12 px-4 bg-grid-pattern relative">
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none" />
      <Container size="sm" className="relative z-10 flex justify-center">
        <div className="w-full max-w-md bg-bg-elevated border border-border-subtle rounded-xl p-6 sm:p-8 shadow-card backdrop-blur-sm space-y-6">
          {/* Brand Header */}
          <div className="text-center space-y-2">
            <Link href="/" className="inline-block focus-ring rounded-sm">
              <div className="w-10 h-10 rounded-sm bg-accent text-accent-fg font-mono font-bold text-xs flex items-center justify-center mx-auto tracking-tighter shadow-subtle">
                PX
              </div>
            </Link>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-fg-primary tracking-tight">
              {step === 'success' ? 'Password Updated' : 'Reset Password'}
            </h1>
            <p className="text-xs text-fg-secondary">
              {step === 'email' && 'Enter your registered email address to receive a recovery code.'}
              {step === 'otp' && `Enter the 6-digit code dispatched to ${email}`}
              {step === 'new_password' && 'Create a strong, new password for your account.'}
              {step === 'success' && 'Your account credentials have been securely updated.'}
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3 rounded-md bg-status-error/10 border border-status-error/20 flex items-start gap-2.5 text-status-error text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </div>
          )}

          {/* Step 1: Email Form */}
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <Input
                label="Registered Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                leftIcon={<Mail className="w-4 h-4 text-fg-muted" />}
                required
                className="text-xs h-10"
              />

              <Button
                type="submit"
                size="lg"
                isLoading={isLoading}
                disabled={isLoading || !email}
                className="w-full text-xs font-semibold mt-2"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Send Recovery Code
              </Button>
            </form>
          )}

          {/* Step 2: OTP Form */}
          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-fg-secondary font-medium">
                    6-Digit Recovery Code
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
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Button
                  type="submit"
                  size="lg"
                  disabled={otp.join('').length !== 6 || ttlSeconds <= 0}
                  className="w-full text-xs font-semibold"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Verify Code & Continue
                </Button>

                <div className="flex items-center justify-between text-xs text-fg-muted pt-2">
                  <button
                    type="button"
                    onClick={() => setStep('email')}
                    className="hover:text-fg-primary transition-colors text-xs"
                  >
                    ← Change Email
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={cooldownSeconds > 0 || isResending}
                    className="font-medium text-accent hover:underline text-xs flex items-center gap-1.5 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                  >
                    <RotateCcw className={cn('w-3 h-3', isResending && 'animate-spin')} />
                    {cooldownSeconds > 0 ? `Resend (${cooldownSeconds}s)` : 'Resend Code'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Step 3: New Password Form */}
          {step === 'new_password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input
                label="New Password (min. 8 characters)"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                leftIcon={<Lock className="w-4 h-4 text-fg-muted" />}
                required
                className="text-xs h-10"
              />

              <Input
                label="Confirm New Password"
                type="password"
                value={newPasswordConfirm}
                onChange={(e) => setNewPasswordConfirm(e.target.value)}
                placeholder="••••••••"
                leftIcon={<KeyRound className="w-4 h-4 text-fg-muted" />}
                required
                className="text-xs h-10"
              />

              <Button
                type="submit"
                size="lg"
                isLoading={isLoading}
                disabled={isLoading || !newPassword || !newPasswordConfirm}
                className="w-full text-xs font-semibold mt-2"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Save New Password
              </Button>
            </form>
          )}

          {/* Step 4: Success State */}
          {step === 'success' && (
            <div className="space-y-6 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <p className="text-xs text-fg-secondary">
                You can now log in with your updated credentials.
              </p>

              <Button
                onClick={() => router.push('/login')}
                size="lg"
                className="w-full text-xs font-semibold"
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Proceed to Sign In
              </Button>
            </div>
          )}

          {/* Back to Login Footer */}
          {step !== 'success' && (
            <div className="pt-4 border-t border-border-subtle flex items-center justify-between text-xs text-fg-muted">
              <span className="flex items-center gap-1.5 font-mono text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Encrypted Session
              </span>
              <Link href="/login" className="font-medium text-fg-primary hover:underline text-xs">
                Back to Sign In
              </Link>
            </div>
          )}
        </div>
      </Container>
    </main>
  );
}
