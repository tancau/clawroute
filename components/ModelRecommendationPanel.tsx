'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

interface RecommendationItem {
  model: string;
  score: number;
  costPerToken: { input: number; output: number };
  capabilityScore: number;
  valueScore: number;
  reason: string;
}

interface PresetRecommendation {
  model: string;
  reason: string;
}

interface RecommendationResponse {
  recommendations: RecommendationItem[];
  presets: {
    optimal: PresetRecommendation;
    economy: PresetRecommendation;
    power: PresetRecommendation;
  };
  taskRecommendations?: Record<string, RecommendationItem>;
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

interface ModelRecommendationPanelProps {
  availableModels: string[];
  onApplyPreset?: (preset: PresetResponse) => void;
  onModelSelect?: (task: string, model: string) => void;
  locale?: string;
}

const TASK_LABELS: Record<string, { en: string; zh: string }> = {
  default: { en: 'Default Chat', zh: '默认对话' },
  coding: { en: 'Coding', zh: '代码编写' },
  reasoning: { en: 'Reasoning', zh: '数学推理' },
  creative: { en: 'Creative', zh: '创意写作' },
  cheap: { en: 'Budget', zh: '省钱备选' },
  math: { en: 'Math', zh: '数学计算' },
  translation: { en: 'Translation', zh: '翻译' },
  chinese: { en: 'Chinese', zh: '中文处理' },
  longContext: { en: 'Long Context', zh: '长文本' },
};

export function ModelRecommendationPanel({
  availableModels,
  onApplyPreset,
  onModelSelect,
  locale = 'en',
}: ModelRecommendationPanelProps) {
  const t = useTranslations('modelRecommendation');
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<PresetResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('recommendations');

  useEffect(() => {
    if (availableModels.length > 0) {
      fetchRecommendations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableModels]);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/models/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          availableModels,
          intent: 'auto',
          budget: 'medium',
          mode: 'best',
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setRecommendations(data);
      }
    } catch (error) {
      console.error('Failed to fetch recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyPreset = async (presetType: 'optimal' | 'economy' | 'power') => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/models/preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preset: presetType,
          availableModels,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setSelectedPreset(data);
        onApplyPreset?.(data);
      }
    } catch (error) {
      console.error('Failed to apply preset:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCost = (cost: { input: number; output: number }) => {
    if (cost.input === 0 && cost.output === 0) {
      return locale === 'zh' ? '免费' : 'Free';
    }
    return `$${cost.input.toFixed(2)}/${cost.output.toFixed(2)}`;
  };

  const formatModelName = (modelId: string) => {
    const parts = modelId.split('/');
    return parts.length > 1 ? parts[1] : modelId;
  };

  const getTaskLabel = (task: string) => {
    const label = TASK_LABELS[task];
    return label ? (locale === 'zh' ? label.zh : label.en) : task;
  };

  if (availableModels.length === 0) {
    return null;
  }

  return (
    <Card className="bg-[#0f172a] border-[#1e293b]">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <span>🎯</span>
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* One-Click Preset Buttons */}
        <div className="space-y-4">
          <p className="text-[#94a3b8] text-sm">{t('presetDesc')}</p>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => applyPreset('optimal')}
              disabled={isLoading}
              className="bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] text-[#0f172a] font-semibold hover:opacity-90"
            >
              🚀 {t('optimal')}
            </Button>
            <Button
              onClick={() => applyPreset('economy')}
              disabled={isLoading}
              variant="outline"
              className="border-[#334155] text-[#94a3b8] hover:bg-[#1e293b]"
            >
              💰 {t('economy')}
            </Button>
            <Button
              onClick={() => applyPreset('power')}
              disabled={isLoading}
              variant="outline"
              className="border-[#334155] text-[#94a3b8] hover:bg-[#1e293b]"
            >
              💪 {t('power')}
            </Button>
          </div>
        </div>

