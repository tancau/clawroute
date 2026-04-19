'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/use-user-store';
import { api } from '@/lib/api';
import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { useTranslations } from 'next-intl';
import { Skeleton } from '@/components/ui/skeleton';
import { Key, Copy, RefreshCw, Check, Code } from 'lucide-react';

export default function ApiKeyPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useUserStore();
  const t = useTranslations('apiKey');
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleCopy = async () => {
    if (!user?.apiKey) return;
    
    try {
      await navigator.clipboard.writeText(user.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleRegenerate = async () => {
    if (!user?.id) return;
    
    setIsRegenerating(true);
    try {
      const result = await api.regenerateApiKey(user.id);
      if (result.data?.apiKey) {
        useUserStore.setState({ user: { ...user, apiKey: result.data.apiKey } });
      }
    } catch (err) {
      console.error('Failed to regenerate:', err);
    }
    setIsRegenerating(false);
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
          <h1 className="text-3xl font-bold text-neutral-10">{t('title')}</h1>
          <p className="text-neutral-7 mt-1">{t('description')}</p>
        </div>

        {/* API Key Display */}
        <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Key className="w-5 h-5 text-brand-primary" />
            <h2 className="text-xl font-semibold text-neutral-10">{t('yourApiKey')}</h2>
          </div>

          {user.apiKey ? (
            <div className="space-y-4">
              {/* Key Display Box */}
              <div className="flex items-center gap-3 p-4 bg-surface-overlay border border-border-subtle rounded-lg">
                <code className="flex-1 text-neutral-10 font-mono text-lg select-all break-all">
                  {user.apiKey}
                </code>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-primary/10 text-brand-primary rounded-lg hover:bg-brand-primary/20 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      {t('copied')}
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      {t('copy')}
                    </>
                  )}
                </button>
              </div>

              {/* Regenerate Button */}
              <button
                onClick={handleRegenerate}
                disabled={isRegenerating}
                className="flex items-center gap-2 px-4 py-2 text-neutral-7 hover:text-semantic-error transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                {isRegenerating ? t('regenerating') : t('regenerate')}
              </button>

              <p className="text-xs text-neutral-6">{t('regenerateWarning')}</p>
            </div>
          ) : (
            <div className="p-4 bg-semantic-warning/10 border border-semantic-warning/20 rounded-lg">
              <p className="text-semantic-warning">{t('noApiKey')}</p>
            </div>
          )}
        </div>

        {/* Usage Example */}
        <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Code className="w-5 h-5 text-brand-primary" />
            <h2 className="text-xl font-semibold text-neutral-10">{t('usageExample')}</h2>
          </div>

          <div className="space-y-4">
            <p className="text-neutral-7">{t('usageDescription')}</p>

            {/* Python Example */}
            <div className="bg-surface-overlay border border-border-subtle rounded-lg p-4">
              <div className="text-sm text-neutral-6 mb-2">{t('python')}</div>
              <pre className="text-neutral-10 font-mono text-sm overflow-x-auto">
                <code>{`from openai import OpenAI

client = OpenAI(
    base_url="https://api.clawrouter.com/v1",
    api_key="${user.apiKey || 'cr-YOUR_API_KEY'}"
)

response = client.chat.completions.create(
    model="auto",  # ${t('autoRouteComment')}
    messages=[{"role": "user", "content": "Hello!"}]
)

print(response.choices[0].message.content)`}</code>
              </pre>
            </div>

            {/* JavaScript Example */}
            <div className="bg-surface-overlay border border-border-subtle rounded-lg p-4">
              <div className="text-sm text-neutral-6 mb-2">{t('javascript')}</div>
              <pre className="text-neutral-10 font-mono text-sm overflow-x-auto">
                <code>{`import OpenAI from 'openai';

const client = new OpenAI({
    baseURL: "https://api.clawrouter.com/v1",
    apiKey: "${user.apiKey || 'cr-YOUR_API_KEY'}"
});

const response = await client.chat.completions.create({
    model: "auto",  // ${t('autoRouteComment')}
    messages: [{ role: "user", content: "Hello!" }]
});

console.log(response.choices[0].message.content);`}</code>
              </pre>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
          <h2 className="text-xl font-semibold text-neutral-10 mb-4">{t('features')}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: '⚡', title: t('featureSmartRouting'), desc: t('featureSmartRoutingDesc') },
              { icon: '💰', title: t('featureSaveCost'), desc: t('featureSaveCostDesc') },
              { icon: '🔄', title: t('featureCompatible'), desc: t('featureCompatibleDesc') },
              { icon: '🎯', title: t('featureAutoIntent'), desc: t('featureAutoIntentDesc') },
            ].map((item, idx) => (
              <div key={idx} className="p-4 bg-surface-overlay rounded-lg">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-neutral-10 font-medium">{item.title}</div>
                <div className="text-sm text-neutral-7 mt-1">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}