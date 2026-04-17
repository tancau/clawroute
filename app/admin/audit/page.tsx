/**
 * Admin Audit Logs Page
 * 审计日志查看页面
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface AuditLog {
  id: string;
  userId: string;
  userEmail?: string;
  teamId?: string;
  teamName?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: Record<string, unknown>;
  ip: string;
  userAgent: string;
  timestamp: number;
}

interface AuditStats {
  totalLogs: number;
  uniqueUsers: number;
  uniqueTeams: number;
  actionCounts: { action: string; count: number }[];
  resourceCounts: { resource: string; count: number }[];
  dailyCounts: { date: string; count: number }[];
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [resource, setResource] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showStats, setShowStats] = useState(false);
  const limit = 20;

  useEffect(() => {
    loadLogs();
  }, [page, action, resource]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        offset: (page * limit).toString(),
        limit: limit.toString(),
      });
      if (search) params.append('search', search);
      if (action) params.append('action', action);
      if (resource) params.append('resource', resource);

      const res = await fetch(`/v1/admin/audit?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadLogs();
  };

  const loadStats = async () => {
    try {
      const res = await fetch('/v1/admin/audit/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || data);
        setShowStats(true);
      }
    } catch (error) {
      console.error('Failed to load audit stats:', error);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const params = new URLSearchParams({ format });
      if (action) params.append('action', action);
      if (resource) params.append('resource', resource);
      if (search) params.append('search', search);

      const res = await fetch(`/v1/admin/audit/export?${params}`);
      if (res.ok) {
        const blob = format === 'csv'
          ? new Blob([await res.text()], { type: 'text/csv' })
          : new Blob([await res.text()], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-logs.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export audit logs:', error);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const formatDate = (ts: number) => new Date(ts).toLocaleString();

  const getActionColor = (act: string) => {
    if (act.includes('create') || act.includes('accept')) return 'bg-green-500/20 text-green-400';
    if (act.includes('delete') || act.includes('revoke') || act.includes('suspend')) return 'bg-red-500/20 text-red-400';
    if (act.includes('update') || act.includes('update_role')) return 'bg-blue-500/20 text-blue-400';
    if (act.includes('invite')) return 'bg-purple-500/20 text-purple-400';
    return 'bg-gray-500/20 text-gray-400';
  };

  // Stats view
  if (showStats && stats) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white">
        <header className="bg-[#0f172a] border-b border-[#1e293b] px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">📋 Audit Statistics</h1>
            </div>
            <button
              onClick={() => setShowStats(false)}
              className="text-sm text-[#94a3b8] hover:text-white"
            >
              ← Back to Logs
            </button>
          </div>
        </header>

        <div className="p-8">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
              <div className="text-[#94a3b8] text-sm mb-2">Total Logs</div>
              <div className="text-3xl font-bold">{stats.totalLogs.toLocaleString()}</div>
            </div>
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
              <div className="text-[#94a3b8] text-sm mb-2">Unique Users</div>
              <div className="text-3xl font-bold">{stats.uniqueUsers.toLocaleString()}</div>
            </div>
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
              <div className="text-[#94a3b8] text-sm mb-2">Unique Teams</div>
              <div className="text-3xl font-bold">{stats.uniqueTeams.toLocaleString()}</div>
            </div>
          </div>

          {/* Daily Trend */}
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">📊 Daily Activity (Last 7 Days)</h2>
            <div className="space-y-2">
              {stats.dailyCounts.map((day, index) => {
                const maxCount = Math.max(...stats.dailyCounts.map(d => d.count), 1);
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
                          {day.count.toLocaleString()} events
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Action Types */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">🔄 Top Actions</h2>
              <div className="space-y-2">
                {stats.actionCounts.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-[#1e293b] last:border-0">
                    <span className={`px-2 py-1 rounded text-xs ${getActionColor(item.action)}`}>{item.action}</span>
                    <span className="text-sm font-medium">{item.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Resource Types */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">📦 Top Resources</h2>
              <div className="space-y-2">
                {stats.resourceCounts.map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-[#1e293b] last:border-0">
                    <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400">{item.resource}</span>
                    <span className="text-sm font-medium">{item.count.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Detail modal
  if (selectedLog) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white">
        <header className="bg-[#0f172a] border-b border-[#1e293b] px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">📋 Log Detail</h1>
              <p className="text-[#94a3b8] text-sm">ID: {selectedLog.id}</p>
            </div>
            <button
              onClick={() => setSelectedLog(null)}
              className="text-sm text-[#94a3b8] hover:text-white"
            >
              ← Back to Logs
            </button>
          </div>
        </header>

        <div className="p-8">
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-[#94a3b8] text-sm">Timestamp</div>
                <div>{formatDate(selectedLog.timestamp)}</div>
              </div>
              <div>
                <div className="text-[#94a3b8] text-sm">User</div>
                <div>{selectedLog.userEmail || selectedLog.userId}</div>
              </div>
              <div>
                <div className="text-[#94a3b8] text-sm">Action</div>
                <span className={`px-2 py-1 rounded text-xs ${getActionColor(selectedLog.action)}`}>{selectedLog.action}</span>
              </div>
              <div>
                <div className="text-[#94a3b8] text-sm">Resource</div>
                <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400">{selectedLog.resource}</span>
              </div>
              {selectedLog.teamName && (
                <div>
                  <div className="text-[#94a3b8] text-sm">Team</div>
                  <div>{selectedLog.teamName}</div>
                </div>
              )}
              {selectedLog.resourceId && (
                <div>
                  <div className="text-[#94a3b8] text-sm">Resource ID</div>
                  <div className="font-mono text-sm">{selectedLog.resourceId}</div>
                </div>
              )}
              <div>
                <div className="text-[#94a3b8] text-sm">IP Address</div>
                <div className="font-mono text-sm">{selectedLog.ip || 'N/A'}</div>
              </div>
              <div>
                <div className="text-[#94a3b8] text-sm">User Agent</div>
                <div className="text-sm truncate max-w-md">{selectedLog.userAgent || 'N/A'}</div>
              </div>
            </div>

            {selectedLog.details && Object.keys(selectedLog.details).length > 0 && (
              <div className="mt-6">
                <div className="text-[#94a3b8] text-sm mb-2">Details</div>
                <pre className="bg-[#1e293b] p-4 rounded-lg text-sm overflow-x-auto">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            )}
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
            <h1 className="text-2xl font-bold">📋 Audit Logs</h1>
            <p className="text-[#94a3b8] text-sm">{total} total log entries</p>
          </div>
          <div className="flex gap-4 items-center">
            <button
              onClick={loadStats}
              className="bg-[#00c9ff]/20 text-[#00c9ff] px-4 py-2 rounded-lg hover:bg-[#00c9ff]/30 text-sm"
            >
              📊 Stats
            </button>
            <button
              onClick={() => handleExport('json')}
              className="bg-blue-500/20 text-blue-400 px-4 py-2 rounded-lg hover:bg-blue-500/30 text-sm"
            >
              Export JSON
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="bg-green-500/20 text-green-400 px-4 py-2 rounded-lg hover:bg-green-500/30 text-sm"
            >
              Export CSV
            </button>
            <Link href="/admin/dashboard" className="text-sm text-[#94a3b8] hover:text-white">
              ← Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="p-8">
        {/* Filters */}
        <div className="flex gap-4 mb-6 flex-wrap">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-[300px]">
            <input
              type="text"
              placeholder="Search by email, action, or details..."
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
          <input
            type="text"
            placeholder="Action filter..."
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(0); }}
            className="bg-[#0f172a] border border-[#1e293b] rounded-lg px-4 py-2 text-white placeholder-[#94a3b8] w-40"
          />
          <input
            type="text"
            placeholder="Resource filter..."
            value={resource}
            onChange={(e) => { setResource(e.target.value); setPage(0); }}
            className="bg-[#0f172a] border border-[#1e293b] rounded-lg px-4 py-2 text-white placeholder-[#94a3b8] w-40"
          />
        </div>

        {/* Logs Table */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden">
          {loading ? (
            <div className="text-center py-8 text-[#94a3b8]">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-[#94a3b8]">No audit logs found</div>
          ) : (
            <table className="w-full">
              <thead className="bg-[#1e293b]">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[#94a3b8]">Time</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[#94a3b8]">User</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[#94a3b8]">Action</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[#94a3b8]">Resource</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[#94a3b8]">Team</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[#94a3b8]">IP</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-[#94a3b8]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-[#1e293b] last:border-0 hover:bg-[#1e293b]/30">
                    <td className="px-4 py-3 text-sm text-[#94a3b8] whitespace-nowrap">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-4 py-3 text-sm">{log.userEmail || log.userId.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400">
                        {log.resource}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{log.teamName || '—'}</td>
                    <td className="px-4 py-3 text-sm font-mono text-[#94a3b8]">{log.ip || '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-[#00c9ff] hover:underline text-sm"
                      >
                        View
                      </button>
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
