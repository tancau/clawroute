'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import type { RoutingRule, RequestAttribute } from '@/lib/types';

export interface SortableRuleItemProps {
  rule: RoutingRule;
  candidateModels: { id: string; name: string }[];
  onUpdate: (partial: Partial<RoutingRule>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  t: {
    condition: string;
    selectModel: string;
    attribute: {
      complexity: string;
      hasCode: string;
      needsReasoning: string;
      inputTokenRange: string;
    };
    matchValue: {
      simple: string;
      medium: string;
      complex: string;
      true: string;
      false: string;
      short: string;
      long: string;
    };
  };
}

function getMatchValueOptions(attribute: RequestAttribute, t: SortableRuleItemProps['t']): { value: string; label: string }[] {
  switch (attribute) {
    case 'complexity':
      return [
        { value: 'simple', label: t.matchValue.simple },
        { value: 'medium', label: t.matchValue.medium },
        { value: 'complex', label: t.matchValue.complex },
      ];
    case 'hasCode':
      return [
        { value: 'true', label: t.matchValue.true },
        { value: 'false', label: t.matchValue.false },
      ];
    case 'needsReasoning':
      return [
        { value: 'true', label: t.matchValue.true },
        { value: 'false', label: t.matchValue.false },
      ];
    case 'inputTokenRange':
      return [
        { value: 'short', label: t.matchValue.short },
        { value: 'medium', label: t.matchValue.medium },
        { value: 'long', label: t.matchValue.long },
      ];
  }
}

export function SortableRuleItem({
  rule,
  candidateModels,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  t,
}: SortableRuleItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rule.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const attributeOptions: { value: RequestAttribute; label: string }[] = [
    { value: 'complexity', label: t.attribute.complexity },
    { value: 'hasCode', label: t.attribute.hasCode },
    { value: 'needsReasoning', label: t.attribute.needsReasoning },
    { value: 'inputTokenRange', label: t.attribute.inputTokenRange },
  ];

  const handleConditionAttributeChange = (attr: string) => {
    const newAttr = attr as RequestAttribute;
    const defaultMatchValue = getMatchValueOptions(newAttr, t)[0]?.value ?? '';
    onUpdate({
      condition: { attribute: newAttr, matchValue: defaultMatchValue },
    });
  };

  const handleConditionMatchValueChange = (value: string) => {
    if (rule.condition) {
      onUpdate({
        condition: { ...rule.condition, matchValue: value },
      });
    }
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-3 border rounded-md bg-card">
      <button className="cursor-grab touch-none text-muted-foreground" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>

      <span className="text-sm text-muted-foreground shrink-0">{t.condition}</span>

      <Select
        value={rule.condition?.attribute ?? 'complexity'}
        onValueChange={handleConditionAttributeChange}
      >
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {attributeOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-sm text-muted-foreground shrink-0">=</span>

      <Select
        value={rule.condition?.matchValue ?? ''}
        onValueChange={handleConditionMatchValueChange}
      >
        <SelectTrigger className="w-[120px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {getMatchValueOptions(rule.condition?.attribute ?? 'complexity', t).map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-sm text-muted-foreground shrink-0">→</span>

      <Select
        value={rule.targetModelId}
        onValueChange={(value: string) => onUpdate({ targetModelId: value })}
      >
        <SelectTrigger className="w-[180px] h-8 text-xs">
          <SelectValue placeholder={t.selectModel} />
        </SelectTrigger>
        <SelectContent>
          {candidateModels.map((model) => (
            <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex flex-col gap-0.5 ml-auto">
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onMoveUp} disabled={isFirst}>
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onMoveDown} disabled={isLast}>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>

      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
