'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useUserStore } from '@/store/use-user-store';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Skeleton } from '@/components/ui/skeleton';
import type { ModelCapability } from '@/lib/models/capability-matrix';

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

interface ModelsResponse {
  models: ModelCapability[];
  lastUpdated: string;
  totalModels: number;
}

export default function PreferencesPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useUserStore();
  const t = useTranslations('dashboard');

  const [preferences, setPreferences] = useState<Preferences>({
    optimizationGoal: 'balanced',
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

  const [models, setModels] = useState<ModelCapability[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  // Load models and preferences
  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const loadData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch available models from capabilities API
        const modelsRes = await fetch('/api/models/capabilities');
        if (!modelsRes.ok) throw new Error('Failed to load models');
        const modelsData: ModelsResponse = await modelsRes.json();
        setModels(modelsData.models.filter(m => m.isAvailable));

        // Fetch user preferences from preferences API
        const prefsRes = await fetch('/api/user/preferences', {
          headers: {
            'Authorization': `Bearer ${useUserStore.getState().token}`,
          },
        });

        if (prefsRes.ok) {
          const prefsData = await prefsRes.json();
          if (prefsData.preferences) {
            setPreferences(prefsData.preferences);
          }
        } else if (prefsRes.status !== 401) {
          // 401 means not authenticated, which is handled above
          // For other errors, try localStorage fallback
          const stored = localStorage.getItem('clawrouter_preferences');
          if (stored) {
            try {
              setPreferences(JSON.parse(stored));
            } catch (e) {
              console.error('Failed to parse preferences:', e);
            }
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        // Fallback to localStorage
        const stored = localStorage.getItem('clawrouter_preferences');
        if (stored) {
          try {
            setPreferences(JSON.parse(stored));
          } catch (e) {
            console.error('Failed to parse preferences:', e);
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated, user]);

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    setError(null);

    try {
      // Save to database via API
      const res = await fetch('/api/user/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${useUserStore.getState().token}`,
        },
        body: JSON.stringify(preferences),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save preferences');
      }

      // Also save to localStorage as backup
      localStorage.setItem('clawrouter_preferences', JSON.stringify(preferences));

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      // If API fails, at least save to localStorage
      localStorage.setItem('clawrouter_preferences', JSON.stringify(preferences));
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleExcludedModel = (modelId: string) => {
    setPreferences((prev) => ({
      ...prev,
      excludedModels: prev.excludedModels.includes(modelId)
        ? prev.excludedModels.filter((id) => id !== modelId)
        : [...prev.excludedModels, modelId],
    }));
  };

  // Determine if model is free or paid based on cost
  const getModelCostType = (model: ModelCapability): 'free' | 'paid' => {
    if (model.isFree) return 'free';
    if (model.cost.input === 0 && model.cost.output === 0) return 'free';
    return 'paid';
  };

  // Show loading skeleton
  if (authLoading || isLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
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

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-semantic-error/10 border border-semantic-error/20 rounded-lg">
            <p className="text-semantic-error">{error}</p>
          </div>
        )}

        {/* Optimization Goal - 评分权重滑块 */}
        <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
          <h2 className="text-xl font-bold text-neutral-10 mb-4">{t('optimizationGoal')}</h2>
          <p className="text-neutral-7 text-sm mb-6">{t('optimizationGoalDesc')}</p>

          {/* 滑块控件 */}
          <div className="space-y-4">
            {/* 当前选项标签 */}
            <div className="flex justify-center gap-8">
              <span className={`text-sm transition-colors ${preferences.optimizationGoal === 'cost' ? 'text-green-500 font-medium' : 'text-neutral-6'}`}>💰 {t('costFirst')}</span>
              <span className={`text-sm transition-colors ${preferences.optimizationGoal === 'balanced' ? 'text-brand-primary font-medium' : 'text-neutral-6'}`}>⚖️ {t('balanced')}</span>
              <span className={`text-sm transition-colors ${preferences.optimizationGoal === 'quality' ? 'text-purple-500 font-medium' : 'text-neutral-6'}`}>✨ {t('qualityFirst')}</span>
            </div>

            {/* 滑块 */}
            <div className="relative px-2">
              <input
                type="range"
                min="0"
                max="2"
                step="1"
                value={preferences.optimizationGoal === 'cost' ? 0 : preferences.optimizationGoal === 'balanced' ? 1 : 2}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  const goal = val === 0 ? 'cost' : val === 1 ? 'balanced' : 'quality';
                  setPreferences((prev) => ({ ...prev, optimizationGoal: goal as OptimizationGoal }));
                }}
                className="w-full h-3 rounded-full appearance-none cursor-pointer bg-gradient-to-r from-green-400 via-brand-primary to-purple-500"
              />
              {/* 刻度标签 */}
              <div className="flex justify-between mt-2 text-xs text-neutral-6">
                <span>省钱优先</span>
                <span>平衡</span>
                <span>质量优先</span>
              </div>
            </div>

            {/* 当前模式说明 */}
            <div className="text-center text-sm text-neutral-7 bg-surface-overlay rounded-lg py-3">
              {preferences.optimizationGoal === 'cost' && t('costFirstDesc')}
              {preferences.optimizationGoal === 'balanced' && t('balancedDesc')}
              {preferences.optimizationGoal === 'quality' && t('qualityFirstDesc')}
            </div>
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

        {/* Excluded Models - Dynamic from API */}
        <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
          <h2 className="text-xl font-bold text-neutral-10 mb-4">{t('excludeModels')}</h2>
          <p className="text-neutral-7 text-sm mb-4">{t('excludeModelsDesc')}</p>

          {models.length === 0 ? (
            <div className="text-center py-8 text-neutral-7">
              {t('noModelsAvailable')}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {models.map((model) => {
                const costType = getModelCostType(model);
                return (
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
                      {costType === 'free' ? t('free') : t('paid')}
                      {model.provider && ` · ${model.provider}`}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
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