        {/* Tabs for detailed view */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[#1e293b]">
            <TabsTrigger value="recommendations" className="text-[#94a3b8] data-[state=active]:text-white">
              {t('recommendations')}
            </TabsTrigger>
            <TabsTrigger value="tasks" className="text-[#94a3b8] data-[state=active]:text-white">
              {t('taskModels')}
            </TabsTrigger>
            <TabsTrigger value="preview" className="text-[#94a3b8] data-[state=active]:text-white">
              {t('preview')}
            </TabsTrigger>
          </TabsList>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8 text-[#64748b]">{t('loading')}</div>
            ) : recommendations ? (
              <div className="space-y-3">
                {recommendations.recommendations.map((rec, index) => (
                  <div
                    key={rec.model}
                    className="flex items-center justify-between p-4 bg-[#1e293b] rounded-lg hover:bg-[#334155] transition-colors cursor-pointer"
                    onClick={() => onModelSelect?.('default', rec.model)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-white">{formatModelName(rec.model)}</div>
                        <div className="text-sm text-[#64748b]">{rec.reason}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary" className="bg-[#334155] text-[#94a3b8]">
                        {rec.score}/100
                      </Badge>
                      <div className="text-right">
                        <div className="text-sm text-[#94a3b8]">{t('costPerToken')}</div>
                        <div className="font-medium text-green-400">{formatCost(rec.costPerToken)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#64748b]">{t('noRecommendations')}</div>
            )}
          </TabsContent>

          {/* Task Models Tab */}
          <TabsContent value="tasks" className="space-y-4">
            {recommendations?.taskRecommendations ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(recommendations.taskRecommendations).map(([task, rec]) => (
                  <div
                    key={task}
                    className="p-4 bg-[#1e293b] rounded-lg hover:bg-[#334155] transition-colors cursor-pointer"
                    onClick={() => onModelSelect?.(task, rec.model)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[#94a3b8] font-medium">{getTaskLabel(task)}</span>
                      <Badge variant="secondary" className="bg-[#334155] text-[#94a3b8]">
                        {rec.score}/100
                      </Badge>
                    </div>
                    <div className="font-medium text-white mb-1">{formatModelName(rec.model)}</div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#64748b]">{rec.reason}</span>
                      <span className="text-green-400">{formatCost(rec.costPerToken)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#64748b]">{t('loading')}</div>
            )}
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-4">
            {selectedPreset ? (
              <div className="space-y-4">
                <div className="p-4 bg-[#1e293b] rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge className="bg-gradient-to-r from-[#00c9ff] to-[#92fe9d] text-[#0f172a]">
                      {selectedPreset.preset === 'optimal' ? '🚀 Optimal' : 
                       selectedPreset.preset === 'economy' ? '💰 Economy' : '💪 Power'}
                    </Badge>
                    <span className="text-[#94a3b8]">{t('presetApplied')}</span>
                  </div>
                  
                  <Separator className="bg-[#334155] mb-4" />
                  
                  <div className="space-y-2">
                    {Object.entries(selectedPreset.models).map(([task, model]) => {
                      if (!model) return null;
                      const cost = selectedPreset.costs[task];
                      const reason = selectedPreset.reasons[task];
                      return (
                        <div key={task} className="flex items-center justify-between py-2">
                          <div>
                            <span className="text-[#94a3b8]">{getTaskLabel(task)}:</span>
                            <span className="text-white ml-2 font-medium">{formatModelName(model)}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-[#64748b]">{reason}</span>
                            <span className="text-green-400 font-medium">{formatCost(cost || { input: 0, output: 0 })}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <Button
                  onClick={() => onApplyPreset?.(selectedPreset)}
                  className="w-full bg-[#00c9ff] text-[#0f172a] font-semibold hover:opacity-90"
                >
                  {t('applySettings')}
                </Button>
              </div>
            ) : (
              <div className="text-center py-8 text-[#64748b]">
                {t('selectPresetFirst')}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}