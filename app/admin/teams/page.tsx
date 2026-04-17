/**
 * Admin Teams Page
 * 团队管理页面
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Team {
  id: string;
  name: string;
  ownerId: string;
  ownerEmail: string;
  memberCount: number;
  keyCount: number;
  requestCount: number;
  totalCost: number;
  status: 'active' | 'suspended' | 'banned';
  createdAt: number;
}

interface TeamDetail extends Team {
  members: TeamMember[];
  invitations: TeamInvitation[];
}

interface TeamMember {
  id: string;
  userId: string;
  email: string;
  role: string;
  joinedAt: number;
}

interface TeamInvitation {
  id: string;
  email: string;
  role: string;
  status: string;
  createdAt: number;
  expiresAt: number;
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<TeamDetail | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const limit = 20;

  useEffect(() => {
    loadTeams();
  }, [page, status]);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        offset: (page * limit).toString(),
        limit: limit.toString(),
      });
      if (search) params.append('search', search);
      if (status) params.append('status', status);

      const res = await fetch(`/v1/admin/teams?${params}`);
      if (res.ok) {
        const data = await res.json();
        setTeams(data.teams || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    loadTeams();
  };

  const loadTeamDetail = async (teamId: string) => {
    try {
      const res = await fetch(`/v1/admin/teams/${teamId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTeam(data.team || data);
        setShowDetail(true);
      }
    } catch (error) {
      console.error('Failed to load team detail:', error);
    }
  };

  const handleSuspend = async (teamId: string) => {
    if (!confirm('Are you sure you want to suspend this team? All member keys will be disabled.')) return;
    try {
      const res = await fetch(`/v1/admin/teams/${teamId}/suspend`, { method: 'POST' });
      if (res.ok) {
        loadTeams();
        if (showDetail && selectedTeam?.id === teamId) {
          loadTeamDetail(teamId);
        }
      }
    } catch (error) {
      console.error('Failed to suspend team:', error);
    }
  };

  const handleUnsuspend = async (teamId: string) => {
    try {
      const res = await fetch(`/v1/admin/teams/${teamId}/unsuspend`, { method: 'POST' });
      if (res.ok) {
        loadTeams();
        if (showDetail && selectedTeam?.id === teamId) {
          loadTeamDetail(teamId);
        }
      }
    } catch (error) {
      console.error('Failed to unsuspend team:', error);
    }
  };

  const handleRemoveMember = async (teamId: string, userId: string) => {
    if (!confirm('Are you sure you want to remove this member from the team?')) return;
    try {
      const res = await fetch(`/v1/teams/${teamId}/members/${userId}?requesterId=admin`, {
        method: 'DELETE',
      });
      if (res.ok) {
        loadTeamDetail(teamId);
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const totalPages = Math.ceil(total / limit);

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString();

  // Detail view
  if (showDetail && selectedTeam) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white">
        <header className="bg-[#0f172a] border-b border-[#1e293b] px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">🏢 {selectedTeam.name}</h1>
              <p className="text-[#94a3b8] text-sm">Team ID: {selectedTeam.id}</p>
            </div>
            <button
              onClick={() => { setShowDetail(false); setSelectedTeam(null); }}
              className="text-sm text-[#94a3b8] hover:text-white"
            >
              ← Back to Teams
            </button>
          </div>
        </header>

        <div className="p-8">
          {/* Team Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
              <div className="text-[#94a3b8] text-sm mb-2">Members</div>
              <div className="text-3xl font-bold">{selectedTeam.memberCount}</div>
            </div>
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
              <div className="text-[#94a3b8] text-sm mb-2">API Keys</div>
              <div className="text-3xl font-bold">{selectedTeam.keyCount}</div>
            </div>
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
              <div className="text-[#94a3b8] text-sm mb-2">Total Requests</div>
              <div className="text-3xl font-bold">{selectedTeam.requestCount.toLocaleString()}</div>
            </div>
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
              <div className="text-[#94a3b8] text-sm mb-2">Total Cost</div>
              <div className="text-3xl font-bold">${selectedTeam.totalCost.toFixed(2)}</div>
            </div>
          </div>

          {/* Team Info */}
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 mb-8">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[#94a3b8] text-sm">Owner:</span>
                <span className="ml-2">{selectedTeam.ownerEmail}</span>
              </div>
              <div>
                <span className="text-[#94a3b8] text-sm">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  selectedTeam.status === 'active'
                    ? 'bg-green-500/20 text-green-400'
                    : selectedTeam.status === 'suspended'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>{selectedTeam.status}</span>
              </div>
              <div>
                <span className="text-[#94a3b8] text-sm">Created:</span>
                <span className="ml-2">{formatDate(selectedTeam.createdAt)}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              {selectedTeam.status === 'active' ? (
                <button
                  onClick={() => handleSuspend(selectedTeam.id)}
                  className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/30 text-sm"
                >
                  Suspend Team
                </button>
              ) : (
                <button
                  onClick={() => handleUnsuspend(selectedTeam.id)}
                  className="bg-green-500/20 text-green-400 px-4 py-2 rounded-lg hover:bg-green-500/30 text-sm"
                >
                  Unsuspend Team
                </button>
              )}
            </div>
          </div>

          {/* Members */}
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">👥 Members ({selectedTeam.members?.length || 0})</h2>
            {(!selectedTeam.members || selectedTeam.members.length === 0) ? (
              <div className="text-[#94a3b8] text-center py-4">No members</div>
            ) : (
              <table className="w-full">
                <thead className="bg-[#1e293b]">
                  <tr>
                    <th className="text-left px-4 py-2 text-sm font-medium text-[#94a3b8]">Email</th>
                    <th className="text-left px-4 py-2 text-sm font-medium text-[#94a3b8]">Role</th>
                    <th className="text-left px-4 py-2 text-sm font-medium text-[#94a3b8]">Joined</th>
                    <th className="text-left px-4 py-2 text-sm font-medium text-[#94a3b8]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTeam.members.map((member) => (
                    <tr key={member.id} className="border-b border-[#1e293b] last:border-0">
                      <td className="px-4 py-3 text-sm">{member.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          member.role === 'owner'
                            ? 'bg-purple-500/20 text-purple-400'
                            : member.role === 'admin'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>{member.role}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#94a3b8]">{formatDate(member.joinedAt)}</td>
                      <td className="px-4 py-3">
                        {member.role !== 'owner' && (
                          <button
                            onClick={() => handleRemoveMember(selectedTeam.id, member.userId)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Invitations */}
          {selectedTeam.invitations && selectedTeam.invitations.length > 0 && (
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">📨 Pending Invitations ({selectedTeam.invitations.length})</h2>
              <table className="w-full">
                <thead className="bg-[#1e293b]">
                  <tr>
                    <th className="text-left px-4 py-2 text-sm font-medium text-[#94a3b8]">Email</th>
                    <th className="text-left px-4 py-2 text-sm font-medium text-[#94a3b8]">Role</th>
                    <th className="text-left px-4 py-2 text-sm font-medium text-[#94a3b8]">Status</th>
                    <th className="text-left px-4 py-2 text-sm font-medium text-[#94a3b8]">Expires</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTeam.invitations.map((inv) => (
                    <tr key={inv.id} className="border-b border-[#1e293b] last:border-0">
                      <td className="px-4 py-3 text-sm">{inv.email}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 rounded text-xs bg-blue-500/20 text-blue-400">{inv.role}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          inv.status === 'pending'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : inv.status === 'accepted'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>{inv.status}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#94a3b8]">{formatDate(inv.expiresAt)}</td>
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

  // List view
  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      <header className="bg-[#0f172a] border-b border-[#1e293b] px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🏢 Team Management</h1>
            <p className="text-[#94a3b8] text-sm">{total} teams</p>
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
              placeholder="Search by team name or email..."
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

        {/* Teams Table */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl overflow-hidden">
          {loading ? (
            <div className="text-center py-8 text-[#94a3b8]">Loading...</div>
          ) : teams.length === 0 ? (
            <div className="text-center py-8 text-[#94a3b8]">No teams found</div>
          ) : (
            <table className="w-full">
              <thead className="bg-[#1e293b]">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Team</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Owner</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Members</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Keys</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Requests</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Cost</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Status</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-[#94a3b8]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team.id} className="border-b border-[#1e293b] last:border-0 hover:bg-[#1e293b]/30">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => loadTeamDetail(team.id)}
                        className="text-[#00c9ff] hover:underline font-medium"
                      >
                        {team.name}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm">{team.ownerEmail}</td>
                    <td className="px-6 py-4">{team.memberCount}</td>
                    <td className="px-6 py-4">{team.keyCount}</td>
                    <td className="px-6 py-4">{team.requestCount.toLocaleString()}</td>
                    <td className="px-6 py-4">${team.totalCost.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs ${
                        team.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : team.status === 'suspended'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {team.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => loadTeamDetail(team.id)}
                          className="text-[#00c9ff] hover:underline text-sm"
                        >
                          View
                        </button>
                        {team.status === 'active' ? (
                          <button
                            onClick={() => handleSuspend(team.id)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUnsuspend(team.id)}
                            className="text-green-400 hover:text-green-300 text-sm"
                          >
                            Unsuspend
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
