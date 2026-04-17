/**
 * Admin Branding Management Page
 * 品牌定制管理后台页面
 */

'use client';

import { useState, useEffect } from 'react';

interface BrandConfig {
  id: string;
  teamId: string;
  teamName?: string;
  logo: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  companyName: string | null;
  customDomain: string | null;
  customDomainVerified: boolean;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  updatedAt: number;
}

interface DomainVerification {
  domain: string;
  verified: boolean;
  method: string;
  record: string;
  expectedValue: string;
  actualValue?: string;
}

export default function AdminBrandingPage() {
  const [configs, setConfigs] = useState<BrandConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedConfig, setSelectedConfig] = useState<BrandConfig | null>(null);
  const [domainVerification, setDomainVerification] = useState<DomainVerification | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    loadConfigs();
  }, [filterStatus]);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);
      const res = await fetch(`/v1/admin/branding?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setConfigs(data.configs || []);
      }
    } catch (error) {
      console.error('Failed to load brand configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveConfig = async (configId: string) => {
    try {
      const res = await fetch(`/v1/admin/branding/${configId}/approve`, { method: 'POST' });
      if (res.ok) {
        loadConfigs();
        setSelectedConfig(null);
      }
    } catch (error) {
      console.error('Failed to approve config:', error);
    }
  };

  const rejectConfig = async (configId: string) => {
    try {
      const reason = prompt('Rejection reason (optional):');
      const res = await fetch(`/v1/admin/branding/${configId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        loadConfigs();
        setSelectedConfig(null);
      }
    } catch (error) {
      console.error('Failed to reject config:', error);
    }
  };

  const verifyDomain = async (domain: string) => {
    setVerifying(true);
    setDomainVerification(null);
    try {
      const res = await fetch(`/v1/admin/branding/domains/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });
      if (res.ok) {
        const data = await res.json();
        setDomainVerification(data);
      }
    } catch (error) {
      console.error('Failed to verify domain:', error);
    } finally {
      setVerifying(false);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-900/30 text-yellow-400 border-yellow-700',
      approved: 'bg-green-900/30 text-green-400 border-green-700',
      rejected: 'bg-red-900/30 text-red-400 border-red-700',
    };
    return (
      <span className={`px-2 py-1 text-xs rounded-full border ${colors[status] || ''}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      <header className="bg-[#0f172a] border-b border-[#1e293b] px-8 py-4">
        <h1 className="text-2xl font-bold">🎨 Branding Management</h1>
        <p className="text-[#94a3b8] text-sm">Review and manage team branding configurations</p>
      </header>

      <div className="p-8">
        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#0f172a] border border-[#1e293b] rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Config List */}
          <div className="lg:col-span-2">
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1e293b]">
                    <th className="text-left px-6 py-3 text-sm text-[#94a3b8]">Team</th>
                    <th className="text-left px-6 py-3 text-sm text-[#94a3b8]">Company</th>
                    <th className="text-left px-6 py-3 text-sm text-[#94a3b8]">Domain</th>
                    <th className="text-left px-6 py-3 text-sm text-[#94a3b8]">Status</th>
                    <th className="text-left px-6 py-3 text-sm text-[#94a3b8]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={5} className="text-center py-8 text-[#94a3b8]">Loading...</td></tr>
                  ) : configs.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-[#94a3b8]">No brand configs found</td></tr>
                  ) : (
                    configs.map((config) => (
                      <tr
                        key={config.id}
                        className={`border-b border-[#1e293b] hover:bg-[#1e293b]/30 cursor-pointer ${
                          selectedConfig?.id === config.id ? 'bg-[#1e293b]/50' : ''
                        }`}
                        onClick={() => setSelectedConfig(config)}
                      >
                        <td className="px-6 py-4 font-medium">{config.teamName || config.teamId}</td>
                        <td className="px-6 py-4 text-sm">{config.companyName || '—'}</td>
                        <td className="px-6 py-4 text-sm">
                          {config.customDomain ? (
                            <span className="flex items-center gap-2">
                              {config.customDomain}
                              {config.customDomainVerified ? (
                                <span className="text-green-400 text-xs">✓ Verified</span>
                              ) : (
                                <span className="text-yellow-400 text-xs">⚠ Unverified</span>
                              )}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-6 py-4">{statusBadge(config.status)}</td>
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          {config.status === 'pending' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => approveConfig(config.id)}
                                className="px-3 py-1 text-sm rounded-lg bg-green-900/30 text-green-400 hover:bg-green-900/50"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => rejectConfig(config.id)}
                                className="px-3 py-1 text-sm rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail Panel */}
          <div>
            {selectedConfig ? (
              <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Brand Details</h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-[#94a3b8] text-sm">Team</div>
                    <div className="font-medium">{selectedConfig.teamName || selectedConfig.teamId}</div>
                  </div>
                  {selectedConfig.companyName && (
                    <div>
                      <div className="text-[#94a3b8] text-sm">Company Name</div>
                      <div>{selectedConfig.companyName}</div>
                    </div>
                  )}
                  {selectedConfig.primaryColor && (
                    <div>
                      <div className="text-[#94a3b8] text-sm">Primary Color</div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full border border-[#1e293b]"
                          style={{ backgroundColor: selectedConfig.primaryColor }}
                        />
                        <span>{selectedConfig.primaryColor}</span>
                      </div>
                    </div>
                  )}
                  {selectedConfig.secondaryColor && (
                    <div>
                      <div className="text-[#94a3b8] text-sm">Secondary Color</div>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full border border-[#1e293b]"
                          style={{ backgroundColor: selectedConfig.secondaryColor }}
                        />
                        <span>{selectedConfig.secondaryColor}</span>
                      </div>
                    </div>
                  )}
                  {selectedConfig.logo && (
                    <div>
                      <div className="text-[#94a3b8] text-sm">Logo</div>
                      <img
                        src={selectedConfig.logo}
                        alt="Brand logo"
                        className="w-24 h-24 object-contain bg-white rounded-lg p-2 mt-1"
                      />
                    </div>
                  )}
                  {selectedConfig.customDomain && (
                    <div>
                      <div className="text-[#94a3b8] text-sm">Custom Domain</div>
                      <div className="flex items-center gap-2">
                        <span>{selectedConfig.customDomain}</span>
                        <button
                          onClick={() => verifyDomain(selectedConfig.customDomain!)}
                          className="px-2 py-1 text-xs rounded-lg bg-blue-900/30 text-blue-400 hover:bg-blue-900/50"
                          disabled={verifying}
                        >
                          {verifying ? 'Checking...' : 'Verify DNS'}
                        </button>
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-[#94a3b8] text-sm">Status</div>
                    <div>{statusBadge(selectedConfig.status)}</div>
                  </div>
                </div>

                {selectedConfig.status === 'pending' && (
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => approveConfig(selectedConfig.id)}
                      className="flex-1 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => rejectConfig(selectedConfig.id)}
                      className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 text-center text-[#94a3b8]">
                Select a brand config to view details
              </div>
            )}

            {/* Domain Verification Result */}
            {domainVerification && (
              <div className="mt-4 bg-[#0f172a] border border-[#1e293b] rounded-xl p-4">
                <h4 className="font-semibold mb-3">DNS Verification</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-[#94a3b8]">Status:</span>{' '}
                    <span className={domainVerification.verified ? 'text-green-400' : 'text-yellow-400'}>
                      {domainVerification.verified ? '✅ Verified' : '⚠ Not Verified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#94a3b8]">Method:</span> {domainVerification.method}
                  </div>
                  <div>
                    <span className="text-[#94a3b8]">Record:</span>{' '}
                    <code className="bg-[#1e293b] px-2 py-1 rounded">{domainVerification.record}</code>
                  </div>
                  <div>
                    <span className="text-[#94a3b8]">Expected Value:</span>{' '}
                    <code className="bg-[#1e293b] px-2 py-1 rounded">{domainVerification.expectedValue}</code>
                  </div>
                  {domainVerification.actualValue && (
                    <div>
                      <span className="text-[#94a3b8]">Actual Value:</span>{' '}
                      <code className="bg-[#1e293b] px-2 py-1 rounded">{domainVerification.actualValue}</code>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
