'use client';

import { useAppStore } from '@/store/use-app-store';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useTranslations } from 'next-intl';
import { SortableRuleItem } from '@/components/SortableRuleItem';
import { DefaultRuleItem } from '@/components/DefaultRuleItem';

export function RuleEditor() {
  const t = useTranslations('ruleEditor');
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
    if (moved !== undefined) newOrder.splice(newIndex, 0, moved);
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
    if (index === -1 || index >= nonDefaultRules.length - 1) return;
    const newOrder = [...nonDefaultIds];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1]!, newOrder[index]!];
    reorderRuleList(newOrder);
  };

  const translations = {
    condition: t('condition'),
    selectModel: t('selectModel'),
    attribute: {
      complexity: t('attribute.complexity'),
      hasCode: t('attribute.hasCode'),
      needsReasoning: t('attribute.needsReasoning'),
      inputTokenRange: t('attribute.inputTokenRange'),
    },
    matchValue: {
      simple: t('matchValue.simple'),
      medium: t('matchValue.medium'),
      complex: t('matchValue.complex'),
      true: t('matchValue.true'),
      false: t('matchValue.false'),
      short: t('matchValue.short'),
      long: t('matchValue.long'),
    },
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">{t('title')}</h3>

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
                t={translations}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {defaultRule && (
        <>
          <Separator />
          <DefaultRuleItem
            rule={defaultRule}
            candidateModels={candidateModels}
            onUpdate={(partial) => updateRuleById(defaultRule.id, partial)}
            otherwiseLabel={t('otherwise')}
            selectModelLabel={t('selectModel')}
            defaultRuleLabel={t('defaultRule')}
          />
        </>
      )}

      <Button variant="outline" size="sm" onClick={addNewRule} className="w-full">
        + {t('addRule')}
      </Button>
    </div>
  );
}
