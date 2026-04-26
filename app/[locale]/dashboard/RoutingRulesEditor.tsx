'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Plus, X, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/store/use-user-store';

// ===== Types =====

type IntentType =
  | 'coding'
  | 'analysis'
  | 'creative'
  | 'casual_chat'
  | 'trading'
  | 'translation'
  | 'long_context'
  | 'reasoning'
  | 'knowledge';

interface RuleConfig {
  id: string;
  name: string;
  type: 'system' | 'custom';
  intent: IntentType;
  priority: number;
  enabled: boolean;
  keyword?: string;
  description?: string;
}

const INTENT_COLORS: Record<IntentType, string> = {
  coding: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  analysis: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  creative: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  casual_chat: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  trading: 'bg-green-500/20 text-green-400 border-green-500/30',
  translation: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  long_context: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  reasoning: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  knowledge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

const INTENT_LABELS: Record<IntentType, string> = {
  coding: '💻 Coding',
  analysis: '🧠 Analysis',
  creative: '✨ Creative',
  casual_chat: '💬 Chat',
  trading: '📈 Trading',
  translation: '🌐 Translation',
  long_context: '📄 Long Context',
  reasoning: '🔍 Reasoning',
  knowledge: '📚 Knowledge',
};

// ===== Sortable Rule Item =====

interface SortableRuleItemProps {
  rule: RuleConfig;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
}

function SortableRuleItem({ rule, onToggle, onDelete }: SortableRuleItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rule.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border bg-surface-raised transition-colors',
        isDragging && 'shadow-lg border-brand-primary/50',
        !isDragging && rule.type === 'system' && 'border-border-subtle',
        !isDragging && rule.type === 'custom' && 'border-border-subtle hover:border-neutral-6',
        !rule.enabled && 'opacity-50'
      )}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="text-neutral-6 hover:text-neutral-10 cursor-grab active:cursor-grabbing flex-shrink-0"
        title="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Priority Badge */}
      <span className="text-xs text-neutral-6 font-mono w-8 text-center flex-shrink-0">
        {rule.priority}
      </span>

      {/* Rule Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-sm font-medium text-neutral-10 truncate')}>
            {rule.type === 'custom' ? rule.keyword : rule.name}
          </span>
          <span className="text-xs text-neutral-6">({rule.type === 'system' ? 'System' : 'Custom'})</span>
        </div>
        {rule.description && (
          <p className="text-xs text-neutral-6 mt-0.5 truncate">{rule.description}</p>
        )}
      </div>

      {/* Intent Badge */}
      <span className={cn('text-xs px-2 py-0.5 rounded border flex-shrink-0', INTENT_COLORS[rule.intent])}>
        {INTENT_LABELS[rule.intent]}
      </span>

      {/* Toggle Switch */}
      <button
        onClick={() => onToggle(rule.id, !rule.enabled)}
        className={cn(
          'w-10 h-5 rounded-full transition-colors flex-shrink-0 relative',
          rule.enabled ? 'bg-semantic-success' : 'bg-neutral-6'
        )}
        title={rule.enabled ? 'Disable rule' : 'Enable rule'}
      >
        <div
          className={cn(
            'w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform',
            rule.enabled ? 'translate-x-5' : 'translate-x-0.5'
          )}
        />
      </button>

      {/* Delete Button (custom rules only) */}
      {rule.type === 'custom' && (
        <button
          onClick={() => onDelete(rule.id)}
          className="text-neutral-6 hover:text-semantic-error flex-shrink-0 p-1"
          title="Delete rule"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// ===== Add Rule Form =====

const NEW_RULE_INTENTS: IntentType[] = [
  'coding', 'analysis', 'creative', 'casual_chat',
  'trading', 'translation', 'long_context', 'reasoning', 'knowledge',
];

interface AddRuleFormProps {
  onAdd: (keyword: string, intent: IntentType, priority: number) => void;
  onCancel: () => void;
  isAdding: boolean;
}

function AddRuleForm({ onAdd, onCancel, isAdding }: AddRuleFormProps) {
  const [keyword, setKeyword] = useState('');
  const [intent, setIntent] = useState<IntentType>('casual_chat');
  const [priority, setPriority] = useState(50);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    onAdd(keyword.trim(), intent, priority);
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 rounded-lg border border-brand-primary/30 bg-brand-primary/5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-brand-primary">Add Custom Rule</span>
        <button type="button" onClick={onCancel} className="text-neutral-6 hover:text-neutral-10">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          placeholder="Keyword (matched by contains)..."
          className="flex-1 px-3 py-2 bg-surface-overlay border border-border-subtle rounded-lg text-sm text-neutral-10 placeholder:text-neutral-6 focus:outline-none focus:border-brand-primary"
          autoFocus
        />
        <input
          type="number"
          value={priority}
          onChange={e => setPriority(parseInt(e.target.value) || 0)}
          min={0}
          max={1000}
          className="w-20 px-3 py-2 bg-surface-overlay border border-border-subtle rounded-lg text-sm text-neutral-10 focus:outline-none focus:border-brand-primary"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {NEW_RULE_INTENTS.map(it => (
          <button
            key={it}
            type="button"
            onClick={() => setIntent(it)}
            className={cn(
              'text-xs px-2 py-1 rounded border transition-colors',
              intent === it
                ? 'bg-brand-primary text-white border-brand-primary'
                : 'bg-surface-raised text-neutral-7 border-border-subtle hover:border-neutral-6'
            )}
          >
            {INTENT_LABELS[it]}
          </button>
        ))}
      </div>

      <button
        type="submit"
        disabled={isAdding || !keyword.trim()}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-primary/90 disabled:opacity-50 transition-colors"
      >
        {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        {isAdding ? 'Adding...' : 'Add Rule'}
      </button>
    </form>
  );
}

// ===== Main Component =====

interface RoutingRulesEditorProps {
  className?: string;
}

export function RoutingRulesEditor({ className }: RoutingRulesEditorProps) {
  const { token } = useUserStore();
  const [rules, setRules] = useState<RuleConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const fetchRules = useCallback(async () => {
    if (!token) return;
    try {
      setError(null);
      const res = await fetch('/api/user/rules/routing-rules', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to load rules');
      const data = await res.json();
      setRules(data.rules);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rules');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = rules.findIndex(r => r.id === active.id);
    const newIndex = rules.findIndex(r => r.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(rules, oldIndex, newIndex);
    // Assign priorities based on position (higher position = higher priority)
    const withPriorities = reordered.map((r, i) => ({
      ...r,
      priority: (reordered.length - i) * 10,
    }));
    setRules(withPriorities);

    // Save to backend
    setIsSaving(true);
    try {
      await fetch('/api/user/rules/routing-rules/reorder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rules: withPriorities
            .filter(r => r.type === 'custom')
            .map(r => ({ id: r.id, priority: r.priority })),
        }),
      });
    } catch {
      // Revert on error
      setRules(rules);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    // Optimistic update
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled } : r));

    try {
      const res = await fetch(`/api/user/rules/routing-rules/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error('Failed to update rule');
    } catch {
      // Revert
      setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !enabled } : r));
    }
  };

  const handleDelete = async (id: string) => {
    const prev = rules;
    setRules(prev => prev.filter(r => r.id !== id));

    try {
      const res = await fetch(`/api/user/rules/routing-rules/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to delete rule');
    } catch {
      setRules(prev);
    }
  };

  const handleAdd = async (keyword: string, intent: IntentType, priority: number) => {
    setIsAdding(true);
    try {
      const res = await fetch('/api/user/rules/routing-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ keyword, intent, priority }),
      });
      if (!res.ok) throw new Error('Failed to add rule');
      const data = await res.json();
      setShowAddForm(false);
      await fetchRules();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add rule');
    } finally {
      setIsAdding(false);
    }
  };

  const systemRules = rules.filter(r => r.type === 'system');
  const customRules = rules.filter(r => r.type === 'custom');

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-neutral-10">Routing Rules</h2>
          <p className="text-sm text-neutral-7 mt-0.5">
            Drag to reorder — higher priority matches first. System rules cannot be deleted.
          </p>
        </div>
        {isSaving && (
          <div className="flex items-center gap-2 text-sm text-brand-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving...
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-semantic-error/10 border border-semantic-error/20 rounded-lg text-sm text-semantic-error">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-surface-raised animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && (
        <>
          {/* Custom Rules Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-neutral-10">
                Custom Rules ({customRules.length})
              </h3>
              <button
                onClick={() => setShowAddForm(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Rule
              </button>
            </div>

            {showAddForm && (
              <div className="mb-3">
                <AddRuleForm
                  onAdd={handleAdd}
                  onCancel={() => setShowAddForm(false)}
                  isAdding={isAdding}
                />
              </div>
            )}

            {customRules.length === 0 && !showAddForm && (
              <div className="p-6 border border-dashed border-border-subtle rounded-lg text-center text-sm text-neutral-7">
                No custom rules yet. Click &quot;Add Rule&quot; to create one.
              </div>
            )}

            {customRules.length > 0 && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={customRules.map(r => r.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {customRules.map(rule => (
                      <SortableRuleItem
                        key={rule.id}
                        rule={rule}
                        onToggle={handleToggle}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* System Rules Section */}
          <div>
            <h3 className="text-sm font-semibold text-neutral-10 mb-2">
              System Rules ({systemRules.length})
            </h3>
            <p className="text-xs text-neutral-6 mb-3">
              System rules can be enabled/disabled but not deleted or reordered.
            </p>

            <div className="space-y-2">
              {systemRules.map(rule => (
                <div
                  key={rule.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border bg-surface-raised transition-colors',
                    'border-border-subtle',
                    !rule.enabled && 'opacity-50'
                  )}
                >
                  <div className="w-4 flex-shrink-0" /> {/* Spacer for alignment */}

                  <span className="text-xs text-neutral-6 font-mono w-8 text-center flex-shrink-0">
                    {rule.priority}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-10">{rule.name}</span>
                      <span className="text-xs text-neutral-6">System</span>
                    </div>
                    {rule.description && (
                      <p className="text-xs text-neutral-6 mt-0.5">{rule.description}</p>
                    )}
                  </div>

                  <span className={cn('text-xs px-2 py-0.5 rounded border flex-shrink-0', INTENT_COLORS[rule.intent])}>
                    {INTENT_LABELS[rule.intent]}
                  </span>

                  <button
                    onClick={() => handleToggle(rule.id, !rule.enabled)}
                    className={cn(
                      'w-10 h-5 rounded-full transition-colors flex-shrink-0 relative',
                      rule.enabled ? 'bg-semantic-success' : 'bg-neutral-6'
                    )}
                  >
                    <div
                      className={cn(
                        'w-4 h-4 bg-white rounded-full absolute top-0.5 transition-transform',
                        rule.enabled ? 'translate-x-5' : 'translate-x-0.5'
                      )}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
