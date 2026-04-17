/**
 * Admin Providers Page
 * Provider 管理页面
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Provider {
  provider: string;
  totalKeys: number;
  activeKeys: number;
  totalRequests: number;
  successRate: number;
  avgLatency: number;
  totalCost: number;
}

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      const res = await fetch('/v1/admin/providers');
      if (res.ok) {
        setProviders(await res.json());
      }
    } catch (error) {
      console.error('Failed to load providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (provider: string) => {
    if (!confirm(`Disable all ${provider} keys?`)) return;
    
    try {
      const res = await fetch(`/v1/admin/providers/${provider}/disable`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        alert(`Disabled ${data.count} keys`);
        loadProviders();
      }
    } catch (error) {
      console.error('Failed to disable provider:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      <header className="bg-[#0f172a] border-b border-[#1e293b] px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Provider Management</h1>
            <p className="text-[#94a3b8] text-sm">Monitor and manage API providers</p>
          </div>
          <Link href="/admin/dashboard" className="text-sm text-[#94a3b8] hover:text-white">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="p-8">
        {loading ? (
          <div className="text-center py-8 text-[#94a3b8]">Loading...</div>
        ) : (
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#1e293b]">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Provider</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Keys</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Requests</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Success Rate</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Avg Latency</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Total Cost</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((p) => (
                  <tr key={p.provider} className="border-b border-[#1e293b] last:border-0">
                    <td className="px-6 py-4 font-medium">{p.provider}</td>
                    <td className="px-6 py-4">
                      <span className="text-green-400">{p.activeKeys}</span>
                      <span className="text-[#94a3b8]"> / {p.totalKeys}</span>
                    </td>
                    <td className="px-6 py-4">{p.totalRequests.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={p.successRate >= 95 ? 'text-green-400' : p.successRate >= 80 ? 'text-yellow-400' : 'text-red-400'}>
                        {p.successRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4">{p.avgLatency.toFixed(0)}ms</td>
                    <td className="px-6 py-4">${p.totalCost.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/providers/${p.provider}`}
                        className="text-[#00c9ff] hover:underline mr-4"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleDisable(p.provider)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Disable
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
