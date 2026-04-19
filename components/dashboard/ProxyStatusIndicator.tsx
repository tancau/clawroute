'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProxyStatusIndicatorProps {
  className?: string;
}

type ProxyStatus = 'running' | 'stopped' | 'checking' | 'error';

export function ProxyStatusIndicator({ className }: ProxyStatusIndicatorProps) {
  const [status, setStatus] = useState<ProxyStatus>('checking');
  const t = useTranslations('dashboard');

  useEffect(() => {
    checkStatus();
    // Poll every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    setStatus('checking');
    try {
      const res = await fetch('/api/ping');
      if (res.ok) {
        const data = await res.json();
        setStatus(data.status === 'ok' ? 'running' : 'error');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('stopped');
    }
  };

  const statusConfig: Record<ProxyStatus, {
    icon: typeof CheckCircle2;
    label: string;
    color: string;
    bg: string;
    pulse: boolean;
    animate?: boolean;
  }> = {
    running: {
      icon: CheckCircle2,
      label: t('proxyRunning'),
      color: 'text-semantic-success',
      bg: 'bg-semantic-success/10',
      pulse: true,
    },
    stopped: {
      icon: XCircle,
      label: t('proxyStopped'),
      color: 'text-semantic-error',
      bg: 'bg-semantic-error/10',
      pulse: false,
    },
    checking: {
      icon: Loader2,
      label: t('loading'),
      color: 'text-neutral-7',
      bg: 'bg-surface-overlay',
      pulse: false,
      animate: true,
    },
    error: {
      icon: AlertCircle,
      label: t('proxyStopped'),
      color: 'text-semantic-warning',
      bg: 'bg-semantic-warning/10',
      pulse: false,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg', config.bg, className)}>
      <Icon className={cn('h-4 w-4', config.color, config.animate && 'animate-spin')} />
      <span className={cn('text-sm font-medium', config.color)}>
        {t('proxyStatus')}: {config.label}
      </span>
      {config.pulse && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-semantic-success opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-semantic-success" />
        </span>
      )}
    </div>
  );
}