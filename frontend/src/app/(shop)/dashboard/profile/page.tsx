'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/lib/api/endpoints';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { notify } from '@/stores/notifications';
import { parseApiError } from '@/lib/api/error-handler';
import {
  User,
  Mail,
  Phone,
  Lock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Smartphone,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function ProfileSettingsPage() {
  const { user, fetchProfile } = useAuthStore();

  // Profile Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | 'O' | ''>('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Phone Verification State
  const [verifyPhoneInput, setVerifyPhoneInput] = useState('');
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState(['', '', '', '', '', '']);
  const [isSendingPhoneOtp, setIsSendingPhoneOtp] = useState(false);
  const [isConfirmingPhoneOtp, setIsConfirmingPhoneOtp] = useState(false);
  const [phoneOtpError, setPhoneOtpError] = useState<string | null>(null);
  const [phoneTtlSeconds, setPhoneTtlSeconds] = useState(120);
  const [phoneCooldownSeconds, setPhoneCooldownSeconds] = useState(60);

  const phoneInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Password Form State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');

  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setPhoneNumber(user.phone_number || '');
      setVerifyPhoneInput(user.phone_number || '');
      if (user.profile) {
        setNationalId(user.profile.national_id || '');
        setGender((user.profile.gender as any) || '');
        setDateOfBirth(user.profile.date_of_birth || '');
      }
    }
  }, [user]);

  // Phone OTP Countdown timer
  useEffect(() => {
    if (!isPhoneModalOpen) return;
    const timer = setInterval(() => {
      setPhoneTtlSeconds((prev) => (prev > 0 ? prev - 1 : 0));
      setPhoneCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isPhoneModalOpen]);

  const handleRequestPhoneOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const phoneToVerify = verifyPhoneInput.trim() || phoneNumber.trim();
    if (!phoneToVerify) {
      setPhoneOtpError('Please enter a valid mobile number.');
      return;
    }

    setIsSendingPhoneOtp(true);
    setPhoneOtpError(null);

    try {
      const res = await authApi.verifyPhone({ phone_number: phoneToVerify });
      setPhoneTtlSeconds(res.ttl || 120);
      setPhoneCooldownSeconds(res.cooldown || 60);
      setIsPhoneModalOpen(true);
      setPhoneOtp(['', '', '', '', '', '']);
      notify.success('Code Sent', `A 6-digit SMS verification code was sent to ${phoneToVerify}.`);
      setTimeout(() => phoneInputRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      const parsed = parseApiError(err, 'verify-phone');
      setPhoneOtpError(parsed.message);
    } finally {
      setIsSendingPhoneOtp(false);
    }
  };

  const handlePhoneOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...phoneOtp];
    newOtp[index] = value.slice(-1);
    setPhoneOtp(newOtp);
    setPhoneOtpError(null);

    if (value && index < 5) {
      phoneInputRefs.current[index + 1]?.focus();
    }
  };

  const handlePhoneOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !phoneOtp[index] && index > 0) {
      phoneInputRefs.current[index - 1]?.focus();
    }
  };

  const handleConfirmPhoneOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullOtp = phoneOtp.join('');
    if (fullOtp.length !== 6) {
      setPhoneOtpError('Please enter all 6 digits of the SMS code.');
      return;
    }

    setIsConfirmingPhoneOtp(true);
    setPhoneOtpError(null);

    try {
      await authApi.confirmPhone({ otp: fullOtp });
      await fetchProfile();
      setIsPhoneModalOpen(false);
      notify.success('Mobile Verified', 'Your mobile phone number has been verified successfully.');
    } catch (err: any) {
      const parsed = parseApiError(err, 'confirm-phone');
      setPhoneOtpError(parsed.message || 'Invalid or expired mobile verification code.');
    } finally {
      setIsConfirmingPhoneOtp(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProfileSaving(true);
    setProfileError(null);
    setProfileSuccess(false);

    try {
      await authApi.updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone_number: phoneNumber.trim() || undefined,
        profile: {
          national_id: nationalId.trim() || undefined,
          gender: (gender as any) || undefined,
          date_of_birth: dateOfBirth || undefined,
        },
      });
      await fetchProfile();
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      const data = err.response?.data;
      let msg = 'Failed to update profile settings.';
      if (data) {
        if (typeof data === 'string') msg = data;
        else if (data.detail) msg = data.detail;
        else if (data.errors) {
          const firstKey = Object.keys(data.errors)[0];
          const firstErr = data.errors[firstKey];
          msg = Array.isArray(firstErr) ? `${firstKey}: ${firstErr[0]}` : String(firstErr);
        }
      }
      setProfileError(msg);
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPasswordSaving(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword !== newPasswordConfirm) {
      setPasswordError('New passwords do not match.');
      setIsPasswordSaving(false);
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      setIsPasswordSaving(false);
      return;
    }

    try {
      await authApi.changePassword({
        old_password: oldPassword,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      });
      setPasswordSuccess(true);
      setOldPassword('');
      setNewPassword('');
      setNewPasswordConfirm('');
      setTimeout(() => setPasswordSuccess(false), 3000);
    } catch (err: any) {
      const data = err.response?.data;
      let msg = 'Failed to change password. Please verify your current password.';
      if (data) {
        if (typeof data === 'string') msg = data;
        else if (data.detail) msg = data.detail;
        else if (data.errors) {
          const firstKey = Object.keys(data.errors)[0];
          const firstErr = data.errors[firstKey];
          msg = Array.isArray(firstErr) ? `${firstKey}: ${firstErr[0]}` : String(firstErr);
        }
      }
      setPasswordError(msg);
    } finally {
      setIsPasswordSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Profile Details */}
      <div className="bg-bg-elevated border border-border-subtle rounded-xl p-6 sm:p-8 shadow-card space-y-6">
        <div className="pb-4 border-b border-border-subtle">
          <h2 className="text-lg font-bold font-display text-fg-primary">
            Personal Coordinates & Identification
          </h2>
          <p className="text-xs text-fg-secondary font-mono">
            Manage your verified account parameters and identity
          </p>
        </div>

        {profileSuccess && (
          <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-emerald-400 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Profile information updated successfully.</span>
          </div>
        )}

        {profileError && (
          <div className="p-3 rounded-md bg-status-error/10 border border-status-error/20 flex items-center gap-2 text-status-error text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{profileError}</span>
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First Name"
              required
              className="text-xs h-10"
            />
            <Input
              label="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last Name"
              required
              className="text-xs h-10"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Email Address (Immutable)"
              value={user?.email || ''}
              disabled
              leftIcon={<Mail className="w-4 h-4 text-fg-muted" />}
              className="text-xs h-10 opacity-70 cursor-not-allowed font-mono"
            />
            <Input
              label="Phone Number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="09123456789"
              leftIcon={<Phone className="w-4 h-4 text-fg-muted" />}
              className="text-xs h-10 font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="National ID (10 digits)"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              placeholder="1234567890"
              className="text-xs h-10 font-mono"
            />

            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-fg-secondary mb-1.5 font-medium">
                Gender
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full h-10 px-3 text-xs rounded-md bg-bg-secondary text-fg-primary border border-border-subtle focus:border-accent focus:outline-none transition-colors"
              >
                <option value="">Select Gender</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="O">Other / Private</option>
              </select>
            </div>

            <Input
              label="Date of Birth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="text-xs h-10 font-mono"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="submit" size="sm" isLoading={isProfileSaving} className="text-xs font-semibold">
              Save Profile Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Section 2: Mobile Phone Verification */}
      <div className="bg-bg-elevated border border-border-subtle rounded-xl p-6 sm:p-8 shadow-card space-y-6">
        <div className="pb-4 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold font-display text-fg-primary flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-accent" />
              Mobile Phone Verification
            </h2>
            <p className="text-xs text-fg-secondary font-mono">
              Secure your account with multi-factor SMS verification
            </p>
          </div>

          <div>
            {user?.profile?.phone_verified ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-subtle">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-subtle">
                <AlertCircle className="w-3.5 h-3.5" />
                Unverified
              </span>
            )}
          </div>
        </div>

        {phoneOtpError && (
          <div className="p-3 rounded-md bg-status-error/10 border border-status-error/20 flex items-center gap-2 text-status-error text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{phoneOtpError}</span>
          </div>
        )}

        {!isPhoneModalOpen ? (
          <form onSubmit={handleRequestPhoneOtp} className="space-y-4">
            <div className="max-w-md space-y-2">
              <Input
                label="Mobile Phone Number"
                value={verifyPhoneInput}
                onChange={(e) => setVerifyPhoneInput(e.target.value)}
                placeholder="09123456789"
                leftIcon={<Phone className="w-4 h-4 text-fg-muted" />}
                required
                className="text-xs h-10 font-mono"
              />
              <p className="text-[11px] text-fg-muted">
                We will dispatch a 6-digit cryptographic security code via SMS.
              </p>
            </div>

            <Button
              type="submit"
              size="sm"
              isLoading={isSendingPhoneOtp}
              disabled={isSendingPhoneOtp || !verifyPhoneInput.trim()}
              className="text-xs font-semibold"
            >
              {user?.profile?.phone_verified ? 'Change & Re-verify Mobile' : 'Send Verification Code'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleConfirmPhoneOtp} className="max-w-md space-y-4 p-4 rounded-lg bg-bg-secondary border border-border-subtle">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-fg-primary block">
                  Enter 6-Digit SMS Code
                </span>
                <span className="text-[11px] text-fg-muted">
                  Sent to <span className="font-mono text-fg-primary">{verifyPhoneInput}</span>
                </span>
              </div>
              <span className={cn('text-xs font-mono font-semibold flex items-center gap-1', phoneTtlSeconds > 20 ? 'text-fg-muted' : 'text-status-error')}>
                <Clock className="w-3 h-3" />
                {phoneTtlSeconds > 0 ? `${Math.floor(phoneTtlSeconds / 60)}:${(phoneTtlSeconds % 60).toString().padStart(2, '0')}` : 'Expired'}
              </span>
            </div>

            <div className="grid grid-cols-6 gap-2">
              {phoneOtp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => {
                    phoneInputRefs.current[index] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handlePhoneOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handlePhoneOtpKeyDown(index, e)}
                  className="w-full h-10 text-center text-base font-mono font-bold rounded-md bg-bg-elevated text-fg-primary border border-border-subtle focus:border-accent focus:outline-none transition-all"
                  disabled={isConfirmingPhoneOtp}
                />
              ))}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                size="sm"
                isLoading={isConfirmingPhoneOtp}
                disabled={isConfirmingPhoneOtp || phoneOtp.join('').length !== 6 || phoneTtlSeconds <= 0}
                className="text-xs font-semibold"
              >
                Confirm Verification
              </Button>

              <button
                type="button"
                onClick={handleRequestPhoneOtp}
                disabled={phoneCooldownSeconds > 0 || isSendingPhoneOtp}
                className="text-xs font-mono text-accent hover:underline disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                {phoneCooldownSeconds > 0 ? `Resend (${phoneCooldownSeconds}s)` : 'Resend SMS'}
              </button>

              <button
                type="button"
                onClick={() => setIsPhoneModalOpen(false)}
                className="text-xs text-fg-muted hover:text-fg-primary ms-auto cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Section 3: Security & Password */}
      <div className="bg-bg-elevated border border-border-subtle rounded-xl p-6 sm:p-8 shadow-card space-y-6">
        <div className="pb-4 border-b border-border-subtle">
          <h2 className="text-lg font-bold font-display text-fg-primary flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            Security & Authentication
          </h2>
          <p className="text-xs text-fg-secondary font-mono">
            Rotate your account password and review encryption parameters
          </p>
        </div>

        {passwordSuccess && (
          <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-emerald-400 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Password updated successfully.</span>
          </div>
        )}

        {passwordError && (
          <div className="p-3 rounded-md bg-status-error/10 border border-status-error/20 flex items-center gap-2 text-status-error text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <Input
            label="Current Password"
            type="password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            placeholder="••••••••"
            leftIcon={<Lock className="w-4 h-4 text-fg-muted" />}
            required
            className="text-xs h-10"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="New Password (min 8 chars)"
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
              leftIcon={<Lock className="w-4 h-4 text-fg-muted" />}
              required
              className="text-xs h-10"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <Button type="submit" size="sm" isLoading={isPasswordSaving} className="text-xs font-semibold">
              Update Password
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
