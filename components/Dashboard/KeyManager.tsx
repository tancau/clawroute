'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useUserStore } from '@/store/use-user-store';

interface KeyManagerProps {
  userId: string;
}

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', placeholder: 'sk-...' },
  { id: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-...' },
  { id: 'google', name: 'Google AI', placeholder: 'AIza...' },
  { id: 'deepseek', name: 'DeepSeek', placeholder: 'sk-...' },
  { id: 'openrouter', name: 'OpenRouter', placeholder: 'sk-or-...' },
];

export function KeyManager({ userId }: KeyManagerProps) {
  const t = useTranslations('keyManager');
  const { keys, fetchKeys, submitKey, toggleKey, removeKey, isLoading, error } = useUserStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(PROVIDERS[0]?.id ?? 'openai');
  const [apiKey, setApiKey] = useState('');
  const loadedRef = useRef(false);

  useEffect(() => {
    if (!loadedRef.current) {
      loadedRef.current = true;
      fetchKeys(userId);
    }
  }, [userId, fetchKeys]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await submitKey(userId, selectedProvider, apiKey);
    if (success) {
      setApiKey('');
      setShowAddForm(false);
    }
  };

  const handleToggle = async (keyId: string, isActive: boolean) => {
    await toggleKey(keyId, !isActive);
  };

  const handleDelete = async (keyId: string) => {
    if (confirm(t('deleteConfirm'))) {
      await removeKey(keyId);
    }
  };

  return (
    <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">{t('title')}</h2>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] text-[#0f172a] font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          {showAddForm ? t('cancel') : t('addKey')}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-[#1e293b] rounded-lg space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#94a3b8] mb-2">{t('selectProvider')}</label>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              className="w-full px-4 py-3 bg-[#0f172a] border border-[#334155] rounded-lg text-white focus:outline-none focus:border-[#00c9ff]"
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#94a3b8] mb-2">{t('apiKey')}</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={PROVIDERS.find((p) => p.id === selectedProvider)?.placeholder}
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
      )}

      <div className="space-y-3">
        {keys.length === 0 ? (
          <div className="text-center py-8 text-[#64748b]">
            {t('noKeysYet')}
            <br />
            <span className="text-sm">{t('contributeEarnings')}</span>
          </div>
        ) : (
          keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between p-4 bg-[#1e293b] rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                  {key.provider.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-white capitalize">{key.provider}</div>
                  <div className="text-sm text-[#64748b] font-mono">{key.keyPreview}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-[#94a3b8]">{t('earnings')}</div>
                  <div className="font-medium text-green-400">
                    ${(key.totalEarnings / 100).toFixed(2)}
                  </div>
                </div>
                <button
                  onClick={() => handleToggle(key.id, key.isActive)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    key.isActive
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-[#334155] text-[#64748b]'
                  }`}
                >
                  {key.isActive ? t('enabled') : t('disabled')}
                </button>
                <button
                  onClick={() => handleDelete(key.id)}
                  className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
