import { z } from 'zod';

/**
 * Tool 统一接口定义
 * 基于 Claude Code CLI 架构模式
 */
export type Tool<Input extends z.ZodTypeAny = z.ZodTypeAny, Output = unknown> = {
  // 元数据
  readonly name: string;
  readonly aliases?: string[];
  readonly description: string;

  // 输入输出 Schema
  readonly inputSchema: Input;
  readonly outputSchema?: z.ZodType<Output>;

  // 核心方法
  call(input: z.infer<Input>, context: ToolContext): Promise<ToolResult<Output>>;

  // 安全相关
  isEnabled(): boolean;
  isConcurrencySafe(input: z.infer<Input>): boolean;
  isReadOnly(input: z.infer<Input>): boolean;
  isDestructive?(input: z.infer<Input>): boolean;

  // 权限检查
  checkPermissions?(
    input: z.infer<Input>,
    context: ToolContext
  ): Promise<PermissionResult>;
  validateInput?(
    input: z.infer<Input>,
    context: ToolContext
  ): Promise<ValidationResult>;
};

/**
 * 工具执行结果
 */
export type ToolResult<T> = {
  data: T;
  metadata?: Record<string, unknown>;
};

/**
 * 权限检查结果
 */
export type PermissionResult =
  | { behavior: 'allow'; updatedInput?: unknown }
  | { behavior: 'deny'; message: string }
  | { behavior: 'ask'; reason: string; suggestions?: string[] };

/**
 * 输入验证结果
 */
export type ValidationResult =
  | { result: true }
  | { result: false; message: string; code: number };

/**
 * 工具执行上下文
 */
export interface ToolContext {
  requestId: string;
  timestamp: number;
  startTime: number;
  user?: UserContext;
  permissions?: PermissionContext;
  cache?: CacheContext;
  config?: Record<string, unknown>;
}

/**
 * 用户上下文
 */
export interface UserContext {
  id: string;
  tier: 'free' | 'pro' | 'enterprise';
  email?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 权限上下文
 */
export interface PermissionContext {
  mode: 'default' | 'bypass' | 'readonly';
  allowedTools: Set<string>;
  deniedTools: Set<string>;
}

/**
 * 缓存上下文
 */
export interface CacheContext {
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T, ttl?: number): void;
  delete(key: string): boolean;
  clear(): void;
}

/**
 * 意图类型
 */
export type IntentType =
  | 'coding'
  | 'analysis'
  | 'creative'
  | 'casual_chat'
  | 'trading'
  | 'translation'
  | 'long_context'
  | 'reasoning'
  | 'knowledge';

/**
 * 分类来源
 */
export type ClassificationSource = 'rule' | 'ai' | 'cached';
