/**
 * Admin Export Management Page
 * 数据导出管理后台页面
 */

'use client';

import { useState, useEffect } from 'react';

interface ExportJob {
  id: string;
  teamId: string;
  teamName?: string;
  userId: string;
  userEmail?: string;
  type: string;
  format: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  fileSize: number | null;
  fileUrl: string | null;
  error: string | null;
  createdAt: number;
  completedAt: number | null;
  expiresAt: number | null;
}

interface ExportStats {
  totalJobs: number;
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
}

export default function AdminExportsPage() {
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [stats, setStats] = useState<ExportStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [filterStatus, filterType]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      if (filterType) params.set('type', filterType);

      const [jobsRes, statsRes] = await Promise.all([
        fetch(`/v1/admin/exports?${params.toString()}`),
        fetch('/v1/admin/exports/stats'),
      ]);

      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setJobs(data.jobs || []);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load exports:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to cancel this export job?')) return;
    try {
      const res = await fetch(`/v1/admin/exports/${jobId}/cancel`, { method: 'POST' });
      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Failed to cancel job:', error);
    }
  };

  const retryJob = async (jobId: string) => {
    try {
      const res = await fetch(`/v1/admin/exports/${jobId}/retry`, { method: 'POST' });
      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Failed to retry job:', error);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-900/30 text-yellow-400 border-yellow-700',
      processing: 'bg-blue-900/30 text-blue-400 border-blue-700',
      completed: 'bg-green-900/30 text-green-400 border-green-700',
      failed: 'bg-red-900/30 text-red-400 border-red-700',
      cancelled: 'bg-gray-900/30 text-gray-400 border-gray-700',
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full border ${colors[status] || ''}`}>
        {status}
      </span>
    );
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const typeLabels: Record<string, string> = {
    audit_logs: 'Audit Logs',
    usage_data: 'Usage Data',
    billing_data: 'Billing Data',
    user_data: 'User Data',
    api_key_usage: 'API Key Usage',
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      <header className="bg-[#0f172a] border-b border-[#1e293b] px-8 py-4">
        <h1 className="text-2xl font-bold">📦 Export Management</h1>
        <p className="text-[#94a3b8] text-sm">Monitor and manage data export jobs</p>
      </header>

      <div className="p-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4">
              <div className="text-[#94a3b8] text-xs">Total</div>
              <div className="text-2xl font-bold">{stats.totalJobs}</div>
            </div>
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4">
              <div className="text-yellow-400 text-xs">Pending</div>
              <div className="text-2xl font-bold text-yellow-400">{stats.pendingJobs}</div>
            </div>
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4">
              <div className="text-blue-400 text-xs">Processing</div>
              <div className="text-2xl font-bold text-blue-400">{stats.processingJobs}</div>
            </div>
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4">
              <div className="text-green-400 text-xs">Completed</div>
              <div className="text-2xl font-bold text-green-400">{stats.completedJobs}</div>
            </div>
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4">
              <div className="text-red-400 text-xs">Failed</div>
              <div className="text-2xl font-bold text-red-400">{stats.failedJobs}</div>
            </div>
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4">
              <div className="text-gray-400 text-xs">Cancelled</div>
              <div className="text-2xl font-bold text-gray-400">{stats.cancelledJobs}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#0f172a] border border-[#1e293b] rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-[#0f172a] border border-[#1e293b] rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Types</option>
            <option value="audit_logs">Audit Logs</option>
            <option value="usage_data">Usage Data</option>
            <option value="billing_data">Billing Data</option>
            <option value="user_data">User Data</option>
            <option value="api_key_usage">API Key Usage</option>
          </select>
        </div>

        {/* Jobs Table */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1e293b]">
                <th className="text-left px-6 py-3 text-sm text-[#94a3b8]">ID</th>
                <th className="text-left px-6 py-3 text-sm text-[#94a3b8]">Team</th>
                <th className="text-left px-6 py-3 text-sm text-[#94a3b8]">Type</th>
                <th className="text-left px-6 py-3 text-sm text-[#94a3b8]">Format</th>
                <th className="text-left px-6 py-3 text-sm text-[#94a3b8]">Status</th>
                <th className="text-left px-6 py-3 text-sm text-[#94a3b8]">Size</th>
                <th className="text-left px-6 py-3 text-sm text-[#94a3b8]">Created</th>
                <th className="text-left px-6 py-3 text-sm text-[#94a3b8]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-[#94a3b8]">Loading...</td></tr>
              ) : jobs.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-[#94a3b8]">No export jobs found</td></tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="border-b border-[#1e293b] hover:bg-[#1e293b]/30">
                    <td className="px-6 py-4 text-sm font-mono">{job.id.slice(0, 12)}...</td>
                    <td className="px-6 py-4 text-sm">{job.teamName || job.teamId}</td>
                    <td className="px-6 py-4 text-sm">{typeLabels[job.type] || job.type}</td>
                    <td className="px-6 py-4 text-sm uppercase">{job.format}</td>
                    <td className="px-6 py-4">{statusBadge(job.status)}</td>
                    <td className="px-6 py-4 text-sm">{formatFileSize(job.fileSize)}</td>
                    <td className="px-6 py-4 text-sm text-[#94a3b8]">
                      {new Date(job.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {(job.status === 'pending' || job.status === 'processing') && (
                          <button
                            onClick={() => cancelJob(job.id)}
                            className="px-3 py-1 text-sm rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50"
                          >
                            Cancel
                          </button>
                        )}
                        {job.status === 'failed' && (
                          <button
                            onClick={() => retryJob(job.id)}
                            className="px-3 py-1 text-sm rounded-lg bg-blue-900/30 text-blue-400 hover:bg-blue-900/50"
                          >
                            Retry
                          </button>
                        )}
                        {job.status === 'completed' && job.fileUrl && (
                          <a
                            href={job.fileUrl}
                            className="px-3 py-1 text-sm rounded-lg bg-green-900/30 text-green-400 hover:bg-green-900/50"
                          >
                            Download
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Error Detail */}
        {jobs.some(j => j.error) && (
          <div className="mt-4 bg-[#0f172a] border border-[#1e293b] rounded-xl p-4">
            <h3 className="font-semibold mb-2">Failed Job Errors</h3>
            <div className="space-y-2">
              {jobs.filter(j => j.error).map(job => (
                <div key={job.id} className="text-sm">
                  <span className="text-[#94a3b8]">{job.id.slice(0, 12)}:</span>{' '}
                  <span className="text-red-400">{job.error}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
