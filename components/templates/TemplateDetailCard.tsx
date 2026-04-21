'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { Template } from '@/lib/types';
import { cn } from '@/lib/utils';

interface TemplateDetailCardProps {
  template: Template;
  onApply: (id: string) => void;
}

export function TemplateDetailCard({ template, onApply }: TemplateDetailCardProps) {
  const tScenes = useTranslations('scenes');
  const tTemplate = useTranslations('template');
  const tTemplates = useTranslations('templates');
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <Card className="overflow-hidden hover:shadow-md hover:border-brand-primary/20 transition-all duration-fast border border-border-subtle">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-base font-semibold text-neutral-10">{template.name}</h3>
          <Badge variant="secondary" className="text-xs shrink-0 bg-semantic-success/10 text-semantic-success">
            {tTemplate('saving')} {template.estimatedSavingRate}%
          </Badge>
        </div>
        <p className="text-sm text-neutral-7 mb-3">{template.description}</p>
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="text-xs border-brand-primary/30 text-brand-primary">
            {tScenes(template.sceneId) ?? template.sceneId}
          </Badge>
          <span className="text-xs text-neutral-7">{tTemplate('by')} {template.author}</span>
        </div>

        <Collapsible open={previewOpen} onOpenChange={setPreviewOpen}>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-neutral-7 hover:text-neutral-10 transition-colors duration-fast mb-2">
            <ChevronDown className={cn('h-3 w-3 transition-transform duration-normal', previewOpen && 'rotate-180')} />
            {tTemplates('previewConfig')}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <pre className="text-xs bg-surface-base p-3 rounded-lg overflow-auto max-h-40 font-mono text-neutral-8 border border-border-subtle">
              {JSON.stringify({ primaryModelId: template.selection.primaryModelId, fallbackModelIds: template.selection.fallbackModelIds }, null, 2)}
            </pre>
          </CollapsibleContent>
        </Collapsible>

        <Button
          variant="default"
          size="sm"
          onClick={() => onApply(template.id)}
          className="w-full mt-2 gap-2"
        >
          <Check className="h-4 w-4" />
          {tTemplate('useTemplate')}
        </Button>
      </CardContent>
    </Card>
  );
}
