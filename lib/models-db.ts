import type { Model, SortMode } from './types';
import modelsDataRaw from '@/data/models.json';
import sceneModelMappingRaw from '@/data/scene-model-mapping.json';
import { isModelsData, isSceneModelMapping, validateOrThrow } from './validate-data';

const modelsData = validateOrThrow(modelsDataRaw, isModelsData, 'models.json');
const sceneModelMapping = validateOrThrow(sceneModelMappingRaw, isSceneModelMapping, 'scene-model-mapping.json');

const models: Model[] = modelsData.models;

/** Get all models */
export function getAllModels(): Model[] {
  return models;
}

/** Get a single model by ID */
export function getModelById(id: string): Model | undefined {
  return models.find((m) => m.id === id);
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
