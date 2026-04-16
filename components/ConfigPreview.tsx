'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { useAppStore } from '@/store/use-app-store';
import { generateOpenClawConfig } from '@/lib/config-generator';
import { copyToClipboard, downloadJson } from '@/lib/export-utils';
import { Button } from '@/components/ui/button';
import { Copy, Download } from 'lucide-react';
import { Highlight, themes } from 'prism-react-renderer';

import { toast } from '@/components/ui/use-toast';

export function ConfigPreview() {
  const t = useTranslations('configPreview');
  const selection = useAppStore((s) => s.selection);

  const jsonContent = useMemo(() => {
    if (!selection.primaryModelId) {
      return '{\n  // Select a primary model to generate config\n}';
    }
    return generateOpenClawConfig(selection);
  }, [selection]);

  const handleCopy = async () => {
    const success = await copyToClipboard(jsonContent);
    if (success) {
      toast({ title: t('copiedToClipboard'), description: t('jsonCopied') });
    } else {
      toast({ title: t('copyFailedTitle'), description: t('copyManually'), variant: 'destructive' });
    }
  };

  const handleDownload = () => {
    downloadJson(jsonContent);
    toast({ title: t('downloadSuccess'), description: t('jsonDownloaded') });
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
        <Highlight theme={themes.nightOwlLight} code={jsonContent} language="json">
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
