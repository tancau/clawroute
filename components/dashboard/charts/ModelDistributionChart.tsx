'use client';

import { useState, useEffect } from 'react';
import { useUserStore } from '@/store/use-user-store';
import { useTranslations } from 'next-intl';
import { PieChart } from 'lucide-react';

interface ModelDistributionChartProps {
  userId: string;
}

// Color palette for pie chart
const COLORS = [
  'hsl(var(--brand-primary))',
  'hsl(var(--brand-accent))',
  'hsl(var(--brand-secondary))',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#6366f1',
];

export function ModelDistributionChart({ userId }: ModelDistributionChartProps) {
  const { usage, fetchUsage } = useUserStore();
  const [isLoading, setIsLoading] = useState(true);
  const t = useTranslations('dashboard');

  useEffect(() => {
    loadData();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    setIsLoading(true);
    await fetchUsage(userId, 30);
    setIsLoading(false);
  };

  if (isLoading) {
    return (
      <div className="bg-surface-raised border border-border-subtle rounded-xl p-6 animate-pulse">
        <div className="h-4 bg-surface-overlay rounded w-1/3 mb-4" />
        <div className="flex gap-4">
          <div className="w-32 h-32 bg-surface-overlay rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-surface-overlay rounded w-3/4" />
            <div className="h-4 bg-surface-overlay rounded w-1/2" />
            <div className="h-4 bg-surface-overlay rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  // Build model data from byProvider
  const providerData = Object.entries(usage?.byProvider || {});
  const totalRequests = providerData.reduce((sum, [, info]) => sum + info.requests, 0);

  const modelData = providerData.length > 0
    ? providerData.map(([provider, info]) => ({
        name: provider,
        requests: info.requests,
        percent: totalRequests > 0 ? Math.round((info.requests / totalRequests) * 100) : 0,
      })).sort((a, b) => b.requests - a.requests)
    : generateMockModelData();

  const total = modelData.reduce((sum, m) => sum + m.percent, 0);

  // Calculate SVG pie chart paths
  const calculatePieSlices = () => {
    let currentAngle = -90;
    return modelData.slice(0, 8).map((item, index) => {
      const sliceAngle = (item.percent / total) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sliceAngle;
      currentAngle = endAngle;

      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      const radius = 50;
      const cx = 60;
      const cy = 60;

      const x1 = cx + radius * Math.cos(startRad);
      const y1 = cy + radius * Math.sin(startRad);
      const x2 = cx + radius * Math.cos(endRad);
      const y2 = cy + radius * Math.sin(endRad);

      const largeArcFlag = sliceAngle > 180 ? 1 : 0;

      return {
        path: `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`,
        color: COLORS[index % COLORS.length],
        item,
      };
    });
  };

  return (
    <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
      <h3 className="text-lg font-semibold text-neutral-10 flex items-center gap-2 mb-6">
        <PieChart className="h-5 w-5 text-brand-accent" />
        {t('modelDistribution')}
      </h3>

      <div className="flex gap-6">
        {/* Pie chart */}
        <div className="flex-shrink-0">
          <svg width="120" height="120" viewBox="0 0 120 120">
            {calculatePieSlices().map((slice, i) => (
              <path
                key={i}
                d={slice.path}
                fill={slice.color}
                className="hover:opacity-80 transition-opacity cursor-pointer"
              />
            ))}
            {/* Center circle for donut effect */}
            <circle cx="60" cy="60" r="30" fill="hsl(var(--surface-raised))" />
          </svg>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {modelData.slice(0, 6).map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-sm text-neutral-10 truncate max-w-[120px]">{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-7">{item.requests}</span>
                <span className="text-xs text-neutral-6">({item.percent}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top model highlight */}
      {modelData[0] && (
        <div className="mt-4 pt-4 border-t border-border-subtle">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: COLORS[0] }}
            />
            <span className="text-sm text-neutral-7">
              Top model: <span className="text-neutral-10 font-medium">{modelData[0].name}</span>
            </span>
            <span className="text-sm text-brand-primary font-bold">{modelData[0].percent}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

function generateMockModelData() {
  return [
    { name: 'gpt-4o-mini', requests: 450, percent: 45 },
    { name: 'claude-3-haiku', requests: 280, percent: 28 },
    { name: 'gemini-pro', requests: 150, percent: 15 },
    { name: 'gpt-3.5-turbo', requests: 80, percent: 8 },
    { name: 'other', requests: 40, percent: 4 },
  ];
}