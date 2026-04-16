import { create } from 'zustand';
import type { Scene, Model, ModelSelection, Template, SortMode, Locale } from '@/lib/types';
import { getAllModels, getModelsByScene, sortModels } from '@/lib/models-db';
import scenesDataRaw from '@/data/scenes.json';
import templatesDataRaw from '@/data/templates.json';
import sceneModelMappingRaw from '@/data/scene-model-mapping.json';

const scenesData = scenesDataRaw as { scenes: Scene[]; lastUpdated: string };
const templatesData = templatesDataRaw as { templates: Template[] };
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

  // Model selection slice (replaces old routing rules)
  selection: ModelSelection;
  setPrimaryModel: (modelId: string) => void;
  setFallbackModels: (modelIds: string[]) => void;
  addFallbackModel: (modelId: string) => void;
  removeFallbackModel: (modelId: string) => void;
  reorderFallbacks: (orderedIds: string[]) => void;
  loadSelectionFromTemplate: (templateId: string) => void;
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
  scenes: scenesData.scenes,
  selectedSceneId: null,
  selectScene: (sceneId: string) => {
    const mapping = sceneModelMapping[sceneId];
    const templateId = mapping?.defaultTemplateId;
    let selection: ModelSelection = { primaryModelId: '', fallbackModelIds: [] };
    if (templateId) {
      const template = templatesData.templates.find(t => t.id === templateId);
      if (template) {
        selection = { ...template.selection };
      }
    }
    set({ selectedSceneId: sceneId, selection });
  },

  // Model slice
  allModels: getAllModels(),
  sortMode: 'costFirst' as SortMode,
  setSortMode: (mode) => set({ sortMode: mode }),
  getModelsForSelectedScene: () => {
    const { selectedSceneId } = get();
    if (!selectedSceneId) return [];
    return getModelsByScene(selectedSceneId, sceneModelMapping);
  },
  getSortedModelsForSelectedScene: () => {
    const { sortMode } = get();
    const models = get().getModelsForSelectedScene();
    return sortModels(models, sortMode);
  },

  // Model selection slice
  selection: { primaryModelId: '', fallbackModelIds: [] },
  setPrimaryModel: (modelId: string) => {
    set({ selection: { ...get().selection, primaryModelId: modelId } });
  },
  setFallbackModels: (modelIds: string[]) => {
    set({ selection: { ...get().selection, fallbackModelIds: modelIds } });
  },
  addFallbackModel: (modelId: string) => {
    const { fallbackModelIds } = get().selection;
    if (!fallbackModelIds.includes(modelId)) {
      set({ selection: { ...get().selection, fallbackModelIds: [...fallbackModelIds, modelId] } });
    }
  },
  removeFallbackModel: (modelId: string) => {
    set({ selection: { ...get().selection, fallbackModelIds: get().selection.fallbackModelIds.filter(id => id !== modelId) } });
  },
  reorderFallbacks: (orderedIds: string[]) => {
    set({ selection: { ...get().selection, fallbackModelIds: orderedIds } });
  },
  loadSelectionFromTemplate: (templateId: string) => {
    const template = templatesData.templates.find(t => t.id === templateId);
    if (template) {
      set({ selection: { ...template.selection } });
    }
  },
  resetToDefault: () => {
    const { selectedSceneId } = get();
    if (!selectedSceneId) return;
    const mapping = sceneModelMapping[selectedSceneId];
    const templateId = mapping?.defaultTemplateId;
    if (templateId) {
      const template = templatesData.templates.find(t => t.id === templateId);
      if (template) {
        set({ selection: { ...template.selection } });
        return;
      }
    }
    set({ selection: { primaryModelId: '', fallbackModelIds: [] } });
  },

  // Template slice
  templates: templatesData.templates,
  getTemplatesForSelectedScene: () => {
    const { selectedSceneId, templates } = get();
    if (!selectedSceneId) return [];
    return templates.filter((t) => t.sceneId === selectedSceneId);
  },
  applyTemplate: (templateId: string) => {
    get().loadSelectionFromTemplate(templateId);
  },

  // UI slice
  locale: 'zh' as Locale,
  setLocale: (locale) => set({ locale }),
  copySuccess: false,
  setCopySuccess: (success) => set({ copySuccess: success }),
}));
