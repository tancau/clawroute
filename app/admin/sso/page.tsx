/**
 * Admin SSO Management Page
 * SSO 管理后台页面
 */

'use client';

import { useState, useEffect } from 'react';

interface SSOProvider {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  connectionCount: number;
  createdAt: number;
}

interface SSOConnection {
  id: string;
  teamId: string;
  teamName?: string;
  providerId: string;
  providerName?: string;
  domain: string;
  status: 'pending' | 'active' | 'disabled' | 'rejected';
  createdAt: number;
  updatedAt: number;
}

export default function AdminSSOPage() {
  const [activeTab, setActiveTab] = useState<'providers' | 'connections'>('providers');
  const [providers, setProviders] = useState<SSOProvider[]>([]);
  const [connections, setConnections] = useState<SSOConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'providers') {
        const res = await fetch('/v1/admin/sso/providers');
        if (res.ok) {
          const data = await res.json();
          setProviders(data.providers || []);
        }
      } else {
        const res = await fetch('/v1/admin/sso/connections');
        if (res.ok) {
          const data = await res.json();
          setConnections(data.connections || []);
        }
      }
    } catch (error) {
      console.error('Failed to load SSO data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleProvider = async (providerId: string, currentlyEnabled: boolean) => {
    try {
      const endpoint = currentlyEnabled ? 'disable' : 'enable';
      const res = await fetch(`/v1/admin/sso/providers/${providerId}/${endpoint}`, { method: 'POST' });
      if (res.ok) {
        loadData();
      }
    } catch {
      console.error('Failed to toggle provider');
    }
  };

  const approveConnection = async (connectionId: string) => {
    try {
      const res = await fetch(`/v1/admin/sso/connections/${connectionId}/approve`, { method: 'POST' });
      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Failed to approve connection:', error);
    }
  };

  const rejectConnection = async (connectionId: string) => {
    try {
      const res = await fetch(`/v1/admin/sso/connections/${connectionId}/reject`, { method: 'POST' });
      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Failed to reject connection:', error);
    }
  };

  const testConnection = async (connectionId: string) => {
    setTestResult(null);
    try {
      const res = await fetch(`/v1/admin/sso/connections/${connectionId}/test`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setTestResult(data);
      }
    } catch {
      setTestResult({ success: false, message: 'Test failed' });
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-900/30 text-yellow-400 border-yellow-700',
      active: 'bg-green-900/30 text-green-400 border-green-700',
      disabled: 'bg-gray-900/30 text-gray-400 border-gray-700',
      rejected: 'bg-red-900/30 text-red-400 border-red-700',
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full border ${colors[status] || colors.disabled}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      <header className="bg-[#0f172a] border-b border-[#1e293b] px-8 py-4">
        <h1 className="text-2xl font-bold">🔐 SSO Management</h1>
        <p className="text-[#94a3b8] text-sm">Manage SSO providers and connections</p>
      </header>

      <div className="p-8">
        {/* Tab Navigation */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('providers')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'providers'
                ? 'bg-[#00c9ff] text-black font-semibold'
                : 'bg-[#0f172a] border border-[#1e293b] text-[#94a3b8] hover:text-white'
            }`}
          >
            SSO Providers
          </button>
          <button
            onClick={() => setActiveTab('connections')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'connections'
                ? 'bg-[#00c9ff] text-black font-semibold'
                : 'bg-[#0f172a] border border-[#1e293b] text-[#94a3b8] hover:text-white'
            }`}
          >
            SSO Connections
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-[#94a3b8]">Loading...</div>
        ) : activeTab === 'providers' ? (
          /* Providers Table */
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e293b]">
                  <th className="text-left px-6 py-3 text-sm text-[#94a3b8]">Provider</th>
                  <th className="text-left px-6 py-3 text-sm text-[#94a3b8]">Type</th>
                  <th className="text-left px-6 py-3 text-sm text-[#94a3b8]">Status</th>
                  <th className="text-left px-6 py-3 text-sm text-[#94a3b8]">Connections</th>
                  <th className="text-left px-6 py-3 text-sm text-[#94a3b8]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {providers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-[#94a3b8]">No SSO providers found</td>
                  </tr>
                ) : (
                  providers.map((provider) => (
                    <tr key={provider.id} className="border-b border-[#1e293b] hover:bg-[#1e293b]/30">
                      <td className="px-6 py-4 font-medium">{provider.name}</td>
                      <td className="px-6 py-4 text-sm text-[#94a3b8] uppercase">{provider.type}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full border ${provider.enabled ? 'bg-green-900/30 text-green-400 border-green-700' : 'bg-red-900/30 text-red-400 border-red-700'}`}>
                          {provider.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">{provider.connectionCount}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleProvider(provider.id, provider.enabled)}
                          className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                            provider.enabled
                              ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                              : 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                          }`}
                        >
                          {provider.enabled ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Connections Table */
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1e293b]">
                  <th className="text-left px-6 py-3 text-sm text-[#94a3b8]">Team</th>
                  <th className="text-left px-6 py-3 text-sm text-[#94a3b8]">Provider</th>
                  <th className="text-left px-6 py-3 text-sm text-[#94a3b8]">Domain</th>
                  <th className="text-left px-6 py-3 text-sm text-[#94a3b8]">Status</th>
                  <th className="text-left px-6 py-3 text-sm text-[#94a3b8]">Created</th>
                  <th className="text-left px-6 py-3 text-sm text-[#94a3b8]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {connections.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-[#94a3b8]">No SSO connections found</td>
                  </tr>
                ) : (
                  connections.map((conn) => (
                    <tr key={conn.id} className="border-b border-[#1e293b] hover:bg-[#1e293b]/30">
                      <td className="px-6 py-4 font-medium">{conn.teamName || conn.teamId}</td>
                      <td className="px-6 py-4 text-sm text-[#94a3b8]">{conn.providerName || conn.providerId}</td>
                      <td className="px-6 py-4 text-sm">{conn.domain}</td>
                      <td className="px-6 py-4">{statusBadge(conn.status)}</td>
                      <td className="px-6 py-4 text-sm text-[#94a3b8]">
                        {new Date(conn.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          {conn.status === 'pending' && (
                            <>
                              <button
                                onClick={() => approveConnection(conn.id)}
                                className="px-3 py-1 text-sm rounded-lg bg-green-900/30 text-green-400 hover:bg-green-900/50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => rejectConnection(conn.id)}
                                className="px-3 py-1 text-sm rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {conn.status === 'active' && (
                            <button
                              onClick={() => testConnection(conn.id)}
                              className="px-3 py-1 text-sm rounded-lg bg-blue-900/30 text-blue-400 hover:bg-blue-900/50"
                            >
                              Test
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Test Result */}
        {testResult && (
          <div className={`mt-4 p-4 rounded-xl border ${
            testResult.success
              ? 'bg-green-900/20 border-green-700 text-green-400'
              : 'bg-red-900/20 border-red-700 text-red-400'
          }`}>
            <div className="font-semibold mb-1">
              {testResult.success ? '✅ Test Passed' : '❌ Test Failed'}
            </div>
            <div className="text-sm">{testResult.message}</div>
          </div>
        )}
      </div>
    </div>
  );
}
