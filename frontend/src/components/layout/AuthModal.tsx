'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Tabs } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/auth';
import { useUIStore } from '@/stores/ui';
import { Mail, Lock, User, Phone, AlertCircle } from 'lucide-react';

export function AuthModal() {
  const { activeModal, closeModal } = useUIStore();
  const { login, register } = useAuthStore();

  const isOpen = activeModal === 'auth';
  const [tab, setTab] = useState<'login' | 'register'>('login');

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (tab === 'login') {
        await login({ email, password });
      } else {
        if (password !== passwordConfirm) {
          throw new Error('Passwords do not match.');
        }
        await register({
          email,
          password,
          password_confirm: passwordConfirm,
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber || null,
        });
      }
      closeModal();
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail ||
          err.response?.data?.errors?.email?.[0] ||
          err.message ||
          'Authentication failed.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      maxWidth="sm"
      className="p-6"
    >
      <div className="flex flex-col gap-5">
        <div className="text-center">
          <div className="w-10 h-10 rounded-sm bg-accent text-accent-fg font-mono font-bold text-xs flex items-center justify-center mx-auto mb-3">
            PX
          </div>
          <h2 className="text-lg font-semibold font-display text-fg-primary">
            {tab === 'login' ? 'Sign in to Paradox' : 'Create an Account'}
          </h2>
          <p className="text-xs text-fg-secondary mt-0.5">
            {tab === 'login'
              ? 'Access orders, addresses, and verified purchases'
              : 'Join the engineered luxury commerce experience'}
          </p>
        </div>

        <Tabs
          tabs={[
            { id: 'login', label: 'Sign In' },
            { id: 'register', label: 'Register' },
          ]}
          activeTab={tab}
          onChange={(id) => {
            setTab(id as 'login' | 'register');
            setErrorMessage(null);
          }}
          variant="pills"
          className="w-full justify-center"
        />

        {errorMessage && (
          <div className="p-3 rounded-md bg-status-error/10 border border-status-error/20 flex items-start gap-2 text-status-error text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {tab === 'register' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="First Name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Abolfazl"
                  leftIcon={<User className="w-3.5 h-3.5" />}
                  required
                />
                <Input
                  label="Last Name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Paradox"
                  required
                />
              </div>
              <Input
                label="Phone Number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+989123456789"
                leftIcon={<Phone className="w-3.5 h-3.5" />}
              />
            </>
          )}

          <Input
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            leftIcon={<Mail className="w-3.5 h-3.5" />}
            required
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            leftIcon={<Lock className="w-3.5 h-3.5" />}
            required
          />

          {tab === 'register' && (
            <Input
              label="Confirm Password"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="••••••••"
              leftIcon={<Lock className="w-3.5 h-3.5" />}
              required
            />
          )}

          <Button
            type="submit"
            size="lg"
            isLoading={isLoading}
            className="w-full mt-2"
          >
            {tab === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>
      </div>
    </Modal>
  );
}
