import { create } from 'zustand';
import type { Scene, Model, RoutingRule, Template, SortMode, Locale } from '@/lib/types';
import { getAllModels, getModelsByScene, sortModels } from '@/lib/models-db';
import { createDefaultRules, addRule, removeRule, reorderRules, updateRule, createEmptyRule } from '@/lib/router-engine';
import scenesData from '@/data/scenes.json';
import templatesData from '@/data/templates.json';
import sceneModelMappingRaw from '@/data/scene-model-mapping.json';

const sceneModelMapping = sceneModelMappingRaw as Record<string, { candidateModelIds: string[]; defaultTemplateId: string }>;

interface AppStore {
  // Scene slice
  scenes: Scene[];
  selectedSceneId: string | null;
  selectScene: (sceneId: string) => void;

  // Model slice
  allModels: Model[];
  sortMode: SortMode;
  setSortMode: (mode: SortMode) => void;
  getModelsForSelectedScene: () => Model[];
  getSortedModelsForSelectedScene: () => Model[];

  // Rule slice
  rules: RoutingRule[];
  addNewRule: () => void;
  removeRuleById: (ruleId: string) => void;
  reorderRuleList: (orderedIds: string[]) => void;
  updateRuleById: (ruleId: string, partial: Partial<RoutingRule>) => void;
  loadRulesFromTemplate: (templateId: string) => void;
  resetToDefault: () => void;

  // Template slice
  templates: Template[];
  getTemplatesForSelectedScene: () => Template[];
  applyTemplate: (templateId: string) => void;

  // UI slice
  locale: Locale;
  setLocale: (locale: Locale) => void;
  copySuccess: boolean;
  setCopySuccess: (success: boolean) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  // Scene slice
  scenes: scenesData.scenes as Scene[],
  selectedSceneId: null,
  selectScene: (sceneId: string) => {
    const mapping = sceneModelMapping[sceneId];
    const templateId = mapping?.defaultTemplateId;
    const rules = templateId
      ? createDefaultRules(sceneId, templateId)
      : [{ id: 'default', condition: null, targetModelId: '', isDefault: true }];
    set({ selectedSceneId: sceneId, rules });
  },

  // Model slice
  allModels: getAllModels(),
  sortMode: 'costFirst' as SortMode,
  setSortMode: (mode: SortMode) => set({ sortMode: mode }),
  getModelsForSelectedScene: () => {
    const { selectedSceneId } = get();
    if (!selectedSceneId) return [];
    return getModelsByScene(selectedSceneId);
  },
  getSortedModelsForSelectedScene: () => {
    const { sortMode } = get();
    const models = get().getModelsForSelectedScene();
    return sortModels(models, sortMode);
  },

  // Rule slice
  rules: [{ id: 'default', condition: null, targetModelId: '', isDefault: true }],
  addNewRule: () => {
    const newRule = createEmptyRule();
    set({ rules: addRule(get().rules, newRule) });
  },
  removeRuleById: (ruleId: string) => {
    set({ rules: removeRule(get().rules, ruleId) });
  },
  reorderRuleList: (orderedIds: string[]) => {
    set({ rules: reorderRules(get().rules, orderedIds) });
  },
  updateRuleById: (ruleId: string, partial: Partial<RoutingRule>) => {
    set({ rules: updateRule(get().rules, ruleId, partial) });
  },
  loadRulesFromTemplate: (templateId: string) => {
    const { selectedSceneId } = get();
    if (!selectedSceneId) return;
    const rules = createDefaultRules(selectedSceneId, templateId);
    set({ rules });
  },
  resetToDefault: () => {
    const { selectedSceneId } = get();
    if (!selectedSceneId) return;
    const mapping = sceneModelMapping[selectedSceneId];
    const templateId = mapping?.defaultTemplateId;
    const rules = templateId
      ? createDefaultRules(selectedSceneId, templateId)
      : [{ id: 'default', condition: null, targetModelId: '', isDefault: true }];
    set({ rules });
  },

  // Template slice
  templates: templatesData.templates as Template[],
  getTemplatesForSelectedScene: () => {
    const { selectedSceneId, templates } = get();
    if (!selectedSceneId) return [];
    return templates.filter((t) => t.sceneId === selectedSceneId);
  },
  applyTemplate: (templateId: string) => {
    get().loadRulesFromTemplate(templateId);
  },

  // UI slice
  locale: 'zh' as Locale,
  setLocale: (locale: Locale) => set({ locale }),
  copySuccess: false,
  setCopySuccess: (success: boolean) => set({ copySuccess: success }),
}));
