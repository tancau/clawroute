// ===== Enums =====
export type SortMode = 'costFirst' | 'qualityFirst' | 'speedFirst';

export type RequestAttribute = 'complexity' | 'hasCode' | 'needsReasoning' | 'inputTokenRange';

export type ComplexityLevel = 'simple' | 'medium' | 'complex';

export type Locale = 'zh' | 'en';

// ===== Core Data Models =====
export interface Scene {
  id: string;
  name: string;
  icon: string;
  description: string;
  estimatedSaving: string;
  candidateModelIds: string[];
  defaultTemplateId: string;
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  costPer1KToken: number;
  speedRating: 1 | 2 | 3;
  qualityRating: 1 | 2 | 3;
  capabilityTags: string[];
  recommendationReason?: string;
}

export interface RoutingRule {
  id: string;
  condition: RuleCondition | null; // null means default rule
  targetModelId: string;
  isDefault: boolean;
}

export interface RuleCondition {
  attribute: RequestAttribute;
  matchValue: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  sceneId: string;
  rules: RoutingRule[];
  estimatedSavingRate: number;
  author: string;
}

// ===== YAML Generation Intermediate Types =====
export interface YamlModelEntry {
  name: string;
  provider: string;
  model: string;
  routing: {
    when?: Array<Record<string, string | boolean>>;
    use: string;
  };
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
