'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUserStore } from '@/store/use-user-store';
import { Stats } from '@/components/Dashboard/Stats';
import { KeyManager } from '@/components/Dashboard/KeyManager';
import { TestPanel } from '@/components/Dashboard/TestPanel';
import { Onboarding, useOnboarding } from '@/components/Onboarding';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useUserStore();
  const { showOnboarding, setShowOnboarding } = useOnboarding();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      {/* Onboarding Modal */}
      {showOnboarding && (
        <Onboarding
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
        />
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">仪表盘</h1>
            <p className="text-[#94a3b8] mt-1">欢迎回来，{user.name || user.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/savings"
              className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
            >
              💰 省钱报告
            </Link>
            <Link
              href="/dashboard/preferences"
              className="px-4 py-2 bg-[#1e293b] text-[#94a3b8] rounded-lg hover:bg-[#334155] transition-colors"
            >
              ⚙️ 偏好设置
            </Link>
            <button
              onClick={() => useUserStore.getState().logout()}
              className="px-4 py-2 bg-[#1e293b] text-[#94a3b8] rounded-lg hover:bg-[#334155] transition-colors"
            >
              退出登录
            </button>
          </div>
        </div>

        {/* Stats */}
        <Stats userId={user.id} />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Key Manager */}
          <KeyManager userId={user.id} />

          {/* Test Panel */}
          <TestPanel />
        </div>

        {/* Usage Overview */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">使用概览</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">
                {user.credits?.toLocaleString() || '0'}
              </div>
              <div className="text-sm text-[#94a3b8] mt-1">剩余积分</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">--</div>
              <div className="text-sm text-[#94a3b8] mt-1">本月请求</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-400">--</div>
              <div className="text-sm text-[#94a3b8] mt-1">本月节省</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400">--</div>
              <div className="text-sm text-[#94a3b8] mt-1">本月收益</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
