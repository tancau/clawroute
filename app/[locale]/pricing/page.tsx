'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { DollarSign, Zap, Star, TrendingDown, CheckCircle } from 'lucide-react';

interface Model {
  id: string;
  name: string;
  provider: string;
  speedRating: number;
  qualityRating: number;
  capabilityTags: string[];
  contextWindow: number;
  maxTokens: number;
  costPer1MToken: number;
  outputCostPer1MToken?: number;
}

// GPT-4 reference price for comparison
const GPT4_INPUT_COST = 5; // $5 per 1M tokens
const GPT4_OUTPUT_COST = 15; // $15 per 1M tokens

export default function PricingPage() {
  const t = useTranslations('pricing');
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'cost' | 'quality' | 'speed'>('cost');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      setLoading(true);
      const response = await fetch('/data/models.json');
      const data = await response.json();
      setModels(data);
    } catch (err) {
      console.error('Failed to load models:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get unique providers
  const providers = ['all', ...Array.from(new Set(models.map(m => m.provider)))];

  // Filter and sort models
  const filteredModels = models
    .filter(model => {
      if (filterProvider !== 'all' && model.provider !== filterProvider) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return model.name.toLowerCase().includes(query) || 
               model.id.toLowerCase().includes(query);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'cost') {
        return (a.costPer1MToken + (a.outputCostPer1MToken || a.costPer1MToken)) - 
               (b.costPer1MToken + (b.outputCostPer1MToken || b.costPer1MToken));
      }
      if (sortBy === 'quality') return b.qualityRating - a.qualityRating;
      return b.speedRating - a.speedRating;
    });

  // Calculate savings compared to GPT-4
  const calculateSavings = (model: Model) => {
    const modelAvgCost = model.costPer1MToken + (model.outputCostPer1MToken || model.costPer1MToken) / 2;
    const gpt4AvgCost = (GPT4_INPUT_COST + GPT4_OUTPUT_COST) / 2;
    if (gpt4AvgCost === 0) return 0;
    return ((gpt4AvgCost - modelAvgCost) / gpt4AvgCost * 100);
  };

  // Determine if model is recommended by HopLLM (free or very cheap)
  const isRecommended = (model: Model) => {
    return model.costPer1MToken <= 0.2 && model.qualityRating >= 2;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-[#94a3b8]">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#1e293b] to-[#0f172a] border-b border-[#334155]">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-8 h-8 text-[#00c9ff]" />
            <h1 className="text-3xl font-bold text-white">{t('title')}</h1>
          </div>
          <p className="text-[#94a3b8]">{t('subtitle')}</p>

          {/* Info Banner */}
          <div className="mt-6 p-4 bg-[#00c9ff]/10 border border-[#00c9ff]/30 rounded-lg">
            <div className="flex items-start gap-3">
              <TrendingDown className="w-5 h-5 text-[#00c9ff]" />
              <div className="text-sm text-[#00c9ff]">
                <strong>{t('comparisonNote')}</strong> {t('comparisonDetail')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          {/* Search */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="flex-1 min-w-[200px] px-4 py-2 bg-[#1e293b] border border-[#334155] rounded-lg text-white placeholder-[#64748b] focus:outline-none focus:border-[#00c9ff]"
          />

          {/* Provider Filter */}
          <select
            value={filterProvider}
            onChange={(e) => setFilterProvider(e.target.value)}
            className="px-4 py-2 bg-[#1e293b] border border-[#334155] rounded-lg text-white focus:outline-none focus:border-[#00c9ff]"
          >
            {providers.map(p => (
              <option key={p} value={p}>
                {p === 'all' ? t('allProviders') : p}
              </option>
            ))}
          </select>

          {/* Sort */}
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('cost')}
              className={`px-4 py-2 rounded-lg transition-all ${
                sortBy === 'cost'
                  ? 'bg-[#00c9ff] text-[#0f172a] font-medium'
                  : 'bg-[#1e293b] text-[#94a3b8] hover:text-white'
              }`}
            >
              <DollarSign className="w-4 h-4 inline mr-1" />
              {t('sortByCost')}
            </button>
            <button
              onClick={() => setSortBy('quality')}
              className={`px-4 py-2 rounded-lg transition-all ${
                sortBy === 'quality'
                  ? 'bg-[#00c9ff] text-[#0f172a] font-medium'
                  : 'bg-[#1e293b] text-[#94a3b8] hover:text-white'
              }`}
            >
              <Star className="w-4 h-4 inline mr-1" />
              {t('sortByQuality')}
            </button>
            <button
              onClick={() => setSortBy('speed')}
              className={`px-4 py-2 rounded-lg transition-all ${
                sortBy === 'speed'
                  ? 'bg-[#00c9ff] text-[#0f172a] font-medium'
                  : 'bg-[#1e293b] text-[#94a3b8] hover:text-white'
              }`}
            >
              <Zap className="w-4 h-4 inline mr-1" />
              {t('sortBySpeed')}
            </button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-[#1e293b] rounded-lg p-4 border border-[#334155]">
            <div className="text-2xl font-bold text-white">{models.length}</div>
            <div className="text-sm text-[#94a3b8]">{t('totalModels')}</div>
          </div>
          <div className="bg-[#1e293b] rounded-lg p-4 border border-[#334155]">
            <div className="text-2xl font-bold text-green-400">
              {models.filter(m => m.costPer1MToken === 0).length}
            </div>
            <div className="text-sm text-[#94a3b8]">{t('freeModels')}</div>
          </div>
          <div className="bg-[#1e293b] rounded-lg p-4 border border-[#334155]">
            <div className="text-2xl font-bold text-[#00c9ff]">
              {models.filter(isRecommended).length}
            </div>
            <div className="text-sm text-[#94a3b8]">{t('hopllmRecommended')}</div>
          </div>
          <div className="bg-[#1e293b] rounded-lg p-4 border border-[#334155]">
            <div className="text-2xl font-bold text-yellow-400">
              {Math.round(models.reduce((sum, m) => sum + calculateSavings(m), 0) / models.length)}%
            </div>
            <div className="text-sm text-[#94a3b8]">{t('avgSavings')}</div>
          </div>
        </div>

        {/* Price Table */}
        <div className="bg-[#1e293b] rounded-xl border border-[#334155] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0f172a] border-b border-[#334155]">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[#94a3b8]">{t('modelName')}</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[#94a3b8]">{t('provider')}</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-[#94a3b8]">{t('quality')}</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-[#94a3b8]">{t('speed')}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[#94a3b8]">{t('inputCost')}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[#94a3b8]">{t('outputCost')}</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-[#94a3b8]">{t('savingsVsGpt4')}</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-[#94a3b8]">{t('hopllmChoice')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#334155]">
                {filteredModels.map((model) => {
                  const savings = calculateSavings(model);
                  const recommended = isRecommended(model);
                  
                  return (
                    <tr 
                      key={model.id}
                      className={`hover:bg-[#0f172a]/50 transition-colors ${
                        recommended ? 'bg-green-500/5 border-l-2 border-green-500' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{model.name}</span>
                          {recommended && (
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                              {t('recommended')}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#64748b]">{model.id}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#94a3b8] capitalize">{model.provider}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {[...Array(3)].map((_, i) => (
                            <Star 
                              key={i} 
                              className={`w-3 h-3 ${i < model.qualityRating ? 'text-yellow-400 fill-yellow-400' : 'text-[#334155]'}`}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {[...Array(3)].map((_, i) => (
                            <Zap 
                              key={i} 
                              className={`w-3 h-3 ${i < model.speedRating ? 'text-[#00c9ff]' : 'text-[#334155]'}`}
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${model.costPer1MToken === 0 ? 'text-green-400' : 'text-white'}`}>
                          {model.costPer1MToken === 0 ? t('free') : `$${model.costPer1MToken.toFixed(2)}`}
                        </span>
                        <span className="text-xs text-[#64748b]">/1M</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-medium ${(model.outputCostPer1MToken || model.costPer1MToken) === 0 ? 'text-green-400' : 'text-white'}`}>
                          {(model.outputCostPer1MToken || model.costPer1MToken) === 0 
                            ? t('free') 
                            : `$${(model.outputCostPer1MToken || model.costPer1MToken).toFixed(2)}`}
                        </span>
                        <span className="text-xs text-[#64748b]">/1M</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${savings >= 90 ? 'text-green-400' : savings >= 50 ? 'text-[#00c9ff]' : 'text-[#94a3b8]'}`}>
                          {savings.toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {recommended ? (
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        ) : (
                          <span className="text-[#64748b]">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-6 p-4 bg-[#1e293b] rounded-lg border border-[#334155]">
          <div className="text-sm text-[#94a3b8]">
            <strong className="text-[#00c9ff]">{t('noteTitle')}</strong> {t('noteContent')}
          </div>
        </div>
      </div>
    </div>
  );
}