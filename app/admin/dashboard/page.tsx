/**
 * Admin Dashboard Page
 * 管理仪表盘
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AdminStats {
  users: { total: number; active: number; newToday: number };
  keys: { total: number; active: number; pending: number };
  usage: { totalRequests: number; todayRequests: number; totalCost: number; todayCost: number };
}

interface Activity {
  type: string;
  description: string;
  timestamp: number;
}

interface Trend {
  date: string;
  requests: number;
  cost: number;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [trend, setTrend] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [statsRes, activityRes, trendRes] = await Promise.all([
        fetch('/v1/admin/stats'),
        fetch('/v1/admin/activity'),
        fetch('/v1/admin/trend?days=7'),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      if (activityRes.ok) setActivities(await activityRes.json());
      if (trendRes.ok) setTrend(await trendRes.json());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white p-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      {/* Header */}
      <header className="bg-[#0f172a] border-b border-[#1e293b] px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-[#94a3b8] text-sm">System overview and management</p>
          </div>
          <Link
            href="/admin"
            className="text-sm text-[#94a3b8] hover:text-white"
          >
            ← Back to Admin
          </Link>
        </div>
      </header>

      <div className="p-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Users */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
              <div className="text-[#94a3b8] text-sm mb-2">Total Users</div>
              <div className="text-3xl font-bold">{stats.users.total.toLocaleString()}</div>
              <div className="text-xs text-[#94a3b8] mt-2">
                {stats.users.active} active · {stats.users.newToday} new today
              </div>
            </div>

            {/* Keys */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
              <div className="text-[#94a3b8] text-sm mb-2">Total Keys</div>
              <div className="text-3xl font-bold">{stats.keys.total.toLocaleString()}</div>
              <div className="text-xs text-[#94a3b8] mt-2">
                {stats.keys.active} active · {stats.keys.pending} pending
              </div>
            </div>

            {/* Requests */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
              <div className="text-[#94a3b8] text-sm mb-2">Total Requests</div>
              <div className="text-3xl font-bold">{stats.usage.totalRequests.toLocaleString()}</div>
              <div className="text-xs text-[#94a3b8] mt-2">
                {stats.usage.todayRequests.toLocaleString()} today
              </div>
            </div>

            {/* Cost */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
              <div className="text-[#94a3b8] text-sm mb-2">Total Cost</div>
              <div className="text-3xl font-bold">${stats.usage.totalCost.toFixed(2)}</div>
              <div className="text-xs text-[#94a3b8] mt-2">
                ${stats.usage.todayCost.toFixed(2)} today
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            href="/admin/users"
            className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 hover:border-[#00c9ff] transition-colors"
          >
            <div className="text-lg font-semibold mb-2">👥 User Management</div>
            <div className="text-[#94a3b8] text-sm">View, suspend, and manage user accounts</div>
          </Link>

          <Link
            href="/admin/keys"
            className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 hover:border-[#00c9ff] transition-colors"
          >
            <div className="text-lg font-semibold mb-2">🔑 Key Management</div>
            <div className="text-[#94a3b8] text-sm">Review, approve, and manage API keys</div>
          </Link>

          <Link
            href="/admin/settings"
            className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 hover:border-[#00c9ff] transition-colors"
          >
            <div className="text-lg font-semibold mb-2">⚙️ System Settings</div>
            <div className="text-[#94a3b8] text-sm">Configure system-wide settings</div>
          </Link>
        </div>

        {/* Usage Trend */}
        {trend.length > 0 && (
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">📊 Usage Trend (Last 7 Days)</h2>
            <div className="space-y-2">
              {trend.map((day, index) => {
                const maxRequests = Math.max(...trend.map(d => d.requests), 1);
                const width = (day.requests / maxRequests) * 100;
                
                return (
                  <div key={index} className="flex items-center gap-3">
                    <div className="text-sm text-[#94a3b8] w-24">{day.date}</div>
                    <div className="flex-1">
                      <div className="relative h-6 bg-[#1e293b] rounded overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] rounded"
                          style={{ width: `${width}%` }}
                        />
                        <div className="absolute inset-y-0 left-2 flex items-center text-xs text-white">
                          {day.requests.toLocaleString()} requests
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-[#94a3b8] w-20">
                      ${day.cost.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">🕐 Recent Activity</h2>
          {activities.length === 0 ? (
            <div className="text-[#94a3b8] text-center py-8">No recent activity</div>
          ) : (
            <div className="space-y-3">
              {activities.slice(0, 10).map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-[#1e293b] last:border-0"
                >
                  <div className="text-sm">{activity.description}</div>
                  <div className="text-xs text-[#94a3b8]">
                    {new Date(activity.timestamp).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
