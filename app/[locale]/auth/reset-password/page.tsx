'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

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
        
        // 开发环境：直接显示 token
        if (result.data.resetToken) {
          setResetToken(result.data.resetToken);
          setStep('reset');
        }
      }
      
      if (result.error) {
        setError(result.error.message);
      }
    } catch {
      setError('请求失败，请重试');
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
        setSuccess('密码重置成功！请使用新密码登录。');
        setTimeout(() => {
          window.location.href = '/auth/login';
        }, 2000);
      }
      
      if (result.error) {
        setError(result.error.message);
      }
    } catch {
      setError('重置失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f1a] p-4">
      <div className="w-full max-w-md">
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-2xl p-8">
          <h1 className="text-2xl font-bold text-white mb-2 text-center">
            {step === 'request' ? '重置密码' : '设置新密码'}
          </h1>
          <p className="text-[#94a3b8] text-center mb-8">
            {step === 'request' 
              ? '输入您的邮箱地址，我们将发送重置链接' 
              : '请输入您的新密码'}
          </p>

          {step === 'request' ? (
            <form onSubmit={handleRequestReset} className="space-y-6">
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

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] text-[#0f172a] font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '发送中...' : '发送重置链接'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label htmlFor="token" className="block text-sm font-medium text-[#94a3b8] mb-2">
                  重置令牌
                </label>
                <input
                  id="token"
                  type="text"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-[#1e293b] border border-[#334155] rounded-xl text-white placeholder-[#64748b] focus:outline-none focus:border-[#00c9ff] transition-colors font-mono text-sm"
                  placeholder="reset_..."
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#94a3b8] mb-2">
                  新密码
                </label>
                <input
                  id="password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-4 py-3 bg-[#1e293b] border border-[#334155] rounded-xl text-white placeholder-[#64748b] focus:outline-none focus:border-[#00c9ff] transition-colors"
                  placeholder="至少 8 个字符"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
                  {success}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] text-[#0f172a] font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '重置中...' : '重置密码'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link href="/auth/login" className="text-[#00c9ff] hover:underline">
              ← 返回登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
