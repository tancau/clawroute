'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Turnstile } from '@marsidev/react-turnstile';
import { useUserStore } from '@/store/use-user-store';

// Turnstile site key (uses placeholder if not configured)
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';

export function RegisterForm() {
  const router = useRouter();
  const t = useTranslations('auth');
  const { register, isLoading, error, clearError } = useUserStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [localError, setLocalError] = useState('');
  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const [honeypot, setHoneypot] = useState('');
  const turnstileRef = useRef<import('@marsidev/react-turnstile').TurnstileInstance>(null);

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

    // Honeypot check (client-side as additional protection)
    if (honeypot) {
      console.warn('Honeypot field filled - likely bot');
      return; // Silently fail
    }

    const success = await register(email, password, name || undefined, turnstileToken, honeypot);
    if (success) {
      router.push('/dashboard');
    } else {
      // Reset Turnstile on failure
      turnstileRef.current?.reset();
      setTurnstileToken('');
    }
  };

  const displayError = localError || error;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">{t('createAccount')}</h1>
        <p className="text-[#94a3b8] text-center mb-8">{t('registerTo')}</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Honeypot field - hidden from users, bots will fill it */}
          <input
            type="text"
            name="website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />

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

          {/* Cloudflare Turnstile CAPTCHA */}
          {TURNSTILE_SITE_KEY && (
            <div className="flex justify-center">
              <Turnstile
                ref={turnstileRef}
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={(token) => setTurnstileToken(token)}
                onError={() => setLocalError('CAPTCHA verification failed. Please try again.')}
                options={{
                  theme: 'dark',
                  size: 'normal',
                }}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || (!!TURNSTILE_SITE_KEY && !turnstileToken)}
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
