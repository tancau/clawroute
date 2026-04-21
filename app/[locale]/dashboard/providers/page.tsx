'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/use-user-store';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { 
  Key, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  Loader2,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Settings,
  Server
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModelPickerDialog } from '@/components/ModelPickerDialog';

// 支持的预定义 Providers
const SUPPORTED_PROVIDERS = [
  { id: 'openai', name: 'OpenAI', keyPrefix: 'sk-', website: 'https://platform.openai.com/api-keys' },
  { id: 'deepseek', name: 'DeepSeek', keyPrefix: 'sk-', website: 'https://platform.deepseek.com/api_keys' },
  { id: 'openrouter', name: 'OpenRouter', keyPrefix: 'sk-or-', website: 'https://openrouter.ai/keys' },
  { id: 'anthropic', name: 'Anthropic', keyPrefix: 'sk-ant-', website: 'https://console.anthropic.com/' },
  { id: 'google', name: 'Google AI', keyPrefix: 'AIza', website: 'https://aistudio.google.com/app/apikey' },
  { id: 'mistral', name: 'Mistral', keyPrefix: '', website: 'https://console.mistral.ai/' },
  { id: 'groq', name: 'Groq', keyPrefix: 'gsk_', website: 'https://console.groq.com/keys' },
  { id: 'cohere', name: 'Cohere', keyPrefix: '', website: 'https://dashboard.cohere.com/api-keys' },
];

interface ProviderStatus {
  id: string;
  name: string;
  type: 'predefined' | 'custom';
  configured: boolean;
  maskedKey: string | null;
  keyPrefix?: string;
  baseUrl?: string;
  models?: string[];
  status: 'configured' | 'not_configured' | 'testing' | 'error';
  error?: string;
}

