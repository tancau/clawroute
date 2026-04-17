'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserStore } from '@/store/use-user-store';

export function RegisterForm() {
  const router = useRouter();
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
      setLocalError('两次输入的密码不一致');
      return;
    }

    if (password.length < 6) {
      setLocalError('密码至少需要 6 个字符');
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
        <h1 className="text-2xl font-bold text-white mb-2 text-center">创建账户</h1>
        <p className="text-[#94a3b8] text-center mb-8">开始智能路由之旅</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-[#94a3b8] mb-2">
              昵称 <span className="text-[#64748b]">(可选)</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-[#1e293b] border border-[#334155] rounded-xl text-white placeholder-[#64748b] focus:outline-none focus:border-[#00c9ff] transition-colors"
              placeholder="你的昵称"
            />
          </div>

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
            <label htmlFor="password" className="block text-sm font-medium text-[#94a3b8] mb-2">
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-[#1e293b] border border-[#334155] rounded-xl text-white placeholder-[#64748b] focus:outline-none focus:border-[#00c9ff] transition-colors"
              placeholder="至少 6 个字符"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#94a3b8] mb-2">
              确认密码
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-[#1e293b] border border-[#334155] rounded-xl text-white placeholder-[#64748b] focus:outline-none focus:border-[#00c9ff] transition-colors"
              placeholder="再次输入密码"
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
            {isLoading ? '注册中...' : '注册'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-[#94a3b8]">
            已有账户？{' '}
            <Link href="/auth/login" className="text-[#00c9ff] hover:underline">
              立即登录
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
