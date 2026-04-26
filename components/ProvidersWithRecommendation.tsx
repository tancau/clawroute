'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useUserStore } from '@/store/use-user-store';
import { ModelRecommendationPanel } from '@/components/ModelRecommendationPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface ProvidersWithRecommendationProps {
  userId: string;
  locale?: string;
}

interface DetectedModels {
  provider: string;
  models: string[];
  timestamp: string;
}

interface PresetResponse {
  preset: string;
  models: {
    default: string;
    coding: string;
    reasoning: string;
    creative: string;
    cheap: string;
    math?: string;
    translation?: string;
    chinese?: string;
    longContext?: string;
  };
  reasons: Record<string, string>;
  costs: Record<string, { input: number; output: number }>;
}

const PREDEFINED_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', placeholder: 'sk-...' },
  { id: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-...' },
  { id: 'google', name: 'Google AI', placeholder: 'AIza...' },
  { id: 'deepseek', name: 'DeepSeek', placeholder: 'sk-...' },
  { id: 'openrouter', name: 'OpenRouter', placeholder: 'sk-or-...' },
  { id: 'glm', name: 'GLM (智谱)', placeholder: '...' },
  { id: 'qwen', name: 'Qwen (通义)', placeholder: '...' },
  { id: 'mistral', name: 'Mistral', placeholder: '...' },
];

