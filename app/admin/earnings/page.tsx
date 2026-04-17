/**
 * Admin Earnings Page
 * 收益管理页面
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface EarningsSummary {
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  totalUsers: number;
  pendingUsers: number;
}

interface UserEarning {
  userId: string;
  userEmail: string;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  keyCount: number;
}

export default function AdminEarningsPage() {
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [users, setUsers] = useState<UserEarning[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'users' | 'payouts'>('overview');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [summaryRes, usersRes] = await Promise.all([
        fetch('/v1/admin/earnings/summary'),
        fetch('/v1/admin/earnings/users?limit=50'),
      ]);

      if (summaryRes.ok) setSummary(await summaryRes.json());
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to load earnings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayout = async (userId: string, amount: number) => {
    if (!confirm(`Process payout of $${amount.toFixed(2)}?`)) return;
    
    try {
      const res = await fetch(`/v1/admin/earnings/payout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount }),
      });
      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Failed to process payout:', error);
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
      <header className="bg-[#0f172a] border-b border-[#1e293b] px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Earnings Management</h1>
            <p className="text-[#94a3b8] text-sm">Manage user earnings and payouts</p>
          </div>
          <Link href="/admin/dashboard" className="text-sm text-[#94a3b8] hover:text-white">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="p-8">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
              <div className="text-[#94a3b8] text-sm mb-2">Total Earnings</div>
              <div className="text-3xl font-bold">${summary.totalEarnings.toFixed(2)}</div>
            </div>
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
              <div className="text-[#94a3b8] text-sm mb-2">Pending</div>
              <div className="text-3xl font-bold text-yellow-400">${summary.pendingEarnings.toFixed(2)}</div>
              <div className="text-xs text-[#94a3b8] mt-2">{summary.pendingUsers} users</div>
            </div>
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
              <div className="text-[#94a3b8] text-sm mb-2">Paid</div>
              <div className="text-3xl font-bold text-green-400">${summary.paidEarnings.toFixed(2)}</div>
            </div>
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
              <div className="text-[#94a3b8] text-sm mb-2">Total Users</div>
              <div className="text-3xl font-bold">{summary.totalUsers}</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setTab('overview')}
            className={`px-4 py-2 rounded-lg ${tab === 'overview' ? 'bg-[#00c9ff] text-black' : 'bg-[#1e293b]'}`}
          >
            Overview
          </button>
          <button
            onClick={() => setTab('users')}
            className={`px-4 py-2 rounded-lg ${tab === 'users' ? 'bg-[#00c9ff] text-black' : 'bg-[#1e293b]'}`}
          >
            User Earnings
          </button>
          <button
            onClick={() => setTab('payouts')}
            className={`px-4 py-2 rounded-lg ${tab === 'payouts' ? 'bg-[#00c9ff] text-black' : 'bg-[#1e293b]'}`}
          >
            Payouts
          </button>
        </div>

        {/* User Earnings Table */}
        {tab === 'users' && (
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#1e293b]">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">User</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Keys</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Total</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Pending</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Paid</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.userId} className="border-b border-[#1e293b] last:border-0">
                    <td className="px-6 py-4">{u.userEmail}</td>
                    <td className="px-6 py-4">{u.keyCount}</td>
                    <td className="px-6 py-4">${u.totalEarnings.toFixed(2)}</td>
                    <td className="px-6 py-4 text-yellow-400">${u.pendingEarnings.toFixed(2)}</td>
                    <td className="px-6 py-4 text-green-400">${u.paidEarnings.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      {u.pendingEarnings > 0 && (
                        <button
                          onClick={() => handlePayout(u.userId, u.pendingEarnings)}
                          className="text-[#00c9ff] hover:underline"
                        >
                          Payout
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'overview' && (
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">📊 Earnings Overview</h2>
            <p className="text-[#94a3b8]">Earnings distribution and trends will be displayed here.</p>
          </div>
        )}

        {tab === 'payouts' && (
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">💰 Payout History</h2>
            <p className="text-[#94a3b8]">Payout history will be displayed here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
