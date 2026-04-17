/**
 * Admin Settings Page
 * 系统设置页面
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface SystemSettings {
  registration: {
    enabled: boolean;
    inviteOnly: boolean;
  };
  features: {
    keySharing: boolean;
    earningsEnabled: boolean;
  };
  limits: {
    maxKeysPerUser: number;
    maxRequestsPerDay: number;
  };
  maintenance: {
    enabled: boolean;
    message: string;
  };
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/v1/admin/settings');
      if (res.ok) {
        setSettings(await res.json());
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    
    setSaving(true);
    setMessage('');
    
    try {
      const res = await fetch('/v1/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      
      if (res.ok) {
        setMessage('Settings saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage('Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      setMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof SystemSettings>(
    category: K,
    key: keyof SystemSettings[K],
    value: SystemSettings[K][keyof SystemSettings[K]]
  ) => {
    if (!settings) return;
    setSettings({
      ...settings,
      [category]: {
        ...settings[category],
        [key]: value,
      },
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white p-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] text-white p-8">
        <div className="text-center">Failed to load settings</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      {/* Header */}
      <header className="bg-[#0f172a] border-b border-[#1e293b] px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">System Settings</h1>
            <p className="text-[#94a3b8] text-sm">Configure system-wide settings</p>
          </div>
          <Link href="/admin/dashboard" className="text-sm text-[#94a3b8] hover:text-white">
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="p-8 max-w-4xl">
        {/* Message */}
        {message && (
          <div
            className={`mb-6 px-4 py-3 rounded-lg ${
              message.includes('success')
                ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                : 'bg-red-500/20 border border-red-500/50 text-red-400'
            }`}
          >
            {message}
          </div>
        )}

        {/* Registration Settings */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">🔐 Registration</h2>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <div className="font-medium">Allow Registration</div>
                <div className="text-sm text-[#94a3b8]">Enable new user registration</div>
              </div>
              <input
                type="checkbox"
                checked={settings.registration.enabled}
                onChange={(e) => updateSetting('registration', 'enabled', e.target.checked)}
                className="w-5 h-5 rounded"
              />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <div className="font-medium">Invite Only</div>
                <div className="text-sm text-[#94a3b8]">Require invitation code for registration</div>
              </div>
              <input
                type="checkbox"
                checked={settings.registration.inviteOnly}
                onChange={(e) => updateSetting('registration', 'inviteOnly', e.target.checked)}
                className="w-5 h-5 rounded"
              />
            </label>
          </div>
        </div>

        {/* Features Settings */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">✨ Features</h2>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <div className="font-medium">Key Sharing</div>
                <div className="text-sm text-[#94a3b8]">Allow users to share API keys</div>
              </div>
              <input
                type="checkbox"
                checked={settings.features.keySharing}
                onChange={(e) => updateSetting('features', 'keySharing', e.target.checked)}
                className="w-5 h-5 rounded"
              />
            </label>

            <label className="flex items-center justify-between">
              <div>
                <div className="font-medium">Earnings System</div>
                <div className="text-sm text-[#94a3b8]">Enable earnings for key providers</div>
              </div>
              <input
                type="checkbox"
                checked={settings.features.earningsEnabled}
                onChange={(e) => updateSetting('features', 'earningsEnabled', e.target.checked)}
                className="w-5 h-5 rounded"
              />
            </label>
          </div>
        </div>

        {/* Limits Settings */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">📊 Limits</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block font-medium mb-2">Max Keys Per User</label>
              <input
                type="number"
                value={settings.limits.maxKeysPerUser}
                onChange={(e) => updateSetting('limits', 'maxKeysPerUser', parseInt(e.target.value) || 0)}
                className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-4 py-2"
              />
            </div>

            <div>
              <label className="block font-medium mb-2">Max Requests Per Day</label>
              <input
                type="number"
                value={settings.limits.maxRequestsPerDay}
                onChange={(e) => updateSetting('limits', 'maxRequestsPerDay', parseInt(e.target.value) || 0)}
                className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-4 py-2"
              />
            </div>
          </div>
        </div>

        {/* Maintenance Settings */}
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">🔧 Maintenance</h2>
          
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <div className="font-medium">Maintenance Mode</div>
                <div className="text-sm text-[#94a3b8]">Disable all user operations</div>
              </div>
              <input
                type="checkbox"
                checked={settings.maintenance.enabled}
                onChange={(e) => updateSetting('maintenance', 'enabled', e.target.checked)}
                className="w-5 h-5 rounded"
              />
            </label>

            <div>
              <label className="block font-medium mb-2">Maintenance Message</label>
              <textarea
                value={settings.maintenance.message}
                onChange={(e) => updateSetting('maintenance', 'message', e.target.value)}
                placeholder="System is under maintenance..."
                rows={3}
                className="w-full bg-[#1e293b] border border-[#334155] rounded-lg px-4 py-2 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[#00c9ff] text-black px-6 py-3 rounded-lg font-medium hover:bg-[#00a8e0] disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
