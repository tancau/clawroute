'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { RoutingRule } from '@/lib/types';

export interface DefaultRuleItemProps {
  rule: RoutingRule;
  candidateModels: { id: string; name: string }[];
  onUpdate: (partial: Partial<RoutingRule>) => void;
  otherwiseLabel: string;
  selectModelLabel: string;
  defaultRuleLabel: string;
}

export function DefaultRuleItem({
  rule,
  candidateModels,
  onUpdate,
  otherwiseLabel,
  selectModelLabel,
  defaultRuleLabel,
}: DefaultRuleItemProps) {
  return (
    <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
      <span className="text-sm text-muted-foreground shrink-0">{otherwiseLabel}</span>
      <span className="text-sm text-muted-foreground shrink-0">→</span>
      <Select
        value={rule.targetModelId}
        onValueChange={(value: string) => onUpdate({ targetModelId: value })}
      >
        <SelectTrigger className="w-[180px] h-8 text-xs">
          <SelectValue placeholder={selectModelLabel} />
        </SelectTrigger>
        <SelectContent>
          {candidateModels.map((model) => (
            <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-xs text-muted-foreground ml-2">（{defaultRuleLabel}）</span>
    </div>
  );
}
