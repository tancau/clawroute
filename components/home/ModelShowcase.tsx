'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  providerName: string;
  costPer1MToken: number;
  outputCostPer1MToken: number;
  speedRating: number;
  qualityRating: number;
  capabilityTags: string[];
  contextWindow: number;
  pricingSource: string;
}

export function ModelShowcase() {
  const t = useTranslations('modelShowcase');
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/public-models')
      .then(res => res.json())
      .then(data => {
        if (data.models) {
          setModels(data.models.slice(0, 12)); // Show top 12 models
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#00c9ff]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-400">
        {t('loadError') || 'Failed to load models'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h3 className="text-2xl font-bold text-[#f8fafc] mb-2">
          {t('title') || 'Supported Models'}
        </h3>
        <p className="text-[#94a3b8]">
          {t('subtitle') || 'Compare prices across multiple providers'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.map((model) => (
          <div
            key={`${model.provider}-${model.id}`}
            className="bg-[#0a0a0a] border border-[#2a2d3a] rounded-xl p-4 hover:border-[#00c9ff]/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-[#f8fafc] text-sm truncate">
                {model.name}
              </h4>
              <Badge variant="outline" className="text-xs border-[#2a2d3a] text-[#94a3b8]">
                {model.providerName}
              </Badge>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#94a3b8]">{t('inputCost') || 'Input'}</span>
                <span className="text-[#00c9ff] font-medium">
                  ${model.costPer1MToken?.toFixed(2) || '?'}/1M
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94a3b8]">{t('outputCost') || 'Output'}</span>
                <span className="text-[#92fe9d] font-medium">
                  ${model.outputCostPer1MToken?.toFixed(2) || '?'}/1M
                </span>
              </div>
              {model.contextWindow > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#94a3b8]">{t('context') || 'Context'}</span>
                  <span className="text-[#f8fafc]">
                    {model.contextWindow >= 1000 
                      ? `${(model.contextWindow / 1000).toFixed(0)}K` 
                      : model.contextWindow}
                  </span>
                </div>
              )}
            </div>

            {model.capabilityTags && model.capabilityTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {model.capabilityTags.slice(0, 3).map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs bg-[#1a1d29]">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="text-center mt-6">
        <a
          href="/configure"
          className="inline-flex items-center gap-2 px-6 py-3 border border-[#00c9ff] text-[#00c9ff] rounded-xl hover:bg-[#00c9ff]/10 transition-colors"
        >
          {t('viewAll') || 'View All Models'}
        </a>
      </div>
    </div>
  );
}
