export class DataValidationError extends Error {
  constructor(public readonly source: string, public readonly detail: string) {
    super(`Data validation failed for ${source}: ${detail}`);
    this.name = 'DataValidationError';
  }
}

/** Validate a single Model object */
function isModel(data: unknown): data is import('./types').Model {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.provider === 'string' &&
    typeof obj.costPer1KToken === 'number' &&
    typeof obj.speedRating === 'number' &&
    typeof obj.qualityRating === 'number' &&
    Array.isArray(obj.capabilityTags)
  );
}

/** Validate ModelsData structure */
export function isModelsData(data: unknown): data is import('./types').ModelsData {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.models)) return false;
  if (typeof obj.lastUpdated !== 'string') return false;
  return obj.models.every(isModel);
}

/** Validate a single Scene object */
function isScene(data: unknown): data is import('./types').Scene {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.icon === 'string' &&
    typeof obj.description === 'string' &&
    typeof obj.estimatedSaving === 'string'
  );
}

/** Validate ScenesData structure */
export function isScenesData(data: unknown): data is import('./types').ScenesData {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.scenes)) return false;
  if (typeof obj.lastUpdated !== 'string') return false;
  return obj.scenes.every(isScene);
}

/** Validate a single Template object */
function isTemplate(data: unknown): data is import('./types').Template {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.description === 'string' &&
    typeof obj.sceneId === 'string' &&
    Array.isArray(obj.rules) &&
    typeof obj.estimatedSavingRate === 'number' &&
    typeof obj.author === 'string'
  );
}

/** Validate TemplatesData structure */
export function isTemplatesData(data: unknown): data is import('./types').TemplatesData {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.templates)) return false;
  return obj.templates.every(isTemplate);
}

/** Validate SceneModelMapping structure */
export function isSceneModelMapping(data: unknown): data is import('./types').SceneModelMapping {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    const entry = obj[key];
    if (typeof entry !== 'object' || entry === null) return false;
    const e = entry as Record<string, unknown>;
    if (!Array.isArray(e.candidateModelIds)) return false;
    if (typeof e.defaultTemplateId !== 'string') return false;
  }
  return true;
}

/** Validate data and throw on failure */
export function validateOrThrow<T>(data: unknown, validator: (d: unknown) => d is T, source: string): T {
  if (validator(data)) return data;
  throw new DataValidationError(source, 'Invalid data structure');
}
