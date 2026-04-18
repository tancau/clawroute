'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

type OptimizationGoal = 'cost' | 'quality' | 'speed' | 'balanced';

interface Preferences {
  optimizationGoal: OptimizationGoal;
  modelPreferences: {
    coding: 'free' | 'paid';
    reasoning: 'free' | 'paid';
    translation: 'free' | 'paid';
    creative: 'free' | 'paid';
  };
  budget: {
    maxPerRequest: number;
    dailyLimit: number;
    autoDowngrade: boolean;
  };
  excludedModels: string[];
}

const AVAILABLE_MODELS = [
  { id: 'gpt-5.4', name: 'GPT-5.4', cost: 'paid' },
  { id: 'gpt-4o', name: 'GPT-4o', cost: 'paid' },
  { id: 'claude-opus-4-7', name: 'Claude Opus 4.7', cost: 'paid' },
  { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6', cost: 'paid' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', cost: 'paid' },
  { id: 'deepseek-chat', name: 'DeepSeek Chat', cost: 'paid' },
  { id: 'qwen3-max', name: 'Qwen3 Max', cost: 'paid' },
  { id: 'qwen-free', name: 'Qwen Free', cost: 'free' },
  { id: 'gemma-free', name: 'Gemma Free', cost: 'free' },
  { id: 'llama-free', name: 'Llama Free', cost: 'free' },
];

