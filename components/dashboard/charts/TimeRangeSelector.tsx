'use client';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TimeRangeSelectorProps {
  value: number;
  onChange: (days: number) => void;
  options?: number[];
}

export function TimeRangeSelector({ value, onChange, options = [7, 30, 90] }: TimeRangeSelectorProps) {
  return (
    <div className="flex gap-1">
      {options.map((days) => (
        <Button
          key={days}
          variant={value === days ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(days)}
          className={cn(
            'text-xs',
            value === days && 'bg-brand-primary text-neutral-1'
          )}
        >
          {days}d
        </Button>
      ))}
    </div>
  );
}
