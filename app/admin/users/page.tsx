/**
 * Admin Users Page
 * 用户管理页面
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  credits: number;
  createdAt: number;
  lastActiveAt: number | null;
  keyCount: number;
  requestCount: number;
  totalCost: number;
  status: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const limit = 20;

  useEffect(() => {
    loadUsers();
  }, [page, status]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        offset: (page * limit).toString(),
        limit: limit.toString(),
      });
      if (search) params.append('search', search);
      if (status) params.append('status', status);

      const res = await fetch(`/v1/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadUsers();
  };

  const handleSuspend = async (userId: string) => {
    if (!confirm('Are you sure you want to suspend this user?')) return;
    
    try {
      const res = await fetch(`/v1/admin/users/${userId}/suspend`, { method: 'POST' });
      if (res.ok) {
        loadUsers();
      }
    } catch (error) {
      console.error('Failed to suspend user:', error);
    }
  };

  const handleUnsuspend = async (userId: string) => {
    try {
      const res = await fetch(`/v1/admin/users/${userId}/unsuspend`, { method: 'POST' });
      if (res.ok) {
        loadUsers();
      }
    } catch (error) {
      console.error('Failed to unsuspend user:', error);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      {/* Header */}
      <header className="bg-[#0f172a] border-b border-[#1e293b] px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-[#94a3b8] text-sm">{total} total users</p>
          </div>
          <Link href="/admin/dashboard" className="text-sm text-[#94a3b8] hover:text-white">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="p-8">
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <input
              type="text"
              placeholder="Search by email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-[#0f172a] border border-[#1e293b] rounded-lg px-4 py-2 text-white placeholder-[#94a3b8]"
            />
            <button
              type="submit"
              className="bg-[#00c9ff] text-black px-4 py-2 rounded-lg font-medium hover:bg-[#00a8e0]"
            >
              Search
            </button>
          </form>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(0); }}
            className="bg-[#0f172a] border border-[#1e293b] rounded-lg px-4 py-2 text-white"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>
        </div>

        {/* Users Table */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden">
          {loading ? (
            <div className="text-center py-8 text-[#94a3b8]">Loading...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-[#94a3b8]">No users found</div>
          ) : (
            <table className="w-full">
              <thead className="bg-[#1e293b]">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Email</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Credits</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Keys</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Requests</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Cost</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Status</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-[#1e293b] last:border-0">
                    <td className="px-6 py-4">
                      <Link href={`/admin/users/${user.id}`} className="text-[#00c9ff] hover:underline">
                        {user.email}
                      </Link>
                    </td>
                    <td className="px-6 py-4">{user.credits.toLocaleString()}</td>
                    <td className="px-6 py-4">{user.keyCount}</td>
                    <td className="px-6 py-4">{user.requestCount.toLocaleString()}</td>
                    <td className="px-6 py-4">${user.totalCost.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          user.status === 'active'
                            ? 'bg-green-500/20 text-green-400'
                            : user.status === 'suspended'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.status === 'active' ? (
                        <button
                          onClick={() => handleSuspend(user.id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Suspend
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnsuspend(user.id)}
                          className="text-green-400 hover:text-green-300 text-sm"
                        >
                          Unsuspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-4 py-2 bg-[#0f172a] border border-[#1e293b] rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-[#94a3b8]">
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-4 py-2 bg-[#0f172a] border border-[#1e293b] rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
