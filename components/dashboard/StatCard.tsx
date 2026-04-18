'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'flat';
    label?: string;
  };
  format?: 'number' | 'currency' | 'percent';
}

const formatValue = (value: string | number, format?: 'number' | 'currency' | 'percent') => {
  if (typeof value === 'string') return value;
  switch (format) {
    case 'currency': return `$${value.toLocaleString()}`;
    case 'percent': return `${value}%`;
    default: return value.toLocaleString();
  }
};

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

const trendColors = {
  up: 'text-semantic-success',
  down: 'text-semantic-error',
  flat: 'text-neutral-7',
};

export function StatCard({ label, value, icon: Icon, trend, format }: StatCardProps) {
  return (
    <Card className="border border-border-subtle">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-neutral-7">{label}</span>
          <Icon className="h-4 w-4 text-neutral-6" />
        </div>
        <div className="text-2xl font-bold text-neutral-10">
          {formatValue(value, format)}
        </div>
        {trend && (() => {
          const TrendIcon = trendIcons[trend.direction];
          return (
            <div className={cn('flex items-center gap-1 text-xs mt-1', trendColors[trend.direction])}>
              <TrendIcon className="h-3 w-3" />
              <span>{trend.value > 0 ? '+' : ''}{trend.value}%</span>
              {trend.label && <span className="text-neutral-7">{trend.label}</span>}
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
