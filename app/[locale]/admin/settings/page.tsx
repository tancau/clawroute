'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/use-user-store';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { ConfigEditor } from '@/components/admin/config-panel';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useUserStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (user && user.tier !== 'admin' && user.email !== 'admin@hopllm.com') {
      router.push('/dashboard');
      return;
    }
  }, [isAuthenticated, isLoading, user, router]);

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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link 
            href="/admin" 
            className="p-2 hover:bg-surface-overlay rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-neutral-7" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-neutral-10">System Configuration</h1>
            <p className="text-neutral-7 text-sm">Manage platform settings dynamically</p>
          </div>
        </div>

        {/* Config Editor */}
        <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
          <ConfigEditor />
        </div>
      </div>
    </DashboardShell>
  );
}
