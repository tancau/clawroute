// ClawRouter Backend
// Dynamic intelligent routing middleware for LLM APIs

// 数据库
export { db, initDatabase } from './db';

// 用户系统
export {
  UserTool,
  getUser,
  updateUser,
  deductCredits,
  addCredits,
  verifyPassword,
  regenerateApiKey,
  getUserByApiKey,
  UserSchema,
  type User,
} from './users';

// Key 管理
export {
  KeyTool,
  getKeys,
  getAvailableKey,
  updateKey,
  recordKeyUsage,
  deleteKey,
  SharedKeySchema,
  type SharedKey,
} from './keys';

// 计费系统
export {
  BillingTool,
  getUserEarnings,
  getUserUsageStats,
  calculateCost,
  calculateSavings,
  calculateCommission,
  UsageLogSchema,
  EarningSchema,
  PRICING,
  COMMISSION_RATES,
  type UsageLog,
  type Earning,
} from './billing';

// 加密工具
export {
  encryptApiKey,
  decryptApiKey,
  generateKeyPreview,
  validateKeyFormat,
} from './utils/crypto';

// 工具注册
export { toolRegistry } from './tools/registry';
export { ClassifyTool } from './tools/classify';
export { RouteTool } from './tools/route';
export { ProxyTool, keyManager } from './tools/proxy';
export type { Tool, ToolContext, IntentType } from './tools/types';
export { default as app } from './api/server';

// Provider 配置
export {
  providers,
  modelCapabilities,
  getProvider,
  getEnabledProviders,
  getModelCapability,
  getModelsForIntent,
  type ProviderConfig,
  type ModelCapability,
} from './config/providers';

// 版本信息
export const VERSION = '0.1.0';

// 模型目录
export {
  getAllModels,
  getModelById as getCatalogModelById,
  getModelsByProvider,
  getModelsByIntent as getCatalogModelsByIntent,
  getFreeModels as getCatalogFreeModels,
  getModelPricing,
  getCatalogStats,
  upsertModel,
  upsertModels,
  type ModelCatalogEntry,
} from './db/model-catalog';

// 模型同步
export {
  syncAll,
  syncPrices,
  syncModels,
  importFromProviders,
  type SyncResult,
} from './sync';

export { modelSyncScheduler } from './sync/scheduler';
