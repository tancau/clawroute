'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserStore } from '@/store/use-user-store';

export function LoginForm() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useUserStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    
    const success = await login(email, password);
    if (success) {
      router.push('/dashboard');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-white mb-2 text-center">欢迎回来</h1>
        <p className="text-[#94a3b8] text-center mb-8">登录到 HopLLM</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#94a3b8] mb-2">
              邮箱地址
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
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-sm font-medium text-[#94a3b8]">
                密码
              </label>
              <Link 
                href="/auth/reset-password"
                className="text-sm text-[#00c9ff] hover:underline"
              >
                忘记密码？
              </Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-[#1e293b] border border-[#334155] rounded-xl text-white placeholder-[#64748b] focus:outline-none focus:border-[#00c9ff] transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] text-[#0f172a] font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[#94a3b8]">
            还没有账户？{' '}
            <Link href="/auth/register" className="text-[#00c9ff] hover:underline">
              立即注册
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
