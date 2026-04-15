'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { useAppStore } from '@/store/use-app-store';
import { generateYaml } from '@/lib/yaml-generator';
import { copyToClipboard, downloadYaml } from '@/lib/export-utils';
import { Button } from '@/components/ui/button';
import { Copy, Download } from 'lucide-react';
import { Highlight, themes } from 'prism-react-renderer';
import { toast } from '@/components/ui/use-toast';

export function ConfigPreview() {
  const t = useTranslations('configPreview');
  const rules = useAppStore((s) => s.rules);
  const allModels = useAppStore((s) => s.allModels);

  const yamlContent = useMemo(() => {
    return generateYaml(rules, allModels);
  }, [rules, allModels]);

  const handleCopy = async () => {
    const success = await copyToClipboard(yamlContent);
    if (success) {
      toast({ title: t('copySuccess'), description: 'YAML config copied' });
    } else {
      toast({ title: t('copyFailed'), description: 'Please copy manually', variant: 'destructive' });
    }
  };

  const handleDownload = () => {
    downloadYaml(yamlContent);
    toast({ title: t('download'), description: 'models.yaml downloaded' });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t('title')}</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-3 w-3 mr-1" />
            {t('copy')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-3 w-3 mr-1" />
            {t('download')}
          </Button>
        </div>
      </div>

      <div className="border rounded-md overflow-auto max-h-[400px]">
        <Highlight theme={themes.nightOwlLight} code={yamlContent} language="yaml">
          {({ className, style, tokens, getLineProps, getTokenProps }) => (
            <pre className={`${className} text-xs p-4`} style={style}>
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      </div>
    </div>
  );
}
