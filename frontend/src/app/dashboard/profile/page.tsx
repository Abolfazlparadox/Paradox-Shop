'use client';

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth';
import { authApi } from '@/lib/api/endpoints';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import {
  User,
  Mail,
  Phone,
  Lock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

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
      if (user.profile) {
        setNationalId(user.profile.national_id || '');
        setGender((user.profile.gender as any) || '');
        setDateOfBirth(user.profile.date_of_birth || '');
      }
    }
  }, [user]);

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

      {/* Section 2: Security & Password */}
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
