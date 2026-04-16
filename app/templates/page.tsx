'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/use-app-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import type { Template } from '@/lib/types';
import { useTranslations } from 'next-intl';

function TemplateCard({ template, onApply }: { template: Template; onApply: (id: string) => void }) {
  const tScenes = useTranslations('scenes');
  const tTemplate = useTranslations('template');

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-base font-semibold">{template.name}</h3>
          <Badge variant="secondary" className="text-xs shrink-0">
            {tTemplate('saving')} {template.estimatedSavingRate}%
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {tScenes(template.sceneId) ?? template.sceneId}
            </Badge>
            <span className="text-xs text-muted-foreground">{tTemplate('by')} {template.author}</span>
          </div>
          <Button variant="default" size="sm" onClick={() => onApply(template.id)}>
            {tTemplate('useTemplate')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TemplatesPage() {
  const t = useTranslations('templates');
  const tScenes = useTranslations('scenes');
  const templates = useAppStore((s) => s.templates);
  const selectScene = useAppStore((s) => s.selectScene);
  const applyTemplate = useAppStore((s) => s.applyTemplate);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedScene, setSelectedScene] = useState<string>('all');

  const sceneIds = ['trading-bot', 'customer-service', 'content-creation', 'data-analysis', 'research-assistant', 'dev-tools'];

  const filteredTemplates = useMemo(() => {
    let result = templates;
    if (selectedScene !== 'all') {
      result = result.filter((tp) => tp.sceneId === selectedScene);
    }
    if (searchKeyword.trim()) {
      const kw = searchKeyword.toLowerCase();
      result = result.filter(
        (tp) =>
          tp.name.toLowerCase().includes(kw) ||
          tp.description.toLowerCase().includes(kw)
      );
    }
    return result;
  }, [templates, selectedScene, searchKeyword]);

  const handleApply = (templateId: string) => {
    const tpl = templates.find((tp) => tp.id === templateId);
    if (tpl) {
      selectScene(tpl.sceneId);
      applyTemplate(templateId);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">{t('title')}</h1>
        <p className="text-muted-foreground">{t('description')}</p>
      </div>

      {/* Search and filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Input
          placeholder={t('searchPlaceholder')}
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
            {t('all')}
          </Button>
          {sceneIds.map((id) => (
            <Button
              key={id}
              variant={selectedScene === id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedScene(id)}
            >
              {tScenes(id)}
            </Button>
          ))}
        </div>
      </div>

      {/* Template grid */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {t('noMatch')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTemplates.map((tpl) => (
            <TemplateCard key={tpl.id} template={tpl} onApply={handleApply} />
          ))}
        </div>
      )}

      {/* Navigate to configure */}
      <div className="mt-8 text-center">
        <Link href="/">
          <Button variant="outline">{t('goHome')}</Button>
        </Link>
      </div>
    </div>
  );
}
