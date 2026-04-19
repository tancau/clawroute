'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/use-user-store';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Key, Search, Copy, Trash2, Eye } from 'lucide-react';

interface KeyListItem {
  id: string;
  userId: string;
  userEmail: string;
  keyPreview: string;
  provider: string;
  isActive: boolean;
  createdAt: number;
  lastUsed: number;
}

export default function AdminKeysPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useUserStore();
  const [keys, setKeys] = useState<KeyListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (user && user.tier !== 'admin' && user.email !== 'admin@hopllm.com') {
      router.push('/dashboard');
      return;
    }

    loadKeys();
  }, [isAuthenticated, isLoading, user, router]);

  const loadKeys = async () => {
    setLoading(true);
    setKeys([
      { id: '1', userId: '1', userEmail: 'user1@example.com', keyPreview: 'cr-abc123...', provider: 'deepseek', isActive: true, createdAt: Date.now() - 86400000, lastUsed: Date.now() },
      { id: '2', userId: '2', userEmail: 'user2@example.com', keyPreview: 'cr-def456...', provider: 'openai', isActive: true, createdAt: Date.now() - 172800000, lastUsed: Date.now() - 3600000 },
      { id: '3', userId: '3', userEmail: 'user3@example.com', keyPreview: 'cr-ghi789...', provider: 'anthropic', isActive: false, createdAt: Date.now() - 259200000, lastUsed: Date.now() - 7200000 },
    ]);
    setLoading(false);
  };

  const filteredKeys = keys.filter(k => 
    k.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    k.provider.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopy = (keyPreview: string) => {
    navigator.clipboard.writeText(keyPreview);
  };

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
            <h1 className="text-2xl font-bold text-neutral-10">API Key Management</h1>
            <p className="text-neutral-7 text-sm">{keys.length} keys registered</p>
          </div>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-7" />
            <input
              type="text"
              placeholder="Search keys..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-surface-overlay border border-border-subtle rounded-lg text-sm focus:outline-none focus:border-brand-primary"
            />
          </div>
        </div>

        {/* Keys Table */}
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
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-7">Key</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-7">User</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-7">Provider</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-7">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-neutral-7">Last Used</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-neutral-7">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredKeys.map((k) => (
                  <tr key={k.id} className="hover:bg-surface-overlay transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-brand-primary" />
                        <span className="font-mono text-sm text-neutral-10">{k.keyPreview}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-neutral-7">{k.userEmail}</td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-brand-accent/10 text-brand-accent">
                        {k.provider}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                        k.isActive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                      }`}>
                        {k.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-neutral-7">
                      {new Date(k.lastUsed).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleCopy(k.keyPreview)}
                          className="p-2 hover:bg-surface-raised rounded-lg transition-colors"
                          title="Copy"
                        >
                          <Copy className="h-4 w-4 text-neutral-7" />
                        </button>
                        <button className="p-2 hover:bg-surface-raised rounded-lg transition-colors" title="View">
                          <Eye className="h-4 w-4 text-neutral-7" />
                        </button>
                        <button className="p-2 hover:bg-red-500/10 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
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