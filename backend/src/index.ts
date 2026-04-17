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

// 团队管理
export {
  createTeam,
  getTeam,
  getUserTeams,
  getMemberRole,
  inviteMember,
  acceptInvitation,
  removeMember,
  updateRole,
  getTeamInvitations,
  getUserInvitations,
  deleteTeam,
  initTeamTables,
  type Team,
  type TeamMember,
  type TeamRole,
  type TeamInvitation,
} from './team';

// 权限控制
export {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getPermissions,
  roleHasPermission,
  checkResourceAccess,
  getEffectiveRole,
  requirePermission,
  PermissionDeniedError,
  type Permission,
} from './auth/permissions';

// 审计日志
export {
  logAudit,
  getAuditLogs,
  getUserAuditLogs,
  exportAuditLogs,
  countAuditLogs,
  initAuditTables,
  type AuditLog,
  type AuditLogFilters,
  type AuditEvent,
} from './audit';

// API Key 管理
export {
  createApiKey,
  listApiKeys,
  listTeamApiKeys,
  getApiKey,
  validateApiKey,
  revokeApiKey,
  updateApiKey,
  deleteApiKey,
  getApiKeyUsage,
  initApiKeysTables,
  type DeveloperApiKey,
  type CreateApiKeyOptions,
} from './api-keys';

// SSO 登录系统
export {
  initSSOTables,
  listSSOProviders,
  getSSOProvider,
  createSSOConnection,
  getSSOConnection,
  getSSOConnectionByDomain,
  deleteSSOConnection,
  updateSSOConnection,
  initiateSSO,
  handleSSOCallback,
  verifySSOAccess,
  type SSOProvider,
  type SSOConnection,
  type SSOSession,
  type SSOInitiateResult,
  type SSOCallbackResult,
} from './sso';

// 品牌定制
export {
  initBrandingTables,
  getBrandConfig,
  updateBrandConfig,
  deleteBrandConfig,
  validateCustomDomain,
  registerCustomDomain,
  verifyCustomDomain,
  getCustomDomain,
  getTeamCustomDomains,
  deleteCustomDomain,
  enableSSL,
  resolveBrandFromHost,
  type BrandConfig,
  type CustomDomain,
} from './branding';

// 数据导出
export {
  initExportTables,
  createExportJob,
  getExportJob,
  getExportJobs,
  getUserExportJobs,
  processExportJob,
  getDownloadUrl,
  deleteExportJob,
  cleanupExpiredJobs,
  type ExportJob,
  type ExportType,
  type ExportFormat,
} from './export';

// 定制化路由
export {
  initCustomRoutingTables,
  createCustomRule,
  listCustomRules,
  getCustomRule,
  updateCustomRule,
  deleteCustomRule,
  evaluateRule,
  applyCustomRules,
  type CustomRoutingRule,
  type RoutingRequest,
  type RoutingDecision,
} from './routing/custom';

// 版本信息
export const VERSION = '0.4.0';
