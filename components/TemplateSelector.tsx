'use client';

import { useAppStore } from '@/store/use-app-store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function TemplateSelector() {
  const getTemplatesForSelectedScene = useAppStore((s) => s.getTemplatesForSelectedScene);
  const applyTemplate = useAppStore((s) => s.applyTemplate);

  const templates = getTemplatesForSelectedScene();

  if (templates.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">预设模板</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {templates.map((template) => (
          <Card key={template.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-medium">{template.name}</h4>
                <Badge variant="secondary" className="text-xs">
                  节省 {template.estimatedSavingRate}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">{template.description}</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => applyTemplate(template.id)}
              >
                应用模板
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
