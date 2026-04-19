'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/use-user-store';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Settings, Save, RefreshCw } from 'lucide-react';

interface SystemSettings {
  defaultTier: string;
  defaultCredits: number;
  rateLimitFree: number;
  rateLimitPro: number;
  rateLimitTeam: number;
  creditCostPerRequest: number;
  maintenanceMode: boolean;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useUserStore();
  const [settings, setSettings] = useState<SystemSettings>({
    defaultTier: 'free',
    defaultCredits: 100,
    rateLimitFree: 20,
    rateLimitPro: 100,
    rateLimitTeam: 1000,
    creditCostPerRequest: 1,
    maintenanceMode: false,
  });
  const [saving, setSaving] = useState(false);

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

  const handleSave = async () => {
    setSaving(true);
    // 模拟保存
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
  };

  const handleReset = () => {
    setSettings({
      defaultTier: 'free',
      defaultCredits: 100,
      rateLimitFree: 20,
      rateLimitPro: 100,
      rateLimitTeam: 1000,
      creditCostPerRequest: 1,
      maintenanceMode: false,
    });
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
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-10">System Settings</h1>
            <p className="text-neutral-7 text-sm">Configure platform defaults</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-surface-overlay text-neutral-10 rounded-lg hover:bg-surface-raised transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>

        {/* Settings Form */}
        <div className="space-y-6">
          {/* User Defaults */}
          <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
            <h3 className="text-lg font-semibold text-neutral-10 mb-4 flex items-center gap-2">
              <Settings className="h-5 w-5 text-brand-primary" />
              User Defaults
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm text-neutral-7">Default Tier</label>
                <select
                  value={settings.defaultTier}
                  onChange={(e) => setSettings({ ...settings, defaultTier: e.target.value })}
                  className="px-4 py-2 bg-surface-overlay border border-border-subtle rounded-lg text-sm focus:outline-none focus:border-brand-primary"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="team">Team</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-neutral-7">Default Credits</label>
                <input
                  type="number"
                  value={settings.defaultCredits}
                  onChange={(e) => setSettings({ ...settings, defaultCredits: parseInt(e.target.value) })}
                  className="px-4 py-2 bg-surface-overlay border border-border-subtle rounded-lg text-sm focus:outline-none focus:border-brand-primary w-32"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-neutral-7">Credit Cost per Request</label>
                <input
                  type="number"
                  value={settings.creditCostPerRequest}
                  onChange={(e) => setSettings({ ...settings, creditCostPerRequest: parseInt(e.target.value) })}
                  className="px-4 py-2 bg-surface-overlay border border-border-subtle rounded-lg text-sm focus:outline-none focus:border-brand-primary w-32"
                />
              </div>
            </div>
          </div>

          {/* Rate Limits */}
          <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
            <h3 className="text-lg font-semibold text-neutral-10 mb-4">Rate Limits (requests/minute)</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm text-neutral-7">Free Tier</label>
                <input
                  type="number"
                  value={settings.rateLimitFree}
                  onChange={(e) => setSettings({ ...settings, rateLimitFree: parseInt(e.target.value) })}
                  className="px-4 py-2 bg-surface-overlay border border-border-subtle rounded-lg text-sm focus:outline-none focus:border-brand-primary w-32"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-neutral-7">Pro Tier</label>
                <input
                  type="number"
                  value={settings.rateLimitPro}
                  onChange={(e) => setSettings({ ...settings, rateLimitPro: parseInt(e.target.value) })}
                  className="px-4 py-2 bg-surface-overlay border border-border-subtle rounded-lg text-sm focus:outline-none focus:border-brand-primary w-32"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-neutral-7">Team Tier</label>
                <input
                  type="number"
                  value={settings.rateLimitTeam}
                  onChange={(e) => setSettings({ ...settings, rateLimitTeam: parseInt(e.target.value) })}
                  className="px-4 py-2 bg-surface-overlay border border-border-subtle rounded-lg text-sm focus:outline-none focus:border-brand-primary w-32"
                />
              </div>
            </div>
          </div>

          {/* Maintenance Mode */}
          <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
            <h3 className="text-lg font-semibold text-neutral-10 mb-4">Maintenance</h3>
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm text-neutral-10">Maintenance Mode</label>
                <p className="text-xs text-neutral-7">Disable API access for non-admin users</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  settings.maintenanceMode ? 'bg-red-500' : 'bg-surface-overlay'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    settings.maintenanceMode ? 'translate-x-6' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}