import { describe, it, expect } from 'vitest';
import { getAllModels, getModelById, getModelsByScene, sortModels } from '@/lib/models-db';
import sceneModelMappingRaw from '@/data/scene-model-mapping.json';

const sceneModelMapping = sceneModelMappingRaw as Record<string, { candidateModelIds: string[] }>;

describe('models-db', () => {
  it('getAllModels returns all models', () => {
    const models = getAllModels();
    expect(models.length).toBeGreaterThanOrEqual(20);
  });

  it('getModelById finds existing model', () => {
    const model = getModelById('qwen/qwen3-coder');
    expect(model).toBeDefined();
    expect(model?.name).toBe('Qwen3 Coder');
  });

  it('getModelById returns undefined for non-existent', () => {
    const model = getModelById('non-existent');
    expect(model).toBeUndefined();
  });

  it('getModelsByScene returns models for valid scene', () => {
    const models = getModelsByScene('trading-bot', sceneModelMapping);
    expect(models.length).toBeGreaterThanOrEqual(2);
  });

  it('getModelsByScene returns empty for invalid scene', () => {
    const models = getModelsByScene('invalid', sceneModelMapping);
    expect(models).toEqual([]);
  });

  it('sortModels costFirst sorts by cost ascending', () => {
    const models = getAllModels();
    const sorted = sortModels(models, 'costFirst');
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]!.costPer1KToken).toBeGreaterThanOrEqual(sorted[i - 1]!.costPer1KToken);
    }
  });

  it('sortModels qualityFirst sorts by quality descending then cost ascending', () => {
    const models = getAllModels();
    const sorted = sortModels(models, 'qualityFirst');
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i]!.qualityRating !== sorted[i - 1]!.qualityRating) {
        expect(sorted[i - 1]!.qualityRating).toBeGreaterThanOrEqual(sorted[i]!.qualityRating);
      } else {
        expect(sorted[i]!.costPer1KToken).toBeGreaterThanOrEqual(sorted[i - 1]!.costPer1KToken);
      }
    }
  });

  it('sortModels speedFirst sorts by speed descending then cost ascending', () => {
    const models = getAllModels();
    const sorted = sortModels(models, 'speedFirst');
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i]!.speedRating !== sorted[i - 1]!.speedRating) {
        expect(sorted[i - 1]!.speedRating).toBeGreaterThanOrEqual(sorted[i]!.speedRating);
      } else {
        expect(sorted[i]!.costPer1KToken).toBeGreaterThanOrEqual(sorted[i - 1]!.costPer1KToken);
      }
    }
  });
});
