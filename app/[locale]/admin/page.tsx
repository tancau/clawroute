'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/use-user-store';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Activity, Users, Key, Settings, TrendingUp, DollarSign } from 'lucide-react';
import Link from 'next/link';

interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalRequests: number;
  totalCredits: number;
  totalRevenue: number;
}

export default function AdminPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useUserStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    // 检查认证和管理员权限
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    // 检查是否是管理员（这里简单检查 tier）
    if (user && user.tier !== 'admin' && user.email !== 'admin@hopllm.com') {
      router.push('/dashboard');
      return;
    }

    // 加载统计数据
    loadStats();
  }, [isAuthenticated, isLoading, user, router]);

  const loadStats = async () => {
    setStatsLoading(true);
    // 模拟数据（实际应该调用 API）
    setStats({
      totalUsers: 156,
      activeUsers: 89,
      totalRequests: 12543,
      totalCredits: 45678,
      totalRevenue: 1234.56,
    });
    setStatsLoading(false);
  };

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-64">
          <div className="animate-pulse h-8 bg-surface-overlay rounded w-48 mx-auto" />
          <div className="animate-pulse h-4 bg-surface-overlay rounded w-32 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <DashboardShell>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-neutral-10">Admin Dashboard</h1>
          <p className="text-neutral-7 mt-1">Manage HopLLM platform</p>
        </div>

        {/* Navigation */}
        <div className="flex gap-4">
          <Link href="/admin/users" className="flex items-center gap-2 px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-lg hover:bg-brand-primary/20 transition-colors">
            <Users className="h-4 w-4" />
            Users
          </Link>
          <Link href="/admin/keys" className="flex items-center gap-2 px-4 py-2 bg-brand-accent/10 text-brand-accent rounded-lg hover:bg-brand-accent/20 transition-colors">
            <Key className="h-4 w-4" />
            API Keys
          </Link>
          <Link href="/admin/settings" className="flex items-center gap-2 px-4 py-2 bg-surface-overlay text-neutral-10 rounded-lg hover:bg-surface-raised transition-colors">
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </div>

        {/* Stats Overview */}
        {statsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="animate-pulse h-24 bg-surface-overlay rounded-xl" />
            ))}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
              <div className="flex items-center gap-2 text-neutral-7 mb-2">
                <Users className="h-4 w-4" />
                <span className="text-sm">Total Users</span>
              </div>
              <div className="text-2xl font-bold text-neutral-10">{stats.totalUsers}</div>
              <div className="text-xs text-brand-accent mt-1">{stats.activeUsers} active</div>
            </div>

            <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
              <div className="flex items-center gap-2 text-neutral-7 mb-2">
                <Activity className="h-4 w-4" />
                <span className="text-sm">Total Requests</span>
              </div>
              <div className="text-2xl font-bold text-neutral-10">{stats.totalRequests.toLocaleString()}</div>
              <div className="text-xs text-neutral-7 mt-1">All time</div>
            </div>

            <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
              <div className="flex items-center gap-2 text-neutral-7 mb-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Total Credits</span>
              </div>
              <div className="text-2xl font-bold text-brand-primary">{stats.totalCredits.toLocaleString()}</div>
              <div className="text-xs text-neutral-7 mt-1">In circulation</div>
            </div>

            <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
              <div className="flex items-center gap-2 text-neutral-7 mb-2">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm">Revenue</span>
              </div>
              <div className="text-2xl font-bold text-brand-accent">$${stats.totalRevenue.toFixed(2)}</div>
              <div className="text-xs text-neutral-7 mt-1">This month</div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
          <h3 className="text-lg font-semibold text-neutral-10 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="px-4 py-3 bg-brand-primary/10 text-brand-primary rounded-lg hover:bg-brand-primary/20 transition-colors">
              📧 Send Announcement
            </button>
            <button className="px-4 py-3 bg-brand-accent/10 text-brand-accent rounded-lg hover:bg-brand-accent/20 transition-colors">
              🎁 Grant Credits
            </button>
            <button className="px-4 py-3 bg-surface-overlay text-neutral-10 rounded-lg hover:bg-surface-raised transition-colors">
              📊 Export Reports
            </button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}