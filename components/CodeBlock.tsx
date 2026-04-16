'use client';

import { useState } from 'react';
import { Copy, Check, X } from 'lucide-react';
import { copyToClipboard } from '@/lib/export-utils';
import { useTranslations } from 'next-intl';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = 'bash' }: CodeBlockProps) {
  const t = useTranslations('codeBlock');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  const handleCopy = async () => {
    const success = await copyToClipboard(code);
    setCopyStatus(success ? 'copied' : 'failed');
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  return (
    <div className="rounded-xl overflow-hidden border border-border">
      <div className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-window-red"></div>
          <div className="w-3 h-3 rounded-full bg-window-yellow"></div>
          <div className="w-3 h-3 rounded-full bg-window-green"></div>
        </div>
        <span className="text-xs text-muted-foreground font-mono">{language}</span>
        <button
          className="text-xs text-muted-foreground flex items-center gap-1 cursor-pointer hover:text-foreground transition-colors"
          onClick={handleCopy}
        >
          {copyStatus === 'idle' && <><Copy className="w-4 h-4" />{t('clickToCopy')}</>}
          {copyStatus === 'copied' && <><Check className="w-4 h-4 text-green-400" />{t('copied')}</>}
          {copyStatus === 'failed' && <><X className="w-4 h-4 text-red-400" />{t('copyFailed')}</>}
        </button>
      </div>
      <div className="p-4 bg-surface">
        <pre className="font-mono text-sm text-foreground whitespace-pre-wrap">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
}
