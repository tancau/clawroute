'use client';

import { useState, useEffect } from 'react';
import { Save, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';

interface ConfigItem {
  key: string;
  value: string | number | boolean | object;
  type: string;
  description: string | null;
}

interface ConfigGroup {
  category: string;
  configs: ConfigItem[];
}

interface ConfigPanelProps {
  category: string;
  configs: ConfigItem[];
  onSave: (key: string, value: string | number | boolean) => Promise<void>;
  saving: boolean;
}

export function ConfigPanel({ category, configs, onSave, saving }: ConfigPanelProps) {
  const [localConfigs, setLocalConfigs] = useState<Record<string, string | number | boolean>>({});
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const [savingKey, setSavingKey] = useState<string | null>(null);
  
  useEffect(() => {
    const initial: Record<string, string | number | boolean> = {};
    for (const config of configs) {
      initial[config.key] = config.value as string | number | boolean;
    }
    setLocalConfigs(initial);
    setChanged(new Set());
  }, [configs]);
  
  const handleChange = (key: string, value: string | number | boolean) => {
    setLocalConfigs(prev => ({ ...prev, [key]: value }));
    
    // 检查是否与原始值不同
    const original = configs.find(c => c.key === key)?.value;
    if (original !== value) {
      setChanged(prev => new Set(prev).add(key));
    } else {
      setChanged(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };
  
  const handleSave = async (key: string) => {
    const value = localConfigs[key];
    if (value === undefined) return;
    
    setSavingKey(key);
    try {
      await onSave(key, value);
      setChanged(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    } finally {
      setSavingKey(null);
    }
  };
  
  const handleSaveAll = async () => {
    for (const key of Array.from(changed)) {
      await handleSave(key);
    }
  };
  
  const formatLabel = (key: string) => {
    const parts = key.split('.');
    return parts[parts.length - 1]?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || key;
  };
  
  const renderInput = (config: ConfigItem) => {
    const value = localConfigs[config.key];
    const isChanged = changed.has(config.key);
    const isSaving = savingKey === config.key;
    
    switch (config.type) {
      case 'boolean':
        return (
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleChange(config.key, !value)}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                value ? 'bg-brand-primary' : 'bg-surface-overlay'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  value ? 'translate-x-6' : ''
                }`}
              />
            </button>
            {isChanged && (
              <button
                onClick={() => handleSave(config.key)}
                disabled={isSaving || saving}
                className="text-xs text-brand-primary hover:text-brand-primary/80 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        );
        
      case 'number':
        return (
          <div className="flex items-center gap-3">
            <input
              type="number"
              value={value as number}
              onChange={(e) => handleChange(config.key, parseFloat(e.target.value) || 0)}
              className="px-3 py-1.5 bg-surface-overlay border border-border-subtle rounded-lg text-sm focus:outline-none focus:border-brand-primary w-28"
              step="any"
            />
            {isChanged && (
              <button
                onClick={() => handleSave(config.key)}
                disabled={isSaving || saving}
                className="text-xs text-brand-primary hover:text-brand-primary/80 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        );
        
      default:
        return (
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={value as string}
              onChange={(e) => handleChange(config.key, e.target.value)}
              className="px-3 py-1.5 bg-surface-overlay border border-border-subtle rounded-lg text-sm focus:outline-none focus:border-brand-primary w-48"
            />
            {isChanged && (
              <button
                onClick={() => handleSave(config.key)}
                disabled={isSaving || saving}
                className="text-xs text-brand-primary hover:text-brand-primary/80 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        );
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Save All Button */}
      {changed.size > 0 && (
        <div className="flex items-center justify-between bg-brand-primary/10 border border-brand-primary/20 rounded-lg p-3">
          <span className="text-sm text-brand-primary">
            {changed.size} unsaved change{changed.size > 1 ? 's' : ''}
          </span>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="flex items-center gap-2 px-3 py-1.5 bg-brand-primary text-white rounded-lg text-sm hover:bg-brand-primary/90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Save All
          </button>
        </div>
      )}
      
      {/* Config Items */}
      <div className="space-y-3">
        {configs.map(config => (
          <div
            key={config.key}
            className={`flex items-center justify-between p-4 bg-surface-raised border rounded-lg transition-colors ${
              changed.has(config.key) ? 'border-brand-primary/50' : 'border-border-subtle'
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-10">
                  {formatLabel(config.key)}
                </span>
                <span className="text-xs px-1.5 py-0.5 bg-surface-overlay rounded text-neutral-7">
                  {config.type}
                </span>
              </div>
              {config.description && (
                <p className="text-xs text-neutral-7 mt-1">{config.description}</p>
              )}
            </div>
            {renderInput(config)}
          </div>
        ))}
      </div>
      
      {configs.length === 0 && (
        <div className="text-center py-8 text-neutral-7">
          No configurations for this category
        </div>
      )}
    </div>
  );
}

// 完整的配置编辑器
interface ConfigEditorProps {
  onConfigChange?: () => void;
}

export function ConfigEditor({ onConfigChange }: ConfigEditorProps) {
  const [groups, setGroups] = useState<ConfigGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  
  useEffect(() => {
    loadConfigs();
  }, []);
  
  const loadConfigs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/admin/config');
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to load configs');
      }
      
      setGroups(data.data.groups || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configs');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSave = async (key: string, value: string | number | boolean) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to save config');
      }
      
      setSuccess('Config saved successfully');
      setTimeout(() => setSuccess(null), 3000);
      onConfigChange?.();
      
      // Reload configs
      await loadConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save config');
    } finally {
      setSaving(false);
    }
  };
  
  const handleReset = async () => {
    if (!confirm('Reset all configurations to default values?')) return;
    
    setSaving(true);
    setError(null);
    
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to reset configs');
      }
      
      setSuccess('All configs reset to defaults');
      setTimeout(() => setSuccess(null), 3000);
      onConfigChange?.();
      
      // Reload configs
      await loadConfigs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset configs');
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="animate-pulse h-16 bg-surface-overlay rounded-lg" />
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-neutral-10">System Configuration</h2>
          {saving && <span className="text-sm text-neutral-7">Saving...</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadConfigs}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-7 hover:text-neutral-10 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleReset}
            disabled={saving}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-semantic-error hover:text-semantic-error/80 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Reset to Defaults
          </button>
        </div>
      </div>
      
      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-semantic-error/10 border border-semantic-error/20 rounded-lg text-semantic-error text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}
      
      {success && (
        <div className="flex items-center gap-2 p-3 bg-brand-accent/10 border border-brand-accent/20 rounded-lg text-brand-accent text-sm">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          {success}
        </div>
      )}
      
      {/* Tabs */}
      {groups.length > 0 && (
        <div className="border-b border-border-subtle">
          <div className="flex gap-1 overflow-x-auto">
            {groups.map((group, index) => (
              <button
                key={group.category}
                onClick={() => setActiveTab(index)}
                className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === index
                    ? 'text-brand-primary border-brand-primary'
                    : 'text-neutral-7 border-transparent hover:text-neutral-10'
                }`}
              >
                {group.category}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Config Panel */}
      {groups[activeTab] && (
        <ConfigPanel
          category={groups[activeTab].category}
          configs={groups[activeTab].configs}
          onSave={handleSave}
          saving={saving}
        />
      )}
    </div>
  );
}
