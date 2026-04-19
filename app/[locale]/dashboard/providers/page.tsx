'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/use-user-store';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';

// 支持的 Providers
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
  configured: boolean;
  maskedKey: string | null;
  keyPrefix: string;
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

        {/* Providers List */}
        <div className="bg-surface-raised border border-border-subtle rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border-subtle">
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-brand-primary" />
              <h2 className="text-xl font-semibold text-neutral-10">Configured Providers</h2>
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
                const status = providers.find(p => p.id === provider.id);
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
                            <Button
                              onClick={() => handleSaveKey(provider.id)}
                              disabled={!newApiKey.trim() || saving}
                              size="sm"
                            >
                              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </Button>
                            <Button
                              onClick={() => { setEditingProvider(null); setNewApiKey(''); }}
                              variant="outline"
                              size="sm"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <a
                              href={provider.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-neutral-7 hover:text-neutral-10 p-2"
                              title="Get API Key"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
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
                                <Button
                                  onClick={() => startEditing(provider.id)}
                                  variant="outline"
                                  size="sm"
                                >
                                  Edit
                                </Button>
                                <Button
                                  onClick={() => handleDeleteKey(provider.id)}
                                  variant="outline"
                                  size="sm"
                                  className="text-semantic-error hover:bg-semantic-error/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
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

        {/* How It Works */}
        <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
          <h2 className="text-xl font-semibold text-neutral-10 mb-4">How It Works</h2>
          <div className="space-y-4 text-neutral-7">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-sm">1</div>
              <div>
                <p className="font-medium text-neutral-10">Configure Your Keys</p>
                <p className="text-sm">Add your own API keys for the providers you want to use.</p>
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
      </div>
    </DashboardShell>
  );
}