export function ProvidersWithRecommendation({ userId, locale = 'en' }: ProvidersWithRecommendationProps) {
  const t = useTranslations('providers');
  const tRec = useTranslations('modelRecommendation');
  const { keys, fetchKeys, isLoading } = useUserStore();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [detectedModels, setDetectedModels] = useState<DetectedModels | null>(null);
  const [showRecommendation, setShowRecommendation] = useState(false);
  const [savedPreferences, setSavedPreferences] = useState<PresetResponse | null>(null);
  const [isAddingProvider, setIsAddingProvider] = useState(false);

  useEffect(() => {
    fetchKeys(userId);
  }, [userId, fetchKeys]);

  // Models list - would need to be fetched from provider API
  // For now, use empty array until we implement model discovery
  const allAvailableModels: string[] = [];

  const handleDiscoverModels = async (provider: string, key: string, url?: string) => {
    setError(null);
    try {
      const endpoint = url || getDefaultUrl(provider);
      const response = await fetch(`${endpoint}/models`, {
        headers: { 'Authorization': `Bearer ${key}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        const models = data.data?.map((m: { id: string }) => m.id) || [];
        setDetectedModels({ provider, models, timestamp: new Date().toISOString() });
        setShowRecommendation(true);
        return models;
      }
    } catch (_err) {
      console.error('Failed to discover models:', _err);
    }
    return [];
  };

  const handleAddProvider = async () => {
    setError(null);
    setIsAddingProvider(true);
    
    try {
      const response = await fetch('/api/user/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: selectedProvider,
          apiKey,
          baseUrl: baseUrl || undefined,
          action: 'test',
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Discover models
        const models = await handleDiscoverModels(selectedProvider, apiKey, baseUrl);
        
        // Save key
        await fetchKeys(userId);
        setApiKey('');
        setShowAddForm(false);
        
        if (models.length > 0) {
          setShowRecommendation(true);
        }
      } else {
        setError(data.error?.message || 'Failed to add provider');
      }
    } catch {
      setError('Connection failed');
    } finally {
      setIsAddingProvider(false);
    }
  };

  const handleApplyPreset = async (preset: PresetResponse) => {
    setSavedPreferences(preset);
    
    // Save preferences
    try {
      await fetch('/api/user/model-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset: preset.preset,
          models: preset.models,
        }),
      });
    } catch (err) {
      console.error('Failed to save preferences:', err);
    }
  };

  const getDefaultUrl = (provider: string) => {
    switch (provider) {
      case 'openai': return 'https://api.openai.com/v1';
      case 'anthropic': return 'https://api.anthropic.com/v1';
      case 'google': return 'https://generativelanguage.googleapis.com/v1';
      case 'deepseek': return 'https://api.deepseek.com/v1';
      case 'openrouter': return 'https://openrouter.ai/api/v1';
      case 'mistral': return 'https://api.mistral.ai/v1';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Provider Keys */}
      <Card className="bg-[#0f172a] border-[#1e293b]">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span>{t('title')}</span>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              variant="outline"
              className="border-[#00c9ff] text-[#00c9ff] hover:bg-[#00c9ff]/10"
            >
              {showAddForm ? t('cancelAdd') : t('addKey')}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Provider Form */}
          {showAddForm && (
            <div className="p-4 bg-[#1e293b] rounded-lg space-y-4">
              <div>
                <label className="block text-sm text-[#94a3b8] mb-2">{t('selectProvider')}</label>
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger className="bg-[#0f172a] border-[#334155] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0f172a] border-[#334155]">
                    {PREDEFINED_PROVIDERS.map(p => (
                      <SelectItem key={p.id} value={p.id} className="text-white">
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm text-[#94a3b8] mb-2">{t('apiKeyLabel')}</label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder={PREDEFINED_PROVIDERS.find(p => p.id === selectedProvider)?.placeholder}
                  className="bg-[#0f172a] border-[#334155] text-white"
                />
              </div>
              
              {['openrouter', 'glm', 'qwen', 'custom'].includes(selectedProvider) && (
                <div>
                  <label className="block text-sm text-[#94a3b8] mb-2">{t('baseUrl')}</label>
                  <Input
                    value={baseUrl}
                    onChange={e => setBaseUrl(e.target.value)}
                    placeholder="https://..."
                    className="bg-[#0f172a] border-[#334155] text-white"
                  />
                </div>
              )}
              
              {error && <p className="text-red-400 text-sm">{error}</p>}
              
              <Button
                onClick={handleAddProvider}
                disabled={!apiKey || isAddingProvider}
                className="w-full bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] text-[#0f172a] font-semibold"
              >
                {isLoading ? t('testing') : t('saveProvider')}
              </Button>
            </div>
          )}
          
          {/* Provider List */}
          {keys.length === 0 ? (
            <div className="text-center py-8 text-[#64748b]">
              {t('noKeysConfigured')}
              <br />
              <span className="text-sm">{t('securityNoteDesc')}</span>
            </div>
          ) : (
            <div className="space-y-3">
              {keys.map(key => (
                <div key={key.id} className="flex items-center justify-between p-4 bg-[#1e293b] rounded-lg">
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary" className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                      {key.provider}
                    </Badge>
                    <div>
                      <div className="font-mono text-[#94a3b8]">{key.keyPreview}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={key.isActive ? 'default' : 'secondary'}>
                      {key.isActive ? t('configured') : t('notConfigured')}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Model Recommendation Panel */}
      {showRecommendation && allAvailableModels.length > 0 && (
        <ModelRecommendationPanel
          availableModels={allAvailableModels}
          onApplyPreset={handleApplyPreset}
          locale={locale}
        />
      )}
      
      {/* Saved Preferences Display */}
      {savedPreferences && (
        <Card className="bg-[#0f172a] border-[#1e293b]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <span>✅</span>
              {tRec('applySuccess')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-[#1e293b] rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] text-[#0f172a]">
                  {savedPreferences.preset}
                </Badge>
              </div>
              <Separator className="bg-[#334155] mb-4" />
              <div className="space-y-2 text-sm">
                {Object.entries(savedPreferences.models).map(([task, model]) => (
                  model && (
                    <div key={task} className="flex justify-between text-[#94a3b8]">
                      <span>{task}:</span>
                      <span className="text-white">{model}</span>
                    </div>
                  )
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Recommendation Dialog (for detected models) */}
      <Dialog open={detectedModels !== null && showRecommendation} onOpenChange={setShowRecommendation}>
        <DialogContent className="bg-[#0f172a] border-[#1e293b] max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-white">{tRec('title')}</DialogTitle>
            <DialogDescription className="text-[#94a3b8]">
              {tRec('foundModels', { count: detectedModels?.models?.length || 0 })}
            </DialogDescription>
          </DialogHeader>
          <ModelRecommendationPanel
            availableModels={detectedModels?.models || []}
            onApplyPreset={handleApplyPreset}
            locale={locale}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

