/**
 * Admin Developer API Keys Page
 * 开发者 API Key 管理页面
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  userId: string;
  userEmail: string;
  teamId?: string;
  teamName?: string;
  permissions: string[];
  rateLimit: number;
  usageLimit: number;
  usageCount: number;
  lastUsedAt: number | null;
  expiresAt: number | null;
  createdAt: number;
  isActive: boolean;
}

interface UsageData {
  keyId: string;
  dailyUsage: { date: string; count: number }[];
  totalRequests: number;
  avgPerDay: number;
}

export default function AdminApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [showUsage, setShowUsage] = useState(false);
  const limit = 20;

  useEffect(() => {
    loadKeys();
  }, [page, status]);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        offset: (page * limit).toString(),
        limit: limit.toString(),
      });
      if (search) params.append('search', search);
      if (status) params.append('status', status);

      const res = await fetch(`/v1/admin/dev-api-keys?${params}`);
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadKeys();
  };

  const handleRevoke = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/v1/admin/dev-api-keys/${keyId}/revoke`, { method: 'POST' });
      if (res.ok) {
        loadKeys();
        if (showUsage && selectedKey?.id === keyId) {
          setShowUsage(false);
          setSelectedKey(null);
        }
      }
    } catch (error) {
      console.error('Failed to revoke API key:', error);
    }
  };

  const handleReactivate = async (keyId: string) => {
    try {
      const res = await fetch(`/v1/admin/dev-api-keys/${keyId}/reactivate`, { method: 'POST' });
      if (res.ok) {
        loadKeys();
      }
    } catch (error) {
      console.error('Failed to reactivate API key:', error);
    }
  };

  const loadUsage = async (keyId: string) => {
    try {
      const res = await fetch(`/v1/admin/dev-api-keys/${keyId}/usage`);
      if (res.ok) {
        const data = await res.json();
        setUsageData(data);
        setShowUsage(true);
        const key = keys.find(k => k.id === keyId);
        if (key) setSelectedKey(key);
      }
    } catch (error) {
      console.error('Failed to load usage data:', error);
    }
  };

  const handleBulkRevoke = async () => {
    const inactiveKeys = keys.filter(k => !k.isActive);
    if (inactiveKeys.length === 0) return;
    if (!confirm(`Revoke ${inactiveKeys.length} inactive API keys?`)) return;

    try {
      const res = await fetch('/v1/admin/dev-api-keys/bulk-revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyIds: inactiveKeys.map(k => k.id) }),
      });
      if (res.ok) loadKeys();
    } catch (error) {
      console.error('Failed to bulk revoke:', error);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const formatDate = (ts: number | null) => ts ? new Date(ts).toLocaleDateString() : 'N/A';

  // Usage detail view
  if (showUsage && usageData && selectedKey) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white">
        <header className="bg-[#0f172a] border-b border-[#1e293b] px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">🗝️ {selectedKey.name}</h1>
              <p className="text-[#94a3b8] text-sm">Prefix: {selectedKey.prefix}... · Owner: {selectedKey.userEmail}</p>
            </div>
            <button
              onClick={() => { setShowUsage(false); setSelectedKey(null); setUsageData(null); }}
              className="text-sm text-[#94a3b8] hover:text-white"
            >
              ← Back to API Keys
            </button>
          </div>
        </header>

        <div className="p-8">
          {/* Key Info */}
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 mb-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-[#94a3b8] text-sm">Status</div>
                <span className={`px-2 py-1 rounded text-xs ${
                  selectedKey.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>{selectedKey.isActive ? 'Active' : 'Inactive'}</span>
              </div>
              <div>
                <div className="text-[#94a3b8] text-sm">Rate Limit</div>
                <div>{selectedKey.rateLimit} req/min</div>
              </div>
              <div>
                <div className="text-[#94a3b8] text-sm">Usage Limit</div>
                <div>{selectedKey.usageLimit === 0 ? 'Unlimited' : selectedKey.usageLimit.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[#94a3b8] text-sm">Expires</div>
                <div>{selectedKey.expiresAt ? formatDate(selectedKey.expiresAt) : 'Never'}</div>
              </div>
            </div>

            {selectedKey.permissions.length > 0 && (
              <div className="mt-4">
                <div className="text-[#94a3b8] text-sm mb-2">Permissions</div>
                <div className="flex gap-2 flex-wrap">
                  {selectedKey.permissions.map((perm) => (
                    <span key={perm} className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">{perm}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              {selectedKey.isActive ? (
                <button
                  onClick={() => handleRevoke(selectedKey.id)}
                  className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/30 text-sm"
                >
                  Revoke Key
                </button>
              ) : (
                <button
                  onClick={() => handleReactivate(selectedKey.id)}
                  className="bg-green-500/20 text-green-400 px-4 py-2 rounded-lg hover:bg-green-500/30 text-sm"
                >
                  Reactivate Key
                </button>
              )}
            </div>
          </div>

          {/* Usage Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
              <div className="text-[#94a3b8] text-sm mb-2">Total Requests (7d)</div>
              <div className="text-3xl font-bold">{usageData.totalRequests.toLocaleString()}</div>
            </div>
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
              <div className="text-[#94a3b8] text-sm mb-2">Average / Day</div>
              <div className="text-3xl font-bold">{usageData.avgPerDay.toLocaleString()}</div>
            </div>
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
              <div className="text-[#94a3b8] text-sm mb-2">Usage Count</div>
              <div className="text-3xl font-bold">{selectedKey.usageCount.toLocaleString()}</div>
            </div>
          </div>

          {/* Daily Usage Chart */}
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">📊 Daily Usage (Last 7 Days)</h2>
            <div className="space-y-2">
              {usageData.dailyUsage.map((day, index) => {
                const maxCount = Math.max(...usageData.dailyUsage.map(d => d.count), 1);
                const width = (day.count / maxCount) * 100;
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
                          {day.count.toLocaleString()} requests
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      <header className="bg-[#0f172a] border-b border-[#1e293b] px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🗝️ API Key Management</h1>
            <p className="text-[#94a3b8] text-sm">{total} developer API keys</p>
          </div>
          <div className="flex gap-4 items-center">
            <button
              onClick={handleBulkRevoke}
              className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/30 text-sm"
            >
              Revoke Inactive
            </button>
            <Link href="/admin/dashboard" className="text-sm text-[#94a3b8] hover:text-white">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="p-8">
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <input
              type="text"
              placeholder="Search by name, email, or prefix..."
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
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Keys Table */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden">
          {loading ? (
            <div className="text-center py-8 text-[#94a3b8]">Loading...</div>
          ) : keys.length === 0 ? (
            <div className="text-center py-8 text-[#94a3b8]">No API keys found</div>
          ) : (
            <table className="w-full">
              <thead className="bg-[#1e293b]">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[#94a3b8]">Name</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[#94a3b8]">Prefix</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[#94a3b8]">Owner</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[#94a3b8]">Team</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[#94a3b8]">Usage</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[#94a3b8]">Last Used</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[#94a3b8]">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[#94a3b8]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id} className="border-b border-[#1e293b] last:border-0 hover:bg-[#1e293b]/30">
                    <td className="px-4 py-3 font-medium text-sm">{key.name}</td>
                    <td className="px-4 py-3 text-[#94a3b8] font-mono text-sm">{key.prefix}...</td>
                    <td className="px-4 py-3 text-sm">{key.userEmail}</td>
                    <td className="px-4 py-3 text-sm">{key.teamName || '—'}</td>
                    <td className="px-4 py-3 text-sm">{key.usageCount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-sm text-[#94a3b8]">{formatDate(key.lastUsedAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        key.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {key.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => loadUsage(key.id)}
                          className="text-[#00c9ff] hover:underline text-sm"
                        >
                          Usage
                        </button>
                        {key.isActive ? (
                          <button
                            onClick={() => handleRevoke(key.id)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Revoke
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReactivate(key.id)}
                            className="text-green-400 hover:text-green-300 text-sm"
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
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
