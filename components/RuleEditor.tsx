'use client';

import { useAppStore } from '@/store/use-app-store';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import type { RequestAttribute } from '@/lib/types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import type { RoutingRule } from '@/lib/types';

const attributeOptions: { value: RequestAttribute; label: string }[] = [
  { value: 'complexity', label: '请求复杂度' },
  { value: 'hasCode', label: '包含代码' },
  { value: 'needsReasoning', label: '需要推理' },
  { value: 'inputTokenRange', label: '输入 token 长度' },
];

function getMatchValueOptions(attribute: RequestAttribute): { value: string; label: string }[] {
  switch (attribute) {
    case 'complexity':
      return [
        { value: 'simple', label: '简单' },
        { value: 'medium', label: '中等' },
        { value: 'complex', label: '复杂' },
      ];
    case 'hasCode':
      return [
        { value: 'true', label: '是' },
        { value: 'false', label: '否' },
      ];
    case 'needsReasoning':
      return [
        { value: 'true', label: '是' },
        { value: 'false', label: '否' },
      ];
    case 'inputTokenRange':
      return [
        { value: 'short', label: '短（<1K）' },
        { value: 'medium', label: '中（1K-10K）' },
        { value: 'long', label: '长（>10K）' },
      ];
  }
}

function SortableRuleItem({
  rule,
  candidateModels,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: {
  rule: RoutingRule;
  candidateModels: { id: string; name: string }[];
  onUpdate: (partial: Partial<RoutingRule>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: rule.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleConditionAttributeChange = (attr: string) => {
    const newAttr = attr as RequestAttribute;
    const defaultMatchValue = getMatchValueOptions(newAttr)[0]?.value ?? '';
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
      {/* Drag handle */}
      <button className="cursor-grab touch-none text-muted-foreground" {...attributes} {...listeners}>
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Condition */}
      <span className="text-sm text-muted-foreground shrink-0">当</span>

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
          {getMatchValueOptions(rule.condition?.attribute ?? 'complexity').map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span className="text-sm text-muted-foreground shrink-0">→</span>

      {/* Target model selector */}
      <Select
        value={rule.targetModelId}
        onValueChange={(value: string) => onUpdate({ targetModelId: value })}
      >
        <SelectTrigger className="w-[180px] h-8 text-xs">
          <SelectValue placeholder="选择模型" />
        </SelectTrigger>
        <SelectContent>
          {candidateModels.map((model) => (
            <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Move up/down buttons */}
      <div className="flex flex-col gap-0.5 ml-auto">
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onMoveUp} disabled={isFirst}>
          <ChevronUp className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onMoveDown} disabled={isLast}>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </div>

      {/* Delete button */}
      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function RuleEditor() {
  const rules = useAppStore((s) => s.rules);
  const addNewRule = useAppStore((s) => s.addNewRule);
  const removeRuleById = useAppStore((s) => s.removeRuleById);
  const reorderRuleList = useAppStore((s) => s.reorderRuleList);
  const updateRuleById = useAppStore((s) => s.updateRuleById);
  const getModelsForSelectedScene = useAppStore((s) => s.getModelsForSelectedScene);

  const candidateModels = getModelsForSelectedScene().map((m) => ({ id: m.id, name: m.name }));

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const nonDefaultRules = rules.filter((r) => !r.isDefault);
  const defaultRule = rules.find((r) => r.isDefault);
  const nonDefaultIds = nonDefaultRules.map((r) => r.id);

  const handleDragEnd = (event: { active: { id: string | number }; over: { id: string | number } | null }) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = nonDefaultIds.indexOf(String(active.id));
    const newIndex = nonDefaultIds.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = [...nonDefaultIds];
    const [moved] = newOrder.splice(oldIndex, 1);
    if (moved !== undefined) {
      newOrder.splice(newIndex, 0, moved);
    }
    reorderRuleList(newOrder);
  };

  const handleMoveUp = (ruleId: string) => {
    const index = nonDefaultIds.indexOf(ruleId);
    if (index <= 0) return;
    const newOrder = [...nonDefaultIds];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index]!, newOrder[index - 1]!];
    reorderRuleList(newOrder);
  };

  const handleMoveDown = (ruleId: string) => {
    const index = nonDefaultIds.indexOf(ruleId);
    if (index === -1 || index >= nonDefaultIds.length - 1) return;
    const newOrder = [...nonDefaultIds];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1]!, newOrder[index]!];
    reorderRuleList(newOrder);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">路由规则</h3>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={nonDefaultIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {nonDefaultRules.map((rule, index) => (
              <SortableRuleItem
                key={rule.id}
                rule={rule}
                candidateModels={candidateModels}
                onUpdate={(partial) => updateRuleById(rule.id, partial)}
                onRemove={() => removeRuleById(rule.id)}
                onMoveUp={() => handleMoveUp(rule.id)}
                onMoveDown={() => handleMoveDown(rule.id)}
                isFirst={index === 0}
                isLast={index === nonDefaultRules.length - 1}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Default rule */}
      {defaultRule && (
        <>
          <Separator />
          <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/30">
            <span className="text-sm text-muted-foreground shrink-0">否则</span>
            <span className="text-sm text-muted-foreground shrink-0">→</span>
            <Select
              value={defaultRule.targetModelId}
              onValueChange={(value: string) => updateRuleById(defaultRule.id, { targetModelId: value })}
            >
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent>
                {candidateModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground ml-2">（默认规则）</span>
          </div>
        </>
      )}

      <Button variant="outline" size="sm" onClick={addNewRule} className="w-full">
        + 添加规则
      </Button>
    </div>
  );
}