export default function PreferencesPage() {
  const [preferences, setPreferences] = useState<Preferences>({
    optimizationGoal: 'cost',
    modelPreferences: {
      coding: 'free',
      reasoning: 'paid',
      translation: 'free',
      creative: 'paid',
    },
    budget: {
      maxPerRequest: 0.01,
      dailyLimit: 1.0,
      autoDowngrade: true,
    },
    excludedModels: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const t = useTranslations('dashboard');

  useEffect(() => {
    const stored = localStorage.getItem('clawrouter_preferences');
    if (stored) {
      try {
        setPreferences(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse preferences:', e);
      }
    }
    setIsLoading(false);
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    localStorage.setItem('clawrouter_preferences', JSON.stringify(preferences));
    await new Promise((resolve) => setTimeout(resolve, 500));
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleExcludedModel = (modelId: string) => {
    setPreferences((prev) => ({
      ...prev,
      excludedModels: prev.excludedModels.includes(modelId)
        ? prev.excludedModels.filter((id) => id !== modelId)
        : [...prev.excludedModels, modelId],
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-neutral-10">{t('loading')}</div>
      </div>
    );
  }

  return (
    <DashboardShell>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-neutral-10">{t('preferences')}</h1>
          <p className="text-neutral-7 mt-1">{t('modelPreferenceDesc')}</p>
        </div>

        {/* Optimization Goal */}
        <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
          <h2 className="text-xl font-bold text-neutral-10 mb-4">{t('optimizationGoal')}</h2>
          <p className="text-neutral-7 text-sm mb-4">{t('optimizationGoalDesc')}</p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: 'cost', label: t('costFirst'), desc: t('costFirstDesc'), icon: '💰' },
              { value: 'quality', label: t('qualityFirst'), desc: t('qualityFirstDesc'), icon: '⭐' },
              { value: 'speed', label: t('speedFirst'), desc: t('speedFirstDesc'), icon: '⚡' },
              { value: 'balanced', label: t('balanced'), desc: t('balancedDesc'), icon: '⚖️' },
            ].map((item) => (
              <button
                key={item.value}
                onClick={() => setPreferences((prev) => ({ ...prev, optimizationGoal: item.value as OptimizationGoal }))}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  preferences.optimizationGoal === item.value
                    ? 'border-brand-primary bg-brand-primary/10'
                    : 'border-border-subtle hover:border-neutral-6'
                }`}
              >
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-neutral-10 font-medium">{item.label}</div>
                <div className="text-xs text-neutral-7 mt-1">{item.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Model Preferences */}
        <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
          <h2 className="text-xl font-bold text-neutral-10 mb-4">{t('modelPreference')}</h2>
          <p className="text-neutral-7 text-sm mb-4">{t('modelPreferenceDesc')}</p>

          <div className="space-y-4">
            {[
              { key: 'coding', label: t('codingTask'), icon: '💻' },
              { key: 'reasoning', label: t('complexReasoning'), icon: '🧠' },
              { key: 'translation', label: t('translationTask'), icon: '🌐' },
              { key: 'creative', label: t('creativeWriting'), icon: '✨' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between p-4 bg-surface-overlay rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-neutral-10">{item.label}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setPreferences((prev) => ({
                        ...prev,
                        modelPreferences: { ...prev.modelPreferences, [item.key]: 'free' },
                      }))
                    }
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      preferences.modelPreferences[item.key as keyof typeof preferences.modelPreferences] === 'free'
                        ? 'bg-semantic-success text-white'
                        : 'bg-surface-raised text-neutral-7'
                    }`}
                  >
                    {t('preferFree')}
                  </button>
                  <button
                    onClick={() =>
                      setPreferences((prev) => ({
                        ...prev,
                        modelPreferences: { ...prev.modelPreferences, [item.key]: 'paid' },
                      }))
                    }
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      preferences.modelPreferences[item.key as keyof typeof preferences.modelPreferences] === 'paid'
                        ? 'bg-purple-500 text-white'
                        : 'bg-surface-raised text-neutral-7'
                    }`}
                  >
                    {t('allowPaid')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Budget Control */}
        <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
          <h2 className="text-xl font-bold text-neutral-10 mb-4">{t('budgetControl')}</h2>
          <p className="text-neutral-7 text-sm mb-4">{t('budgetControlDesc')}</p>

          <div className="space-y-6">
            <div>
              <label className="block text-neutral-10 text-sm mb-2">{t('perRequestLimit')}</label>
              <input
                type="number"
                step="0.001"
                value={preferences.budget.maxPerRequest}
                onChange={(e) =>
                  setPreferences((prev) => ({
                    ...prev,
                    budget: { ...prev.budget, maxPerRequest: parseFloat(e.target.value) || 0 },
                  }))
                }
                className="w-full px-4 py-3 bg-surface-overlay border border-border-subtle rounded-lg text-neutral-10 focus:outline-none focus:border-brand-primary"
              />
              <div className="text-xs text-neutral-6 mt-1">{t('perRequestLimitHint')}</div>
            </div>

            <div>
              <label className="block text-neutral-10 text-sm mb-2">{t('dailyBudget')}</label>
              <input
                type="number"
                step="0.1"
                value={preferences.budget.dailyLimit}
                onChange={(e) =>
                  setPreferences((prev) => ({
                    ...prev,
                    budget: { ...prev.budget, dailyLimit: parseFloat(e.target.value) || 0 },
                  }))
                }
                className="w-full px-4 py-3 bg-surface-overlay border border-border-subtle rounded-lg text-neutral-10 focus:outline-none focus:border-brand-primary"
              />
              <div className="text-xs text-neutral-6 mt-1">{t('dailyBudgetHint')}</div>
            </div>

            <div className="flex items-center justify-between p-4 bg-surface-overlay rounded-lg">
              <div>
                <div className="text-neutral-10">{t('autoDowngrade')}</div>
                <div className="text-sm text-neutral-7">{t('autoDowngradeHint')}</div>
              </div>
              <button
                onClick={() =>
                  setPreferences((prev) => ({
                    ...prev,
                    budget: { ...prev.budget, autoDowngrade: !prev.budget.autoDowngrade },
                  }))
                }
                className={`w-12 h-6 rounded-full transition-colors ${
                  preferences.budget.autoDowngrade ? 'bg-semantic-success' : 'bg-neutral-6'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    preferences.budget.autoDowngrade ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Excluded Models */}
        <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
          <h2 className="text-xl font-bold text-neutral-10 mb-4">{t('excludeModels')}</h2>
          <p className="text-neutral-7 text-sm mb-4">{t('excludeModelsDesc')}</p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {AVAILABLE_MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => toggleExcludedModel(model.id)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  preferences.excludedModels.includes(model.id)
                    ? 'border-semantic-error/50 bg-semantic-error/10'
                    : 'border-border-subtle hover:border-neutral-6'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-neutral-10 text-sm">{model.name}</span>
                  {preferences.excludedModels.includes(model.id) && (
                    <span className="text-semantic-error text-xs">{t('excluded')}</span>
                  )}
                </div>
                <div className="text-xs text-neutral-6 mt-1">
                  {model.cost === 'free' ? t('free') : t('paid')}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-brand-primary to-brand-accent text-neutral-1 font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isSaving ? t('saving') : saved ? t('saved2') : t('saveSettings')}
          </button>
          <Link
            href="/dashboard"
            className="px-6 py-3 bg-surface-raised text-neutral-7 rounded-lg hover:bg-surface-overlay transition-colors"
          >
            {t('cancel')}
          </Link>
        </div>
      </div>
    </DashboardShell>
  );
}
