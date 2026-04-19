'use client';

import { useEffect, useState } from 'react';
import { useUserStore } from '@/store/use-user-store';
import { useTranslations } from 'next-intl';
import { Zap, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreditsTrendProps {
  userId: string;
}

interface CreditHistory {
  date: string;
  balance: number;
  change: number;
}

export function CreditsTrend({ userId }: CreditsTrendProps) {
  const { user } = useUserStore();
  const [history, setHistory] = useState<CreditHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const t = useTranslations('dashboard');

  useEffect(() => {
    loadCredits();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadCredits = async () => {
    setIsLoading(true);
    // Generate mock credit history (in real app, this would come from API)
    const today = new Date();
    const currentCredits = user?.credits || 1000;
    const mockHistory = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const change = Math.floor(Math.random() * 100 - 30); // Random change between -30 and +70
      const previousBalance = currentCredits + (i * 50); // Estimate previous balances
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        balance: previousBalance,
        change: change,
      };
    }).reverse();
    setHistory(mockHistory);
    setIsLoading(false);
  };

  if (isLoading || !user) {
    return (
      <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-surface-overlay rounded w-1/3" />
          <div className="h-24 bg-surface-overlay rounded" />
        </div>
      </div>
    );
  }

  const currentCredits = user.credits || 0;
  const totalChange = history.reduce((sum, h) => sum + h.change, 0);
  const trendDirection = totalChange >= 0 ? 'up' : 'down';

  return (
    <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-neutral-10 flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          {t('credits')}
        </h3>
        <div className={cn(
          'flex items-center gap-1 text-sm',
          trendDirection === 'up' ? 'text-semantic-success' : 'text-semantic-error'
        )}>
          {trendDirection === 'up' ? (
            <TrendingUp className="h-4 w-4" />
          ) : (
            <TrendingDown className="h-4 w-4" />
          )}
          <span>{totalChange >= 0 ? '+' : ''}{totalChange}</span>
        </div>
      </div>

      {/* Current balance */}
      <div className="text-3xl font-bold text-neutral-10 mb-6">
        {currentCredits.toLocaleString()}
        <span className="text-sm text-neutral-7 ml-2">credits</span>
      </div>

      {/* Trend visualization */}
      <div className="relative h-16">
        <svg className="w-full h-full" preserveAspectRatio="none">
          {/* Grid lines */}
          <line x1="0" y1="50%" x2="100%" y2="50%" stroke="currentColor" className="text-border-subtle" strokeWidth="1" />
          
          {/* Trend line */}
          <polyline
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="2"
            points={history.map((h, i) => {
              const x = (i / (history.length - 1)) * 100;
              const maxBalance = Math.max(...history.map(h => h.balance));
              const minBalance = Math.min(...history.map(h => h.balance));
              const range = maxBalance - minBalance || 1;
              const y = 100 - ((h.balance - minBalance) / range) * 100;
              return `${x},${y}`;
            }).join(' ')}
          />
          
          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--color-brand-primary)" />
              <stop offset="100%" stopColor="var(--color-brand-accent)" />
            </linearGradient>
          </defs>
        </svg>

        {/* Points */}
        {history.map((h, i) => {
          const maxBalance = Math.max(...history.map(h => h.balance));
          const minBalance = Math.min(...history.map(h => h.balance));
          const range = maxBalance - minBalance || 1;
          const yPercent = 100 - ((h.balance - minBalance) / range) * 100;
          return (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-brand-primary transform -translate-x-1/2"
              style={{
                left: `${(i / (history.length - 1)) * 100}%`,
                top: `${yPercent}%`,
                marginTop: '-4px',
              }}
              title={`${h.date}: ${h.balance} credits`}
            />
          );
        })}
      </div>

      {/* Date labels */}
      <div className="flex justify-between mt-2 text-xs text-neutral-7">
        {history.map((h, i) => (
          <span key={i}>{h.date}</span>
        ))}
      </div>
    </div>
  );
}