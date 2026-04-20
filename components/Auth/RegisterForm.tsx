'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useUserStore } from '@/store/use-user-store';

export function RegisterForm() {
  const router = useRouter();
  const t = useTranslations('auth');
  const { register, isLoading, error, clearError } = useUserStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError('');

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    const success = await register(email, password, name || undefined);
    if (success) {
      router.push('/dashboard');
    }
  };

  const displayError = localError || error;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">{t('createAccount')}</h1>
        <p className="text-[#94a3b8] text-center mb-8">{t('registerTo')}</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[#94a3b8] mb-2">
              {t('name')} <span className="text-[#64748b]">(optional)</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-[#1e293b] border border-[#334155] rounded-xl text-white placeholder-[#64748b] focus:outline-none focus:border-[#00c9ff] transition-colors"
              placeholder="Your nickname"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#94a3b8] mb-2">
              {t('email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-[#1e293b] border border-[#334155] rounded-xl text-white placeholder-[#64748b] focus:outline-none focus:border-[#00c9ff] transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-[#94a3b8] mb-2">
              {t('password')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-[#1e293b] border border-[#334155] rounded-xl text-white placeholder-[#64748b] focus:outline-none focus:border-[#00c9ff] transition-colors"
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#94a3b8] mb-2">
              {t('confirmPassword')}
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-[#1e293b] border border-[#334155] rounded-xl text-white placeholder-[#64748b] focus:outline-none focus:border-[#00c9ff] transition-colors"
              placeholder="Enter password again"
            />
          </div>

          {displayError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {displayError}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] text-[#0f172a] font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? `${t('register')}...` : t('register')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[#94a3b8]">
            {t('hasAccount')}{' '}
            <Link href="/auth/login" className="text-[#00c9ff] hover:underline">
              {t('loginNow')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
