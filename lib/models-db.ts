import type { Model, SortMode } from './types';
import modelsDataRaw from '@/data/models.json';

// 编译时静态数据作为 fallback
const staticModels: Model[] = modelsDataRaw as Model[];

// 运行时动态数据缓存
let dynamicModels: Model[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟

/**
 * 获取模型列表（优先动态，fallback 静态）
 */
async function getModelsList(): Promise<Model[]> {
  // 1. 有动态数据且未过期 → 直接用
  if (dynamicModels && Date.now() - lastFetchTime < CACHE_TTL) {
    return dynamicModels;
  }

  // 2. 尝试从后端 API 获取
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const resp = await fetch(`${apiUrl}/api/models/catalog`, {
      next: { revalidate: 300 }, // Next.js ISR: 5 分钟
    });
    if (resp.ok) {
      const data = await resp.json();
      if (data.models && data.models.length > 0) {
        dynamicModels = data.models;
        lastFetchTime = Date.now();
        return dynamicModels;
      }
    }
  } catch {
    // 后端不可用，fallback
  }

  // 3. 静态 fallback
  return staticModels;
}

/** Get all models */
export function getAllModels(): Model[] {
  // 同步版本：优先返回动态缓存，否则静态
  return dynamicModels || staticModels;
}

/** Get all models (async, with fetch) */
export async function getAllModelsAsync(): Promise<Model[]> {
  return getModelsList();
}

/** Get a single model by ID (provider/model format) */
export function getModelById(id: string): Model | undefined {
  const models = getAllModels();
  return models.find((m) => m.id === id);
}

/** Filter models by capability tags */
export function getModelsByCapabilities(tags: string[]): Model[] {
  const models = getAllModels();
  return models.filter((m) =>
    tags.some((tag) => m.capabilityTags.includes(tag))
  );
}

/** Get candidate models for a scene */
export function getModelsByScene(sceneId: string, sceneModelMapping: Record<string, { candidateModelIds: string[] }>): Model[] {
  const models = getAllModels();
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

/**
 * 刷新动态模型缓存
 * 在客户端调用，触发从后端 API 拉取最新数据
 */
export async function refreshModels(): Promise<void> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const resp = await fetch(`${apiUrl}/api/models/catalog`);
    if (resp.ok) {
      const data = await resp.json();
      if (data.models && data.models.length > 0) {
        dynamicModels = data.models;
        lastFetchTime = Date.now();
      }
    }
  } catch {
    // 静默失败，保持现有缓存
  }
}
