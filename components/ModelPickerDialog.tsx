'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Search, Check, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DiscoveredModel {
  id: string;
  name: string;
  owned_by: string;
  context_window: number | null;
}

interface ModelPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseUrl: string;
  apiKey: string;
  selectedModels: string[];
  onConfirm: (models: string[]) => void;
}

export function ModelPickerDialog({
  open,
  onOpenChange,
  baseUrl,
  apiKey,
  selectedModels,
  onConfirm,
}: ModelPickerDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [models, setModels] = useState<DiscoveredModel[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(selectedModels));
  const [searchQuery, setSearchQuery] = useState('');

  const fetchModels = useCallback(async () => {
    if (!baseUrl.trim() || !apiKey.trim()) return;
    
    setLoading(true);
    setError(null);
    setModels([]);
    try {
      const response = await fetch('/api/discover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl: baseUrl.trim(), apiKey: apiKey.trim() }),
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else if (data.models && Array.isArray(data.models)) {
        setModels(data.models);
      } else {
        setError('No models found');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch models');
    } finally {
      setLoading(false);
    }
  }, [baseUrl, apiKey]);

  // 当弹窗打开且 baseUrl/apiKey 有效时，自动获取模型列表
  useEffect(() => {
    if (open && baseUrl.trim() && apiKey.trim()) {
      fetchModels();
    }
  }, [open, baseUrl, apiKey, fetchModels]);

  // 重置选中状态
  useEffect(() => {
    setSelected(new Set(selectedModels));
  }, [selectedModels]);

  const toggleModel = (modelId: string) => {
    setSelected(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(modelId)) {
        newSelected.delete(modelId);
      } else {
        newSelected.add(modelId);
      }
      return newSelected;
    });
  };

  const toggleAll = () => {
    setSelected(prev => {
      // 过滤模型列表
      const filtered = models.filter(m =>
        m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.name && m.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      
      if (prev.size === filtered.length) {
        // 取消全选
        return new Set();
      } else {
        // 全选
        return new Set(filtered.map(m => m.id));
      }
    });
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selected));
    onOpenChange(false);
  };

  // 过滤模型列表
  const filteredModels = models.filter(m =>
    m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.name && m.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const isAllSelected = selected.size === filteredModels.length && filteredModels.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Models</DialogTitle>
          <DialogDescription>
            Choose the models you want to use with this provider.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-3">
          {/* Search and actions */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-7" />
              <Input
                placeholder="Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleAll}
              disabled={loading || models.length === 0}
            >
              {isAllSelected ? (
                <>
                  <X className="w-4 h-4 mr-1" />
                  Deselect All
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Select All
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchModels}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>

          {/* Error state */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
            </div>
          )}

          {/* Models list */}
          {!loading && models.length > 0 && (
            <div className="flex-1 overflow-auto border border-border-subtle rounded-md">
              <div className="divide-y divide-border-subtle">
                {filteredModels.map((model) => {
                  const isSelected = selected.has(model.id);
                  return (
                    <label
                      key={model.id}
                      className={cn(
                        'flex items-center gap-3 p-3 cursor-pointer hover:bg-brand-primary/5 transition-colors',
                        isSelected && 'bg-brand-primary/10'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleModel(model.id)}
                        className="w-4 h-4 rounded border-neutral-6 text-brand-primary focus:ring-brand-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-neutral-10 truncate">{model.name || model.id}</div>
                        <div className="text-xs text-neutral-7 font-mono truncate">{model.id}</div>
                      </div>
                      {model.context_window && (
                        <span className="text-xs text-neutral-7 whitespace-nowrap">
                          {(model.context_window / 1000).toFixed(0)}K ctx
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
              {filteredModels.length === 0 && searchQuery && (
                <div className="p-8 text-center text-neutral-7">
                  No models match your search.
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && models.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-7">
              <AlertCircle className="w-12 h-12 mb-3 opacity-50" />
              <p>No models found.</p>
              <p className="text-sm mt-1">Click &quot;Refresh&quot; to try again.</p>
            </div>
          )}

          {/* Selected count */}
          {selected.size > 0 && (
            <div className="flex items-center gap-2 text-sm text-semantic-success">
              <CheckCircle2 className="w-4 h-4" />
              <span>{selected.size} model{selected.size > 1 ? 's' : ''} selected</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={selected.size === 0}>
            Confirm Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
