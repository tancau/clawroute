import { Skeleton } from '@/components/ui/skeleton';

export function ChartSkeleton() {
  return (
    <div className="space-y-3 p-4">
      <div className="flex justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-12" />
      </div>
      <div className="flex items-end gap-2 h-40">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="flex-1 rounded-t-sm" style={{ height: `${Math.random() * 80 + 20}%` }} />
        ))}
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-3 w-8" />
        <Skeleton className="h-3 w-8" />
      </div>
    </div>
  );
}
