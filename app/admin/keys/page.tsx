/**
 * Admin Keys Page
 * Key 管理页面
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Key {
  id: string;
  provider: string;
  keyPreview: string;
  userId: string;
  userEmail: string;
  status: string;
  requestCount: number;
  totalCost: number;
  earnings: number;
  createdAt: number;
}

export default function AdminKeysPage() {
  const [keys, setKeys] = useState<Key[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
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
      if (status) params.append('status', status);

      const res = await fetch(`/v1/admin/keys?${params}`);
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Failed to load keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (keyId: string) => {
    try {
      const res = await fetch(`/v1/admin/keys/${keyId}/approve`, { method: 'POST' });
      if (res.ok) loadKeys();
    } catch (error) {
      console.error('Failed to approve key:', error);
    }
  };

  const handleReject = async (keyId: string) => {
    if (!confirm('Are you sure you want to reject this key?')) return;
    
    try {
      const res = await fetch(`/v1/admin/keys/${keyId}/reject`, { method: 'POST' });
      if (res.ok) loadKeys();
    } catch (error) {
      console.error('Failed to reject key:', error);
    }
  };

  const handleDisable = async (keyId: string) => {
    if (!confirm('Are you sure you want to disable this key?')) return;
    
    try {
      const res = await fetch(`/v1/admin/keys/${keyId}/disable`, { method: 'POST' });
      if (res.ok) loadKeys();
    } catch (error) {
      console.error('Failed to disable key:', error);
    }
  };

  const handleEnable = async (keyId: string) => {
    try {
      const res = await fetch(`/v1/admin/keys/${keyId}/enable`, { method: 'POST' });
      if (res.ok) loadKeys();
    } catch (error) {
      console.error('Failed to enable key:', error);
    }
  };

  const handleBulkApprove = async () => {
    const pendingKeys = keys.filter(k => k.status === 'pending');
    if (pendingKeys.length === 0) return;
    
    if (!confirm(`Approve ${pendingKeys.length} pending keys?`)) return;

    try {
      const res = await fetch('/v1/admin/keys/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyIds: pendingKeys.map(k => k.id) }),
      });
      if (res.ok) loadKeys();
    } catch (error) {
      console.error('Failed to bulk approve:', error);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      {/* Header */}
      <header className="bg-[#0f172a] border-b border-[#1e293b] px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Key Management</h1>
            <p className="text-[#94a3b8] text-sm">{total} keys</p>
          </div>
          <div className="flex gap-4 items-center">
            {status === 'pending' && keys.length > 0 && (
              <button
                onClick={handleBulkApprove}
                className="bg-green-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-600"
              >
                Approve All Pending
              </button>
            )}
            <Link href="/admin/dashboard" className="text-sm text-[#94a3b8] hover:text-white">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="p-8">
        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(0); }}
            className="bg-[#0f172a] border border-[#1e293b] rounded-lg px-4 py-2 text-white"
          >
            <option value="">All Status</option>
            <option value="pending">Pending Review</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Keys Table */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden">
          {loading ? (
            <div className="text-center py-8 text-[#94a3b8]">Loading...</div>
          ) : keys.length === 0 ? (
            <div className="text-center py-8 text-[#94a3b8]">No keys found</div>
          ) : (
            <table className="w-full">
              <thead className="bg-[#1e293b]">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Provider</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Key</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">User</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Requests</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Cost</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Earnings</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Status</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id} className="border-b border-[#1e293b] last:border-0">
                    <td className="px-6 py-4 font-medium">{key.provider}</td>
                    <td className="px-6 py-4 text-[#94a3b8] font-mono text-sm">{key.keyPreview}</td>
                    <td className="px-6 py-4 text-sm">{key.userEmail}</td>
                    <td className="px-6 py-4">{key.requestCount.toLocaleString()}</td>
                    <td className="px-6 py-4">${key.totalCost.toFixed(2)}</td>
                    <td className="px-6 py-4 text-green-400">${key.earnings.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          key.status === 'active'
                            ? 'bg-green-500/20 text-green-400'
                            : key.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : key.status === 'disabled'
                            ? 'bg-gray-500/20 text-gray-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {key.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {key.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(key.id)}
                              className="text-green-400 hover:text-green-300 text-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(key.id)}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {key.status === 'active' && (
                          <button
                            onClick={() => handleDisable(key.id)}
                            className="text-yellow-400 hover:text-yellow-300 text-sm"
                          >
                            Disable
                          </button>
                        )}
                        {key.status === 'disabled' && (
                          <button
                            onClick={() => handleEnable(key.id)}
                            className="text-green-400 hover:text-green-300 text-sm"
                          >
                            Enable
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
