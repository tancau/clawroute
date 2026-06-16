'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { api } from '@/lib/api';

interface ProviderInfo {
  id: string;
  name: string;
  type: 'predefined' | 'custom';
  configured: boolean;
  maskedKey: string | null;
  keyPrefix?: string;
  baseUrl?: string;
  models?: string[];
  status: string;
}

interface KeyManagerProps {
  userId: string;
}

export function KeyManager({ userId }: KeyManagerProps) {
  const t = useTranslations('keyManager');
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addMode, setAddMode] = useState<'predefined' | 'custom'>('predefined');
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  // Custom provider fields
  const [customName, setCustomName] = useState('');
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [customApiKey, setCustomApiKey] = useState('');
  const [customModels, setCustomModels] = useState('');

  const loadedRef = useRef(false);

  const PREDEFINED_PROVIDERS = [
    { id: 'openai', name: 'OpenAI', placeholder: 'sk-...' },
    { id: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-...' },
    { id: 'deepseek', name: 'DeepSeek', placeholder: 'sk-...' },
    { id: 'openrouter', name: 'OpenRouter', placeholder: 'sk-or-...' },
    { id: 'google', name: 'Google AI', placeholder: 'AIza...' },
    { id: 'mistral', name: 'Mistral', placeholder: 'sk-...' },
    { id: 'groq', name: 'Groq', placeholder: 'gsk_...' },
    { id: 'cohere', name: 'Cohere', placeholder: 'sk-...' },
    { id: 'qwen', name: 'Qwen (DashScope)', placeholder: 'sk-...' },
  ];

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      loadProviders();
    }
  }, []);

  async function loadProviders() {
    setIsLoading(true);
    try {
      const token = api.getToken();
      const response = await fetch('/api/user/providers', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers || []);
      }
    } catch {
      setError('Failed to load providers');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddPredefined(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const token = api.getToken();
      const response = await fetch('/api/user/providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ provider: selectedProvider, apiKey }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error?.message || 'Failed to add key');
        return;
      }

      setApiKey('');
      setShowAddForm(false);
      await loadProviders();
    } catch {
      setError('Failed to add provider key');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddCustom(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const token = api.getToken();
      const models = customModels
        .split(',')
        .map(m => m.trim())
        .filter(Boolean);

      const response = await fetch('/api/user/providers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          custom: true,
          name: customName,
          baseUrl: customBaseUrl,
          apiKey: customApiKey,
          models,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error?.message || 'Failed to add custom provider');
        return;
      }

      setCustomName('');
      setCustomBaseUrl('');
      setCustomApiKey('');
      setCustomModels('');
      setShowAddForm(false);
      await loadProviders();
    } catch {
      setError('Failed to add custom provider');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(providerId: string) {
    if (!confirm(t('deleteConfirm'))) return;
    setIsLoading(true);
    try {
      const token = api.getToken();
      const response = await fetch(`/api/user/providers?provider=${providerId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        await loadProviders();
      }
    } catch {
      setError('Failed to delete provider');
    } finally {
      setIsLoading(false);
    }
  }

  const configuredProviders = providers.filter(p => p.configured);

  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">{t('title')}</h2>
        <button
          onClick={() => { setShowAddForm(!showAddForm); setError(null); }}
          className="px-4 py-2 bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] text-[#0f172a] font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          {showAddForm ? t('cancel') : t('addKey')}
        </button>
      </div>

      {showAddForm && (
        <div className="mb-6 p-4 bg-[#1e293b] rounded-lg space-y-4">
          {/* Mode switcher */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAddMode('predefined')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                addMode === 'predefined'
                  ? 'bg-[#00c9ff] text-[#0f172a]'
                  : 'bg-[#0f172a] text-[#94a3b8] hover:text-white'
              }`}
            >
              {t('predefinedProvider')}
            </button>
            <button
              type="button"
              onClick={() => setAddMode('custom')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                addMode === 'custom'
                  ? 'bg-[#00c9ff] text-[#0f172a]'
                  : 'bg-[#0f172a] text-[#94a3b8] hover:text-white'
              }`}
            >
              {t('customProvider')}
            </button>
          </div>

          {addMode === 'predefined' ? (
            <form onSubmit={handleAddPredefined} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">{t('selectProvider')}</label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0f172a] border border-[#334155] rounded-lg text-white focus:outline-none focus:border-[#00c9ff]"
                >
                  {PREDEFINED_PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">{t('apiKey')}</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={PREDEFINED_PROVIDERS.find((p) => p.id === selectedProvider)?.placeholder}
                  required
                  className="w-full px-4 py-3 bg-[#0f172a] border border-[#334155] rounded-lg text-white placeholder-[#64748b] focus:outline-none focus:border-[#00c9ff]"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#00c9ff] text-[#0f172a] font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isLoading ? t('submitting') : t('submit')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleAddCustom} className="space-y-4">
              <div className="p-3 bg-[#0f172a] rounded-lg border border-[#334155]">
                <p className="text-sm text-[#94a3b8]">{t('customProviderHint')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">{t('customName')}</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g. My Local LLM, New-API, Ollama..."
                  required
                  className="w-full px-4 py-3 bg-[#0f172a] border border-[#334155] rounded-lg text-white placeholder-[#64748b] focus:outline-none focus:border-[#00c9ff]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">{t('customBaseUrl')}</label>
                <input
                  type="url"
                  value={customBaseUrl}
                  onChange={(e) => setCustomBaseUrl(e.target.value)}
                  placeholder="http://localhost:11434/v1 or https://your-api.com/v1"
                  required
                  className="w-full px-4 py-3 bg-[#0f172a] border border-[#334155] rounded-lg text-white placeholder-[#64748b] focus:outline-none focus:border-[#00c9ff]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">{t('apiKey')}</label>
                <input
                  type="password"
                  value={customApiKey}
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  placeholder="sk-... (or any key your API requires)"
                  required
                  className="w-full px-4 py-3 bg-[#0f172a] border border-[#334155] rounded-lg text-white placeholder-[#64748b] focus:outline-none focus:border-[#00c9ff]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#94a3b8] mb-2">{t('customModels')}</label>
                <input
                  type="text"
                  value={customModels}
                  onChange={(e) => setCustomModels(e.target.value)}
                  placeholder="model-1, model-2, model-3 (comma separated)"
                  className="w-full px-4 py-3 bg-[#0f172a] border border-[#334155] rounded-lg text-white placeholder-[#64748b] focus:outline-none focus:border-[#00c9ff]"
                />
                <p className="text-xs text-[#64748b] mt-1">{t('customModelsHint')}</p>
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#00c9ff] text-[#0f172a] font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isLoading ? t('submitting') : t('submit')}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Provider list */}
      <div className="space-y-3">
        {configuredProviders.length === 0 ? (
          <div className="text-center py-8 text-[#64748b]">
            {t('noKeysYet')}
            <br />
            <span className="text-sm">{t('customProviderTip')}</span>
          </div>
        ) : (
          configuredProviders.map((provider) => (
            <div
              key={provider.id}
              className="flex items-center justify-between p-4 bg-[#1e293b] rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                  provider.type === 'custom'
                    ? 'bg-gradient-to-br from-cyan-500 to-blue-500'
                    : 'bg-gradient-to-br from-purple-500 to-pink-500'
                }`}>
                  {provider.type === 'custom' ? '⚡' : provider.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-white">
                    {provider.name}
                    {provider.type === 'custom' && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-cyan-500/20 text-cyan-400 rounded">{t('customTag')}</span>
                    )}
                  </div>
                  <div className="text-sm text-[#64748b] font-mono">{provider.maskedKey}</div>
                  {provider.baseUrl && (
                    <div className="text-xs text-[#475569] mt-0.5">{provider.baseUrl}</div>
                  )}
                  {provider.models && provider.models.length > 0 && (
                    <div className="text-xs text-[#475569] mt-0.5">
                      {t('modelsLabel')}: {provider.models.join(', ')}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleDelete(provider.id)}
                className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
