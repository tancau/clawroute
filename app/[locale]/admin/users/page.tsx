'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/use-user-store';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Users, Search, Mail, MoreVertical } from 'lucide-react';

interface UserListItem {
  id: string;
  email: string;
  name: string;
  tier: string;
  credits: number;
  createdAt: number;
  lastActive: number;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useUserStore();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 检查认证和管理员权限
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (user && user.tier !== 'admin' && user.email !== 'admin@hopllm.com') {
      router.push('/dashboard');
      return;
    }

    loadUsers();
  }, [isAuthenticated, isLoading, user, router]);

  const loadUsers = async () => {
    setLoading(true);
    // 模拟数据（实际应该调用 API）
    setUsers([
      { id: '1', email: 'user1@example.com', name: 'User One', tier: 'free', credits: 100, createdAt: Date.now() - 86400000, lastActive: Date.now() },
      { id: '2', email: 'user2@example.com', name: 'User Two', tier: 'pro', credits: 500, createdAt: Date.now() - 172800000, lastActive: Date.now() - 3600000 },
      { id: '3', email: 'user3@example.com', name: 'User Three', tier: 'team', credits: 1000, createdAt: Date.now() - 259200000, lastActive: Date.now() - 7200000 },
    ]);
    setLoading(false);
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-64">
          <div className="h-8 bg-surface-overlay rounded w-48 mx-auto" />
          <div className="h-4 bg-surface-overlay rounded w-32 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <DashboardShell>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-10">User Management</h1>
            <p className="text-neutral-7 text-sm">{users.length} total users</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-7" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-surface-overlay border border-border-subtle rounded-lg text-sm focus:outline-none focus:border-brand-primary"
              />
            </div>
          </div>
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse h-16 bg-surface-overlay rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="bg-surface-raised border border-border-subtle rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-surface-overlay border-b border-border-subtle">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-7">User</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-7">Tier</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-7">Credits</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-7">Last Active</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-neutral-7">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-overlay transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-primary/10 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-brand-primary" />
                        </div>
                        <div>
                          <div className="font-medium text-neutral-10">{u.name}</div>
                          <div className="text-sm text-neutral-7 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                        u.tier === 'team' ? 'bg-brand-accent/10 text-brand-accent' :
                        u.tier === 'pro' ? 'bg-brand-primary/10 text-brand-primary' :
                        'bg-surface-overlay text-neutral-7'
                      }`}>
                        {u.tier}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-neutral-10">{u.credits.toLocaleString()}</td>
                    <td className="px-4 py-4 text-sm text-neutral-7">
                      {new Date(u.lastActive).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button className="p-2 hover:bg-surface-raised rounded-lg transition-colors">
                        <MoreVertical className="h-4 w-4 text-neutral-7" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}