// ===== Enums =====
export type SortMode = 'costFirst' | 'qualityFirst' | 'speedFirst';

export type Locale = 'zh' | 'en';

// ===== Core Data Models =====
export interface Scene {
  id: string;
  name: string;
  icon: string;
  description: string;
  estimatedSaving: string;
}

export interface Model {
  id: string;           // e.g. "qwen/qwen3-coder"
  name: string;
  provider: string;
  costPer1KToken: number;
  speedRating: 1 | 2 | 3;
  qualityRating: 1 | 2 | 3;
  capabilityTags: string[];
  recommendationReason?: string;
  // OpenClaw format fields
  input?: string[];
  contextWindow?: number;
  maxTokens?: number;
  api?: string;
}

/** Model selection for OpenClaw: primary + fallbacks */
export interface ModelSelection {
  primaryModelId: string;        // provider/model format
  fallbackModelIds: string[];    // ordered fallback list, provider/model format
}

export interface Template {
  id: string;
  name: string;
  description: string;
  sceneId: string;
  selection: ModelSelection;     // replaces old "rules"
  estimatedSavingRate: number;
  author: string;
}

// ===== Data File Types =====
export interface ScenesData {
  scenes: Scene[];
  lastUpdated: string;
}

export interface ModelsData {
  models: Model[];
  lastUpdated: string;
  dataSource: string;
}

export interface TemplatesData {
  templates: Template[];
}

export interface SceneModelMapping {
  [sceneId: string]: {
    candidateModelIds: string[];
    defaultTemplateId: string;
  };
}

// ===== Config Generation Types =====
export interface OpenClawModelEntry {
  id: string;
  name: string;
  input: string[];
  contextWindow?: number;
  maxTokens?: number;
  cost?: {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
  };
}

export interface OpenClawProviderEntry {
  baseUrl: string;
  apiKey: string;
  api: string;
  models: OpenClawModelEntry[];
}

export interface OpenClawConfig {
  models: {
    mode: string;
    providers: Record<string, OpenClawProviderEntry>;
  };
  agents: {
    defaults: {
      model: {
        primary: string;
        fallbacks: string[];
      };
      models: Record<string, { alias: string }>;
    };
  };
}
