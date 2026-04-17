/**
 * Admin Custom Routing Rules Management Page
 * 定制路由规则管理后台页面
 */

'use client';

import { useState, useEffect } from 'react';

interface CustomRule {
  id: string;
  teamId: string;
  teamName?: string;
  name: string;
  description: string | null;
  condition: Record<string, unknown>;
  action: Record<string, unknown>;
  priority: number;
  enabled: boolean;
  status: 'pending' | 'approved' | 'rejected';
  matchCount: number;
  lastMatchedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

interface RuleStats {
  totalRules: number;
  activeRules: number;
  pendingApproval: number;
  totalMatches: number;
}

interface TestResult {
  matched: boolean;
  matchReason?: string;
  action?: Record<string, unknown>;
  executionTimeMs: number;
}

export default function AdminCustomRoutesPage() {
  const [rules, setRules] = useState<CustomRule[]>([]);
  const [stats, setStats] = useState<RuleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [selectedRule, setSelectedRule] = useState<CustomRule | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testModel, setTestModel] = useState('gpt-4');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadRules();
  }, [filterStatus]);

  const loadRules = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set('status', filterStatus);

      const [rulesRes, statsRes] = await Promise.all([
        fetch(`/v1/admin/custom-routes?${params.toString()}`),
        fetch('/v1/admin/custom-routes/stats'),
      ]);

      if (rulesRes.ok) {
        const data = await rulesRes.json();
        setRules(data.rules || []);
      }
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const approveRule = async (ruleId: string) => {
    try {
      const res = await fetch(`/v1/admin/custom-routes/${ruleId}/approve`, { method: 'POST' });
      if (res.ok) {
        loadRules();
        setSelectedRule(null);
      }
    } catch (error) {
      console.error('Failed to approve rule:', error);
    }
  };

  const rejectRule = async (ruleId: string) => {
    try {
      const reason = prompt('Rejection reason (optional):');
      const res = await fetch(`/v1/admin/custom-routes/${ruleId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        loadRules();
        setSelectedRule(null);
      }
    } catch (error) {
      console.error('Failed to reject rule:', error);
    }
  };

  const toggleRule = async (ruleId: string, currentlyEnabled: boolean) => {
    try {
      const res = await fetch(`/v1/admin/custom-routes/${ruleId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !currentlyEnabled }),
      });
      if (res.ok) {
        loadRules();
      }
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
  };

  const testRuleAction = async (ruleId: string) => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/v1/admin/custom-routes/${ruleId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: testModel }),
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult(data);
      }
    } catch (error) {
      console.error('Failed to test rule:', error);
    } finally {
      setTesting(false);
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
        <h1 className="text-2xl font-bold">🔀 Custom Routing Rules</h1>
        <p className="text-[#94a3b8] text-sm">Review and manage custom routing rules</p>
      </header>

      <div className="p-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4">
              <div className="text-[#94a3b8] text-xs">Total Rules</div>
              <div className="text-2xl font-bold">{stats.totalRules}</div>
            </div>
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4">
              <div className="text-green-400 text-xs">Active Rules</div>
              <div className="text-2xl font-bold text-green-400">{stats.activeRules}</div>
            </div>
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4">
              <div className="text-yellow-400 text-xs">Pending Approval</div>
              <div className="text-2xl font-bold text-yellow-400">{stats.pendingApproval}</div>
            </div>
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-4">
              <div className="text-blue-400 text-xs">Total Matches</div>
              <div className="text-2xl font-bold text-blue-400">{stats.totalMatches.toLocaleString()}</div>
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
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rules List */}
          <div className="lg:col-span-2">
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1e293b]">
                    <th className="text-left px-6 py-3 text-sm text-[#94a3b8]">Rule Name</th>
                    <th className="text-left px-6 py-3 text-sm text-[#94a3b8]">Team</th>
                    <th className="text-left px-6 py-3 text-sm text-[#94a3b8]">Priority</th>
                    <th className="text-left px-6 py-3 text-sm text-[#94a3b8]">Status</th>
                    <th className="text-left px-6 py-3 text-sm text-[#94a3b8]">Matches</th>
                    <th className="text-left px-6 py-3 text-sm text-[#94a3b8]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={6} className="text-center py-8 text-[#94a3b8]">Loading...</td></tr>
                  ) : rules.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-[#94a3b8]">No custom routing rules found</td></tr>
                  ) : (
                    rules.map((rule) => (
                      <tr
                        key={rule.id}
                        className={`border-b border-[#1e293b] hover:bg-[#1e293b]/30 cursor-pointer ${
                          selectedRule?.id === rule.id ? 'bg-[#1e293b]/50' : ''
                        }`}
                        onClick={() => setSelectedRule(rule)}
                      >
                        <td className="px-6 py-4">
                          <div className="font-medium">{rule.name}</div>
                          {rule.description && (
                            <div className="text-xs text-[#94a3b8] mt-1">{rule.description}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm">{rule.teamName || rule.teamId}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className="bg-[#1e293b] px-2 py-1 rounded text-xs">
                            P{rule.priority}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {statusBadge(rule.status)}
                            {rule.status === 'approved' && (
                              <span className={`text-xs ${rule.enabled ? 'text-green-400' : 'text-gray-500'}`}>
                                {rule.enabled ? '● ON' : '○ OFF'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm">{rule.matchCount.toLocaleString()}</td>
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2">
                            {rule.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => approveRule(rule.id)}
                                  className="px-3 py-1 text-sm rounded-lg bg-green-900/30 text-green-400 hover:bg-green-900/50"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => rejectRule(rule.id)}
                                  className="px-3 py-1 text-sm rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                            {rule.status === 'approved' && (
                              <button
                                onClick={() => toggleRule(rule.id, rule.enabled)}
                                className={`px-3 py-1 text-sm rounded-lg ${
                                  rule.enabled
                                    ? 'bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50'
                                    : 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                                }`}
                              >
                                {rule.enabled ? 'Disable' : 'Enable'}
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
          </div>

          {/* Detail Panel */}
          <div>
            {selectedRule ? (
              <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
                <h3 className="text-lg font-semibold mb-4">Rule Details</h3>
                <div className="space-y-3">
                  <div>
                    <div className="text-[#94a3b8] text-sm">Name</div>
                    <div className="font-medium">{selectedRule.name}</div>
                  </div>
                  {selectedRule.description && (
                    <div>
                      <div className="text-[#94a3b8] text-sm">Description</div>
                      <div className="text-sm">{selectedRule.description}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-[#94a3b8] text-sm">Team</div>
                    <div>{selectedRule.teamName || selectedRule.teamId}</div>
                  </div>
                  <div>
                    <div className="text-[#94a3b8] text-sm">Priority</div>
                    <div>P{selectedRule.priority}</div>
                  </div>
                  <div>
                    <div className="text-[#94a3b8] text-sm">Condition</div>
                    <pre className="bg-[#1e293b] p-3 rounded-lg text-xs overflow-auto max-h-32">
                      {JSON.stringify(selectedRule.condition, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <div className="text-[#94a3b8] text-sm">Action</div>
                    <pre className="bg-[#1e293b] p-3 rounded-lg text-xs overflow-auto max-h-32">
                      {JSON.stringify(selectedRule.action, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <div className="text-[#94a3b8] text-sm">Stats</div>
                    <div className="text-sm">
                      {selectedRule.matchCount} matches
                      {selectedRule.lastMatchedAt && (
                        <span className="text-[#94a3b8]">
                          {' '}(last: {new Date(selectedRule.lastMatchedAt).toLocaleString()})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Test Section */}
                <div className="mt-6 border-t border-[#1e293b] pt-4">
                  <h4 className="font-semibold mb-3">Test Rule</h4>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={testModel}
                      onChange={(e) => setTestModel(e.target.value)}
                      placeholder="Model name (e.g. gpt-4)"
                      className="flex-1 bg-[#1e293b] border border-[#334155] rounded-lg px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => testRuleAction(selectedRule.id)}
                      disabled={testing}
                      className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                    >
                      {testing ? 'Testing...' : 'Test'}
                    </button>
                  </div>
                  {testResult && (
                    <div className={`p-3 rounded-lg text-sm ${
                      testResult.matched
                        ? 'bg-green-900/20 border border-green-700 text-green-400'
                        : 'bg-gray-900/20 border border-gray-700 text-gray-400'
                    }`}>
                      <div className="font-semibold">
                        {testResult.matched ? '✅ Matched' : '❌ Not Matched'}
                      </div>
                      {testResult.matchReason && (
                        <div className="text-xs mt-1">{testResult.matchReason}</div>
                      )}
                      {testResult.action && (
                        <pre className="text-xs mt-2 bg-[#1e293b] p-2 rounded overflow-auto">
                          {JSON.stringify(testResult.action, null, 2)}
                        </pre>
                      )}
                      <div className="text-xs mt-1 text-[#94a3b8]">
                        Execution: {testResult.executionTimeMs}ms
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 text-center text-[#94a3b8]">
                Select a rule to view details and test
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
