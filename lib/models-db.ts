import type { Model, SortMode } from './types';
import providersData from '@/data/providers.json';
import sceneModelMappingRaw from '@/data/scene-model-mapping.json';

const sceneModelMapping = sceneModelMappingRaw as Record<string, { candidateModelIds: string[]; defaultTemplateId: string }>;

// Flatten models from providers.json into the existing Model[] format
function flattenModels(): Model[] {
  const models: Model[] = [];
  
  for (const [providerId, provider] of Object.entries(providersData.providers)) {
    for (const modelData of provider.models) {
      models.push({
        id: modelData.id,
        name: modelData.name,
        provider: providerId,
        costPer1KToken: modelData.costPer1KToken,
        speedRating: modelData.speedRating as 1 | 2 | 3,
        qualityRating: modelData.qualityRating as 1 | 2 | 3,
        capabilityTags: modelData.capabilityTags,
        recommendationReason: modelData.recommendationReason,
      });
    }
  }
  
  return models;
}

const models = flattenModels();

/** Get all models */
export function getAllModels(): Model[] {
  return models;
}

/** Get a single model by ID */
export function getModelById(id: string): Model | undefined {
  return models.find((m) => m.id === id);
}

/** Get all models as flat array (for internal use) */
export function getAllModelsFlat(): Model[] {
  return models;
}

/** Filter models by capability tags */
export function getModelsByCapabilities(tags: string[]): Model[] {
  return models.filter((m) =>
    tags.some((tag) => m.capabilityTags.includes(tag))
  );
}

/** Get candidate models for a scene */
export function getModelsByScene(sceneId: string): Model[] {
  const mapping = sceneModelMapping[sceneId];
  if (!mapping) return [];
  return mapping.candidateModelIds
    .map((id) => models.find((m) => m.id === id))
    .filter((m): m is Model => m !== undefined);
}

/** Sort models by the specified mode */
export function sortModels(models: Model[], mode: SortMode): Model[] {
  const sorted = [...models];
  switch (mode) {
    case 'costFirst':
      sorted.sort((a, b) => a.costPer1KToken - b.costPer1KToken);
      break;
    case 'qualityFirst':
      sorted.sort((a, b) => {
        if (b.qualityRating !== a.qualityRating) return b.qualityRating - a.qualityRating;
        return a.costPer1KToken - b.costPer1KToken;
      });
      break;
    case 'speedFirst':
      sorted.sort((a, b) => {
        if (b.speedRating !== a.speedRating) return b.speedRating - a.speedRating;
        return a.costPer1KToken - b.costPer1KToken;
      });
      break;
  }
  return sorted;
}

/** Get all provider IDs */
export function getAllProviderIds(): string[] {
  return Object.keys(providersData.providers);
}

/** Get provider info */
export function getProviderInfo(providerId: string) {
  return providersData.providers[providerId as keyof typeof providersData.providers];
}
