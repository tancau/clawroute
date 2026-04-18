'use client';

import { useTranslations } from 'next-intl';
import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/use-app-store';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TemplateDetailCard } from '@/components/templates/TemplateDetailCard';
import { TemplateFilters } from '@/components/templates/TemplateFilters';
import { TemplateEmptyState } from '@/components/templates/TemplateEmptyState';
import { Section } from '@/components/layout/Section';

export default function TemplatesPage() {
  const t = useTranslations('templates');
  const templates = useAppStore((s) => s.templates);
  const selectScene = useAppStore((s) => s.selectScene);
  const applyTemplate = useAppStore((s) => s.applyTemplate);
  const setConfigStep = useAppStore((s) => s.setConfigStep);
  const router = useRouter();
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
      setConfigStep(3);
      router.push('/configure');
    }
  };

  const handleClearFilters = () => {
    setSearchKeyword('');
    setSelectedScene('all');
  };

  return (
    <div className="min-h-screen">
      <Section title={t('title')} description={t('description')}>
        {/* Search and filter */}
        <div className="mb-6">
          <TemplateFilters
            searchKeyword={searchKeyword}
            onSearchChange={setSearchKeyword}
            selectedScene={selectedScene}
            onSceneChange={setSelectedScene}
            sceneIds={sceneIds}
            allLabel={t('all')}
          />
        </div>

        {/* Template grid */}
        {filteredTemplates.length === 0 ? (
          <TemplateEmptyState
            title={t('noMatch')}
            description="Try adjusting your search or filters"
            onClearFilters={handleClearFilters}
            clearLabel="Clear filters"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map((tpl) => (
              <TemplateDetailCard key={tpl.id} template={tpl} onApply={handleApply} />
            ))}
          </div>
        )}

        {/* Navigate to home */}
        <div className="mt-8 text-center">
          <Link href="/">
            <Button variant="outline">{t('goHome')}</Button>
          </Link>
        </div>
      </Section>
    </div>
  );
}
