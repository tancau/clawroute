'use client';

import { useTranslations } from 'next-intl';
import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/use-app-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import type { Template } from '@/lib/types';

function TemplateCard({ 
  template, 
  onApply,
  sceneLabel,
  saveLabel,
  useTemplateLabel
}: { 
  template: Template; 
  onApply: (id: string) => void;
  sceneLabel: string;
  saveLabel: string;
  useTemplateLabel: string;
}) {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-base font-semibold">{template.name}</h3>
          <Badge variant="secondary" className="text-xs shrink-0">
            {saveLabel} {template.estimatedSavingRate}%
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {sceneLabel}
            </Badge>
            <span className="text-xs text-muted-foreground">by {template.author}</span>
          </div>
          <Button variant="default" size="sm" onClick={() => onApply(template.id)}>
            {useTemplateLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TemplatesPage() {
  const t = useTranslations();
  const templates = useAppStore((s) => s.templates);
  const selectScene = useAppStore((s) => s.selectScene);
  const applyTemplate = useAppStore((s) => s.applyTemplate);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedScene, setSelectedScene] = useState<string>('all');

  const sceneLabels: Record<string, string> = {
    'trading-bot': t('scenes.trading-bot'),
    'customer-service': t('scenes.customer-service'),
    'content-creation': t('scenes.content-creation'),
    'data-analysis': t('scenes.data-analysis'),
    'research-assistant': t('scenes.research-assistant'),
    'dev-tools': t('scenes.dev-tools'),
  };

  const filteredTemplates = useMemo(() => {
    let result = templates;
    if (selectedScene !== 'all') {
      result = result.filter((t) => t.sceneId === selectedScene);
    }
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(kw) ||
          t.description.toLowerCase().includes(kw)
      );
    }
    return result;
  }, [templates, selectedScene, searchKeyword]);

  const handleApply = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      selectScene(template.sceneId);
      applyTemplate(templateId);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">{t('template.title')}</h1>
        <p className="text-muted-foreground">{t('template.description')}</p>
      </div>

      {/* Search and filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Input
          placeholder={t('template.searchPlaceholder')}
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          className="sm:max-w-xs"
        />
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={selectedScene === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedScene('all')}
          >
            {t('template.all')}
          </Button>
          {Object.entries(sceneLabels).map(([id, label]) => (
            <Button
              key={id}
              variant={selectedScene === id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedScene(id)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Template grid */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {t('template.noResults')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTemplates.map((template) => (
            <TemplateCard 
              key={template.id} 
              template={template} 
              onApply={handleApply}
              sceneLabel={sceneLabels[template.sceneId] ?? template.sceneId}
              saveLabel={t('template.savingRate')}
              useTemplateLabel={t('template.useTemplate')}
            />
          ))}
        </div>
      )}

      {/* Navigate to configure */}
      <div className="mt-8 text-center">
        <Link href="/">
          <Button variant="outline">{t('template.backHome')}</Button>
        </Link>
      </div>
    </div>
  );
}
