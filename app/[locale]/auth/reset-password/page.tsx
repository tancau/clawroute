'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { InlineFeedback } from '@/components/shared/InlineFeedback';
import { Loader2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const result = await api.requestPasswordReset(email);
      if (result.data?.success) {
        setSuccess(result.data.message);
        if (result.data.resetToken) {
          setResetToken(result.data.resetToken);
          setStep('reset');
        }
      }
      if (result.error) {
        setError(result.error.message);
      }
    } catch {
      setError('Request failed, please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const result = await api.resetPassword(resetToken, newPassword);
      if (result.data?.success) {
        setSuccess('Password reset successfully! Redirecting to login...');
        setTimeout(() => {
          window.location.href = '/auth/login';
        }, 2000);
      }
      if (result.error) {
        setError(result.error.message);
      }
    } catch {
      setError('Reset failed, please try again');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="bg-surface-raised border border-border-subtle rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-neutral-10 mb-2 text-center">
          {step === 'request' ? 'Reset Password' : 'Set New Password'}
        </h1>
        <p className="text-neutral-7 text-center mb-8">
          {step === 'request'
            ? 'Enter your email address to receive a reset link'
            : 'Please enter your new password'}
        </p>

        {step === 'request' ? (
          <form onSubmit={handleRequestReset} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-7 mb-2">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
              />
            </div>

            {error && <InlineFeedback variant="error" message={error} />}
            {success && <InlineFeedback variant="success" message={success} />}

            <Button type="submit" disabled={isLoading} className="w-full bg-gradient-primary text-neutral-1 hover:opacity-90">
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isLoading ? 'Sending...' : 'Send reset link'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-neutral-7 mb-2">
                Reset token
              </label>
              <Input
                id="token"
                type="text"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                required
                className="font-mono text-sm"
                placeholder="reset_..."
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-7 mb-2">
                New password
              </label>
              <Input
                id="password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                placeholder="At least 8 characters"
              />
            </div>

            {error && <InlineFeedback variant="error" message={error} />}
            {success && <InlineFeedback variant="success" message={success} />}

            <Button type="submit" disabled={isLoading} className="w-full bg-gradient-primary text-neutral-1 hover:opacity-90">
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isLoading ? 'Resetting...' : 'Reset password'}
            </Button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link href="/auth/login" className="text-sm text-brand-primary hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
}