export default function ProvidersPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useUserStore();
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [editingProvider, setEditingProvider] = useState<string | null>(null);
  const [newApiKey, setNewApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  // 自定义 Provider 表单状态
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customForm, setCustomForm] = useState({
    name: '',
    baseUrl: '',
    apiKey: '',
    models: '',
  });
  const [customFormSaving, setCustomFormSaving] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchProviders();
    }
  }, [isAuthenticated]);

  const fetchProviders = async () => {
    try {
      const response = await fetch('/api/user/providers', {
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to fetch providers');
      
      const data = await response.json();
      setProviders(data.providers || []);
    } catch (error) {
      console.error('Failed to fetch providers:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const handleSaveKey = async (providerId: string) => {
    if (!newApiKey.trim()) return;
    
    setSaving(true);
    try {
      const response = await fetch('/api/user/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ provider: providerId, apiKey: newApiKey }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to save');
      }
      
      setEditingProvider(null);
      setNewApiKey('');
      setShowKey(false);
      await fetchProviders();
    } catch (error) {
      console.error('Failed to save key:', error);
      alert(error instanceof Error ? error.message : 'Failed to save API key');
    } finally {
      setSaving(false);
    }
  };

  const handleTestKey = async (providerId: string) => {
    setTesting(providerId);
    try {
      const provider = providers.find(p => p.id === providerId);
      
      const response = await fetch('/api/user/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          provider: providerId, 
          apiKey: provider?.configured ? 'test' : newApiKey,
          action: 'test'
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert(`${provider?.name || providerId} API key is valid!`);
      } else {
        alert(data.error?.message || 'API key validation failed');
      }
    } catch (error) {
      console.error('Test failed:', error);
      alert('Failed to test API key');
    } finally {
      setTesting(null);
    }
  };

  const handleDeleteKey = async (providerId: string) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;
    
    try {
      const response = await fetch(`/api/user/providers?provider=${providerId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      
      if (!response.ok) throw new Error('Failed to delete');
      
      await fetchProviders();
    } catch (error) {
      console.error('Failed to delete key:', error);
      alert('Failed to delete API key');
    }
  };

  const startEditing = (providerId: string) => {
    setEditingProvider(providerId);
    setNewApiKey('');
    setShowKey(false);
  };

  // 添加自定义 Provider
  const handleAddCustomProvider = async () => {
    if (!customForm.name.trim() || !customForm.baseUrl.trim() || !customForm.apiKey.trim()) {
      alert('Name, Base URL and API Key are required');
      return;
    }

    setCustomFormSaving(true);
    try {
      const response = await fetch('/api/user/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          custom: true,
          name: customForm.name,
          baseUrl: customForm.baseUrl,
          apiKey: customForm.apiKey,
          models: customForm.models ? customForm.models.split(',').map(m => m.trim()).filter(Boolean) : [],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to add custom provider');
      }

      // 重置表单
      setCustomForm({ name: '', baseUrl: '', apiKey: '', models: '' });
      setShowCustomForm(false);
      await fetchProviders();
    } catch (error) {
      console.error('Failed to add custom provider:', error);
      alert(error instanceof Error ? error.message : 'Failed to add custom provider');
    } finally {
      setCustomFormSaving(false);
    }
  };

  // 测试自定义 Provider
  const handleTestCustomProvider = async () => {
    if (!customForm.baseUrl.trim() || !customForm.apiKey.trim()) {
      alert('Base URL and API Key are required for testing');
      return;
    }

    setCustomFormSaving(true);
    try {
      const response = await fetch('/api/user/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          custom: true,
          name: customForm.name || 'Test',
          baseUrl: customForm.baseUrl,
          apiKey: customForm.apiKey,
          models: customForm.models ? customForm.models.split(',').map(m => m.trim()).filter(Boolean) : [],
          action: 'test',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Connection successful!' + (data.models ? ` Found ${data.models.length} models.` : ''));
      } else {
        alert(data.error?.message || 'Connection test failed');
      }
    } catch (error) {
      console.error('Test failed:', error);
      alert('Connection test failed');
    } finally {
      setCustomFormSaving(false);
    }
  };

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  const predefinedProviders = providers.filter(p => p.type === 'predefined');
  const customProviders = providers.filter(p => p.type === 'custom');

  return (
    <DashboardShell>
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-neutral-10">Provider API Keys</h1>
          <p className="text-neutral-7 mt-1">
            Configure your own API keys for intelligent routing. Your keys are encrypted and stored securely.
          </p>
        </div>

        {/* Security Notice */}
        <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-brand-primary mt-0.5" />
            <div className="text-sm text-neutral-7">
              <p className="font-medium text-neutral-10 mb-1">Security Note</p>
              <p>Your API keys are encrypted using AES-256-GCM before storage. We never store keys in plain text.</p>
            </div>
          </div>
        </div>

        {/* Predefined Providers */}
        <div className="bg-surface-raised border border-border-subtle rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border-subtle">
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-brand-primary" />
              <h2 className="text-xl font-semibold text-neutral-10">Predefined Providers</h2>
            </div>
          </div>

          {dataLoading ? (
            <div className="p-4 space-y-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {SUPPORTED_PROVIDERS.map((provider) => {
                const status = predefinedProviders.find(p => p.id === provider.id);
                const isConfigured = status?.configured;
                const isEditing = editingProvider === provider.id;
                const isTestingThis = testing === provider.id;

                return (
                  <div key={provider.id} className="p-4">
                    <div className="flex items-center justify-between">
                      {/* Provider Info */}
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold',
                          isConfigured ? 'bg-brand-primary/10 text-brand-primary' : 'bg-neutral-3 text-neutral-7'
                        )}>
                          {provider.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-neutral-10">{provider.name}</span>
                            {isConfigured && (
                              <span className="flex items-center gap-1 text-xs text-semantic-success">
                                <CheckCircle2 className="w-3 h-3" />
                                Configured
                              </span>
                            )}
                          </div>
                          {isConfigured && status?.maskedKey && !isEditing && (
                            <code className="text-xs text-neutral-7 font-mono">{status.maskedKey}</code>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <div className="relative">
                              <Input
                                type={showKey ? 'text' : 'password'}
                                value={newApiKey}
                                onChange={(e) => setNewApiKey(e.target.value)}
                                placeholder={`Enter ${provider.name} API key`}
                                className="w-64 pr-10"
                              />
                              <button
                                onClick={() => setShowKey(!showKey)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-7 hover:text-neutral-10"
                              >
                                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    onClick={() => handleSaveKey(provider.id)}
                                    disabled={!newApiKey.trim() || saving}
                                    size="sm"
                                  >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Save API Key</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    onClick={() => { setEditingProvider(null); setNewApiKey(''); }}
                                    variant="outline"
                                    size="sm"
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Cancel</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </>
                        ) : (
                          <>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <a
                                    href={provider.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-neutral-7 hover:text-neutral-10 p-2"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent>Get API Key</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            {isConfigured && (
                              <>
                                <Button
                                  onClick={() => handleTestKey(provider.id)}
                                  variant="outline"
                                  size="sm"
                                  disabled={isTestingThis}
                                >
                                  {isTestingThis ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    'Test'
                                  )}
                                </Button>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        onClick={() => startEditing(provider.id)}
                                        variant="outline"
                                        size="sm"
                                      >
                                        Edit
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit API Key</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        onClick={() => handleDeleteKey(provider.id)}
                                        variant="outline"
                                        size="sm"
                                        className="text-semantic-error hover:bg-semantic-error/10"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Delete API Key</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </>
                            )}
                            {!isConfigured && (
                              <Button
                                onClick={() => startEditing(provider.id)}
                                size="sm"
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Add Key
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Custom Providers */}
        <div className="bg-surface-raised border border-border-subtle rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border-subtle flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Server className="w-5 h-5 text-brand-primary" />
              <h2 className="text-xl font-semibold text-neutral-10">Custom Providers</h2>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => setShowCustomForm(!showCustomForm)}
                    variant="outline"
                    size="sm"
                  >
                    {showCustomForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4 mr-1" />}
                    {showCustomForm ? 'Cancel' : 'Add Custom'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{showCustomForm ? 'Cancel adding custom provider' : 'Add a custom LLM gateway'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Add Custom Provider Form */}
          {showCustomForm && (
            <div className="p-4 border-b border-border-subtle bg-brand-primary/5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-10 mb-1">
                    Provider Name *
                  </label>
                  <Input
                    value={customForm.name}
                    onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })}
                    placeholder="e.g., New-API, My LLM Gateway"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-10 mb-1">
                    Base URL *
                  </label>
                  <Input
                    value={customForm.baseUrl}
                    onChange={(e) => setCustomForm({ ...customForm, baseUrl: e.target.value })}
                    placeholder="e.g., http://localhost:3000/v1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-10 mb-1">
                    API Key *
                  </label>
                  <Input
                    type="password"
                    value={customForm.apiKey}
                    onChange={(e) => setCustomForm({ ...customForm, apiKey: e.target.value })}
                    placeholder="Your API key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-10 mb-1">
                    Models (optional, comma-separated)
                  </label>
                  <div className="relative">
                    <Input
                      value={customForm.models}
                      onChange={(e) => setCustomForm({ ...customForm, models: e.target.value })}
                      placeholder="Click to select models or type manually"
                      onClick={() => {
                        if (customForm.baseUrl.trim() && customForm.apiKey.trim()) {
                          setShowModelPicker(true);
                        }
                      }}
                      className={cn(
                        customForm.baseUrl.trim() && customForm.apiKey.trim()
                          ? 'cursor-pointer hover:border-brand-primary focus:border-brand-primary'
                          : ''
                      )}
                    />
                    {customForm.baseUrl.trim() && customForm.apiKey.trim() && !customForm.models && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-brand-primary pointer-events-none">
                        Click to discover
                      </span>
                    )}
                  </div>
                  {!customForm.baseUrl.trim() || !customForm.apiKey.trim() ? (
                    <p className="text-xs text-neutral-7 mt-1">
                      Enter Base URL and API Key first to enable auto-discovery
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button
                  onClick={handleAddCustomProvider}
                  disabled={customFormSaving || !customForm.name || !customForm.baseUrl || !customForm.apiKey}
                >
                  {customFormSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
                  Save Provider
                </Button>
                <Button
                  onClick={handleTestCustomProvider}
                  variant="outline"
                  disabled={customFormSaving || !customForm.baseUrl || !customForm.apiKey}
                >
                  Test Connection
                </Button>
              </div>
            </div>
          )}

          {/* Custom Providers List */}
          {customProviders.length > 0 ? (
            <div className="divide-y divide-border-subtle">
              {customProviders.map((provider) => {
                const isTestingThis = testing === provider.id;

                return (
                  <div key={provider.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold bg-purple-500/10 text-purple-500">
                          <Settings className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-neutral-10">{provider.name}</span>
                            <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-500">Custom</span>
                            <span className="flex items-center gap-1 text-xs text-semantic-success">
                              <CheckCircle2 className="w-3 h-3" />
                              Configured
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-1">
                            <code className="text-xs text-neutral-7 font-mono">{provider.baseUrl}</code>
                            {provider.maskedKey && (
                              <code className="text-xs text-neutral-7 font-mono">{provider.maskedKey}</code>
                            )}
                          </div>
                          {provider.models && provider.models.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {provider.models.slice(0, 5).map(model => (
                                <span key={model} className="text-xs px-2 py-0.5 rounded bg-neutral-3 text-neutral-7">
                                  {model}
                                </span>
                              ))}
                              {provider.models.length > 5 && (
                                <span className="text-xs text-neutral-7">+{provider.models.length - 5} more</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleTestKey(provider.id)}
                          variant="outline"
                          size="sm"
                          disabled={isTestingThis}
                        >
                          {isTestingThis ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Test'}
                        </Button>
                        <Button
                          onClick={() => handleDeleteKey(provider.id)}
                          variant="outline"
                          size="sm"
                          className="text-semantic-error hover:bg-semantic-error/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            !showCustomForm && (
              <div className="p-8 text-center text-neutral-7">
                <Server className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No custom providers configured yet.</p>
                <p className="text-sm mt-1">Click &quot;Add Custom&quot; to add your own LLM gateway or API endpoint.</p>
              </div>
            )
          )}
        </div>

        {/* How It Works */}
        <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
          <h2 className="text-xl font-semibold text-neutral-10 mb-4">How It Works</h2>
          <div className="space-y-4 text-neutral-7">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-sm">1</div>
              <div>
                <p className="font-medium text-neutral-10">Configure Your Keys</p>
                <p className="text-sm">Add your own API keys for predefined providers, or add custom LLM gateways.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-sm">2</div>
              <div>
                <p className="font-medium text-neutral-10">Smart Routing</p>
                <p className="text-sm">ClawRouter will use your keys when making requests, giving you full control over costs.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-sm">3</div>
              <div>
                <p className="font-medium text-neutral-10">Track Usage</p>
                <p className="text-sm">Monitor usage directly on each provider&apos;s dashboard.</p>
              </div>
            </div>
          </div>
        </div>
        {/* Model Picker Dialog */}
        <ModelPickerDialog
          open={showModelPicker}
          onOpenChange={setShowModelPicker}
          baseUrl={customForm.baseUrl}
          apiKey={customForm.apiKey}
          selectedModels={customForm.models ? customForm.models.split(',').map(m => m.trim()).filter(Boolean) : []}
          onConfirm={(models) => {
            setCustomForm({ ...customForm, models: models.join(', ') });
          }}
        />
      </div>
    </DashboardShell>
  );
}
