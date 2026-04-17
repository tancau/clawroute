# ClawRouter 开发指南

> 基于 Claude Code CLI 架构模式的开发规范

---

## 1. 核心设计原则

### 1.1 类型安全优先

**原则**：用类型系统替代运行时验证逻辑

```typescript
// ❌ 错误方式：依赖 try/catch 兜底
function handleRequest(input: unknown) {
  try {
    return processInput(input);
  } catch {
    return { error: 'Invalid input' };
  }
}

// ✅ 正确方式：Schema-first 设计
import { z } from 'zod';

const RequestSchema = z.object({
  action: z.enum(['classify', 'route', 'proxy']),
  message: z.string().min(1).max(10000),
  context: z.object({
    userId: z.string().optional(),
    history: z.array(z.string()).max(10).optional(),
  }).optional(),
});

type RequestInput = z.infer<typeof RequestSchema>;

async function handleRequest(input: unknown): Promise<Result> {
  const result = RequestSchema.safeParse(input);
  if (!result.success) {
    return { error: 'validation_failed', details: result.error.flatten() };
  }
  return processInput(result.data);
}
```

**收益**：
- 自动生成 API 文档（OpenAPI/Swagger）
- 运行时错误信息结构化
- 前后端类型共享

---

### 1.2 分层安全架构

**原则**：多层独立防线，每层只关心自己的事

```
┌─────────────────────────────────────────┐
│ Layer 1: 解析层 (Parser)                 │
│ - 格式验证、路径规范化                    │
│ - 剥离注释、空白                          │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│ Layer 2: 分析层 (Analyzer)               │
│ - 语义分析、危险模式检测                   │
│ - 提取核心操作                            │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│ Layer 3: 决策层 (Decision)               │
│ - 权限判断、配额检查                      │
│ - 结合上下文决策                          │
└──────────────────┬──────────────────────┘
                   ↓
┌─────────────────────────────────────────┐
│ Layer 4: 执行层 (Executor)               │
│ - 实际操作、沙箱隔离                      │
│ - 结果收集                               │
└─────────────────────────────────────────┘
```

**代码示例**：

```typescript
// router/security/layers.ts

// Layer 1: 解析层
export function parseRequest(input: string): ParsedRequest {
  // 只关心格式，不关心语义
  return {
    raw: input,
    normalized: input.trim().toLowerCase(),
    tokens: tokenize(input),
  };
}

// Layer 2: 分析层
export function analyzeRequest(parsed: ParsedRequest): AnalysisResult {
  // 检测危险模式
  const patterns = detectDangerousPatterns(parsed.tokens);
  return {
    intent: classifyIntent(parsed),
    riskLevel: calculateRisk(patterns),
    requiresAuth: patterns.includes('sensitive_data'),
  };
}

// Layer 3: 决策层
export async function decideAction(
  analysis: AnalysisResult,
  context: RequestContext
): Promise<Decision> {
  if (context.user.tier === 'free' && analysis.riskLevel > 0.5) {
    return { allow: false, reason: 'upgrade_required' };
  }
  if (analysis.requiresAuth && !context.user.verified) {
    return { allow: false, reason: 'verification_required' };
  }
  return { allow: true };
}

// Layer 4: 执行层
export async function executeRequest(
  request: ValidatedRequest,
  context: RequestContext
): Promise<Result> {
  // 在隔离环境中执行
  return sandboxExecute(() => processRequest(request));
}
```

---

### 1.3 工具模式 (Tool Pattern)

**原则**：统一的工具接口定义

```typescript
// tools/types.ts
import { z } from 'zod';

export type Tool<Input extends z.ZodTypeAny = z.ZodTypeAny, Output = unknown> = {
  // 元数据
  readonly name: string;
  readonly aliases?: string[];
  readonly description: string;
  
  // 输入输出
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
  checkPermissions?(input: z.infer<Input>, context: ToolContext): Promise<PermissionResult>;
  validateInput?(input: z.infer<Input>, context: ToolContext): Promise<ValidationResult>;
};

export type ToolResult<T> = {
  data: T;
  metadata?: Record<string, unknown>;
};

export type PermissionResult =
  | { behavior: 'allow'; updatedInput?: unknown }
  | { behavior: 'deny'; message: string }
  | { behavior: 'ask'; reason: string; suggestions?: string[] };

export type ValidationResult =
  | { result: true }
  | { result: false; message: string; code: number };
```

---

## 2. 项目结构

```
src/
├── tools/                    # 工具定义
│   ├── types.ts              # Tool 接口定义
│   ├── registry.ts           # 工具注册中心
│   ├── classify/             # 意图分类工具
│   │   ├── index.ts
│   │   ├── rules.ts          # 规则引擎
│   │   └── ai-classifier.ts  # AI 分类器
│   ├── route/                # 路由工具
│   │   ├── index.ts
│   │   ├── mapper.ts         # 模型映射器
│   │   └── fallback.ts       # 备用逻辑
│   └── proxy/                # 请求代理工具
│       ├── index.ts
│       ├── provider.ts       # Provider 集成
│       └── key-manager.ts    # Key 管理
│
├── services/                 # 核心服务
│   ├── api/                  # API 服务
│   │   ├── server.ts         # HTTP 服务器
│   │   ├── routes.ts         # 路由定义
│   │   └── middleware/       # 中间件
│   ├── auth/                 # 认证服务
│   ├── billing/              # 计费服务
│   └── storage/              # 存储服务
│
├── security/                 # 安全层
│   ├── parser.ts             # 解析层
│   ├── analyzer.ts           # 分析层
│   ├── decision.ts           # 决策层
│   └── executor.ts           # 执行层
│
├── context/                  # 上下文管理
│   ├── request.ts            # 请求上下文
│   ├── user.ts               # 用户上下文
│   └── permission.ts         # 权限上下文
│
├── schemas/                  # Schema 定义
│   ├── requests.ts           # 请求 Schema
│   ├── responses.ts          # 响应 Schema
│   └── models.ts             # 数据模型
│
├── utils/                    # 工具函数
│   ├── cache.ts              # 缓存工具
│   ├── logger.ts             # 日志工具
│   └── metrics.ts            # 指标收集
│
├── config/                   # 配置管理
│   ├── index.ts              # 配置加载
│   ├── providers.ts          # Provider 配置
│   └── models.ts             # 模型配置
│
└── index.ts                  # 入口文件
```

---

## 3. 工具实现示例

### 3.1 意图分类工具

```typescript
// tools/classify/index.ts
import { z } from 'zod';
import type { Tool, ToolResult, PermissionResult } from '../types';

// 输入 Schema
const ClassifyInputSchema = z.object({
  message: z.string().min(1).max(50000),
  history: z.array(z.string()).max(20).optional(),
  fastMode: z.boolean().default(false),
});

// 输出 Schema
const ClassifyOutputSchema = z.object({
  intent: z.enum([
    'coding', 'analysis', 'creative', 'casual_chat',
    'trading', 'translation', 'long_context', 'reasoning', 'knowledge'
  ]),
  confidence: z.number().min(0).max(1),
  source: z.enum(['rule', 'ai', 'cached']),
  reasoning: z.string().optional(),
});

type ClassifyInput = z.infer<typeof ClassifyInputSchema>;
type ClassifyOutput = z.infer<typeof ClassifyOutputSchema>;

// 工具实现
export const ClassifyTool: Tool<typeof ClassifyInputSchema, ClassifyOutput> = {
  name: 'classify',
  description: 'Classify user intent from message',
  
  inputSchema: ClassifyInputSchema,
  outputSchema: ClassifyOutputSchema,
  
  async call(input: ClassifyInput, context): Promise<ToolResult<ClassifyOutput>> {
    // Layer 1: 规则引擎（零成本）
    const ruleResult = await applyRules(input.message, context);
    if (ruleResult && ruleResult.confidence > 0.9) {
      return {
        data: { ...ruleResult, source: 'rule' },
      };
    }
    
    // Layer 2: AI 分类器
    const aiResult = await classifyWithAI(input.message, input.history, context);
    return {
      data: { ...aiResult, source: 'ai' },
    };
  },
  
  isEnabled(): boolean {
    return true;
  },
  
  isConcurrencySafe(): boolean {
    return true; // 分类操作是只读的，可并发
  },
  
  isReadOnly(): boolean {
    return true;
  },
  
  isDestructive(): boolean {
    return false;
  },
  
  async validateInput(input: ClassifyInput): Promise<ValidationResult> {
    // 额外的业务验证
    if (input.message.length > 50000) {
      return { result: false, message: 'Message too long', code: 400 };
    }
    return { result: true };
  },
};
```

### 3.2 规则引擎

```typescript
// tools/classify/rules.ts
import type { ClassifyOutput } from './index';

interface Rule {
  name: string;
  priority: number;
  condition: (msg: string) => boolean;
  intent: ClassifyOutput['intent'];
  confidence: number;
}

const RULES: Rule[] = [
  {
    name: 'code_block',
    priority: 100,
    condition: (msg) => msg.includes('```') || /\b(def|function|class|import|export)\b/.test(msg),
    intent: 'coding',
    confidence: 0.95,
  },
  {
    name: 'long_context',
    priority: 90,
    condition: (msg) => msg.length > 4000,
    intent: 'long_context',
    confidence: 0.90,
  },
  {
    name: 'chinese_casual',
    priority: 80,
    condition: (msg) => /[\u4e00-\u9fa5]/.test(msg) && msg.length < 500,
    intent: 'casual_chat',
    confidence: 0.80,
  },
  {
    name: 'trading',
    priority: 95,
    condition: (msg) => /\b(BTC|ETH|BTC-USDT|价格|涨跌|交易|持仓)\b/.test(msg),
    intent: 'trading',
    confidence: 0.90,
  },
  {
    name: 'translation',
    priority: 75,
    condition: (msg) => /(翻译|translate|中文译|英文译)/.test(msg),
    intent: 'translation',
    confidence: 0.90,
  },
];

export async function applyRules(
  message: string,
  context: ToolContext
): Promise<Omit<ClassifyOutput, 'source'> | null> {
  // 按优先级排序
  const sortedRules = [...RULES].sort((a, b) => b.priority - a.priority);
  
  for (const rule of sortedRules) {
    if (rule.condition(message)) {
      return {
        intent: rule.intent,
        confidence: rule.confidence,
        reasoning: `Matched rule: ${rule.name}`,
      };
    }
  }
  
  return null; // 无匹配，交给 AI 分类器
}
```

---

## 4. 上下文管理

### 4.1 请求上下文

```typescript
// context/request.ts
import type { UserContext } from './user';
import type { PermissionContext } from './permission';

export interface RequestContext {
  // 请求信息
  requestId: string;
  timestamp: number;
  ip: string;
  userAgent?: string;
  
  // 用户信息
  user: UserContext;
  
  // 权限
  permissions: PermissionContext;
  
  // 缓存
  cache: Cache;
  
  // 配额
  quota: {
    remaining: number;
    limit: number;
    resetAt: number;
  };
  
  // 工具配置
  tools: {
    enabled: string[];
    disabled: string[];
  };
}

// 创建请求上下文
export async function createRequestContext(
  req: Request,
  user: UserContext
): Promise<RequestContext> {
  const permissions = await loadPermissions(user.id);
  const quota = await checkQuota(user.id);
  
  return {
    requestId: crypto.randomUUID(),
    timestamp: Date.now(),
    ip: req.headers.get('x-forwarded-for') || 'unknown',
    userAgent: req.headers.get('user-agent'),
    user,
    permissions,
    cache: new LRUCache({ max: 1000, ttl: 60000 }),
    quota,
    tools: {
      enabled: permissions.allowedTools,
      disabled: permissions.deniedTools,
    },
  };
}
```

### 4.2 权限上下文

```typescript
// context/permission.ts
export interface PermissionContext {
  mode: 'default' | 'bypass' | 'readonly';
  allowedTools: Set<string>;
  deniedTools: Set<string>;
  rateLimits: Map<string, RateLimit>;
}

export interface RateLimit {
  window: number;  // 时间窗口（秒）
  max: number;     // 最大请求数
  current: number; // 当前请求数
}

// 权限检查
export async function checkPermission(
  toolName: string,
  context: PermissionContext
): Promise<PermissionResult> {
  // 黑名单检查
  if (context.deniedTools.has(toolName)) {
    return { behavior: 'deny', message: 'Tool is denied by policy' };
  }
  
  // 白名单检查
  if (context.allowedTools.size > 0 && !context.allowedTools.has(toolName)) {
    return { behavior: 'deny', message: 'Tool is not in allowed list' };
  }
  
  // 速率限制
  const rateLimit = context.rateLimits.get(toolName);
  if (rateLimit && rateLimit.current >= rateLimit.max) {
    return { behavior: 'deny', message: 'Rate limit exceeded' };
  }
  
  return { behavior: 'allow' };
}
```

---

## 5. 工具注册与调用

### 5.1 工具注册中心

```typescript
// tools/registry.ts
import type { Tool } from './types';

class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool ${tool.name} already registered, overwriting`);
    }
    this.tools.set(tool.name, tool);
    
    // 注册别名
    if (tool.aliases) {
      for (const alias of tool.aliases) {
        this.tools.set(alias, tool);
      }
    }
  }
  
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }
  
  getAll(): Tool[] {
    const unique = new Set<Tool>();
    for (const tool of this.tools.values()) {
      unique.add(tool);
    }
    return Array.from(unique);
  }
  
  getEnabled(context: PermissionContext): Tool[] {
    return this.getAll().filter(tool => {
      if (context.deniedTools.has(tool.name)) return false;
      if (context.allowedTools.size > 0 && !context.allowedTools.has(tool.name)) {
        return false;
      }
      return tool.isEnabled();
    });
  }
}

export const toolRegistry = new ToolRegistry();

// 注册内置工具
toolRegistry.register(ClassifyTool);
toolRegistry.register(RouteTool);
toolRegistry.register(ProxyTool);
```

### 5.2 工具调用流程

```typescript
// tools/executor.ts
import { toolRegistry } from './registry';
import type { ToolContext, PermissionResult } from './types';

export async function executeTool(
  toolName: string,
  input: unknown,
  context: ToolContext
): Promise<ToolResult> {
  // 1. 查找工具
  const tool = toolRegistry.get(toolName);
  if (!tool) {
    throw new Error(`Tool not found: ${toolName}`);
  }
  
  // 2. 验证输入 Schema
  const parseResult = tool.inputSchema.safeParse(input);
  if (!parseResult.success) {
    throw new ValidationError(parseResult.error);
  }
  
  const validatedInput = parseResult.data;
  
  // 3. 自定义验证
  if (tool.validateInput) {
    const validation = await tool.validateInput(validatedInput, context);
    if (!validation.result) {
      throw new ValidationError(validation.message, validation.code);
    }
  }
  
  // 4. 权限检查
  if (tool.checkPermissions) {
    const permission = await tool.checkPermissions(validatedInput, context);
    if (permission.behavior === 'deny') {
      throw new PermissionError(permission.message);
    }
    if (permission.behavior === 'ask') {
      // 需要用户确认（交互式场景）
      const confirmed = await askUser(permission.reason);
      if (!confirmed) {
        throw new PermissionError('User denied');
      }
    }
  }
  
  // 5. 执行工具
  try {
    const result = await tool.call(validatedInput, context);
    
    // 6. 记录指标
    metrics.record(toolName, {
      duration: Date.now() - context.startTime,
      success: true,
    });
    
    return result;
  } catch (error) {
    metrics.record(toolName, {
      duration: Date.now() - context.startTime,
      success: false,
      error: error.message,
    });
    throw error;
  }
}
```

---

## 6. 错误处理

### 6.1 结构化错误

```typescript
// utils/errors.ts
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code: number = 400) {
    super(message, 'VALIDATION_ERROR', code);
    this.name = 'ValidationError';
  }
}

export class PermissionError extends AppError {
  constructor(message: string) {
    super(message, 'PERMISSION_DENIED', 403);
    this.name = 'PermissionError';
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429, { retryAfter });
    this.name = 'RateLimitError';
  }
}

export class QuotaExceededError extends AppError {
  constructor() {
    super('Quota exceeded', 'QUOTA_EXCEEDED', 402);
    this.name = 'QuotaExceededError';
  }
}
```

### 6.2 错误处理中间件

```typescript
// api/middleware/error.ts
import type { Context, Next } from 'hono';
import { AppError } from '../../utils/errors';

export async function errorHandler(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    if (error instanceof AppError) {
      return c.json({
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      }, error.statusCode);
    }
    
    // 未知错误
    console.error('Unhandled error:', error);
    return c.json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    }, 500);
  }
}
```

---

## 7. 测试策略

### 7.1 单元测试

```typescript
// tools/classify/__tests__/rules.test.ts
import { describe, it, expect } from 'vitest';
import { applyRules } from '../rules';

describe('Classify Rules', () => {
  it('should detect code blocks', async () => {
    const result = await applyRules('```python\nprint("hello")\n```', mockContext);
    expect(result?.intent).toBe('coding');
    expect(result?.confidence).toBeGreaterThan(0.9);
  });
  
  it('should detect trading keywords', async () => {
    const result = await applyRules('What is BTC price?', mockContext);
    expect(result?.intent).toBe('trading');
  });
  
  it('should return null for ambiguous messages', async () => {
    const result = await applyRules('hello', mockContext);
    expect(result).toBeNull();
  });
});
```

### 7.2 集成测试

```typescript
// __tests__/api/classify.test.ts
import { describe, it, expect } from 'vitest';
import app from '../../src/api/server';

describe('POST /v1/classify', () => {
  it('should classify intent correctly', async () => {
    const res = await app.request('/v1/classify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Write a function to sort array' }),
    });
    
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.intent).toBe('coding');
    expect(data.confidence).toBeGreaterThan(0.8);
  });
});
```

---

## 8. 性能优化

### 8.1 缓存策略

```typescript
// utils/cache.ts
import { LRUCache } from 'lru-cache';

// 意图缓存（相同消息）
export const intentCache = new LRUCache<string, ClassifyOutput>({
  max: 10000,
  ttl: 1000 * 60 * 60, // 1 小时
});

// 用户路由表缓存
export const routingTableCache = new LRUCache<string, RoutingTable>({
  max: 1000,
  ttl: 1000 * 60 * 5, // 5 分钟
});

// 使用缓存
export async function classifyWithCache(
  message: string,
  context: ToolContext
): Promise<ClassifyOutput> {
  const cacheKey = hashMessage(message);
  const cached = intentCache.get(cacheKey);
  if (cached) {
    return { ...cached, source: 'cached' };
  }
  
  const result = await classify(message, context);
  intentCache.set(cacheKey, result);
  return result;
}
```

### 8.2 延迟加载

```typescript
// tools/index.ts
// 避免启动时加载所有工具

// ❌ 错误方式：立即加载
import { HeavyTool } from './heavy-tool';
export const tools = [HeavyTool];

// ✅ 正确方式：延迟加载
export function getTools(): Tool[] {
  const tools: Tool[] = [LightTool];
  
  // 只在需要时加载重型工具
  if (needsHeavyTool()) {
    const { HeavyTool } = require('./heavy-tool');
    tools.push(HeavyTool);
  }
  
  return tools;
}
```

---

## 9. 监控与日志

### 9.1 结构化日志

```typescript
// utils/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// 使用
logger.info({
  event: 'tool_call',
  tool: 'classify',
  duration: 150,
  intent: 'coding',
  confidence: 0.95,
}, 'Tool executed successfully');
```

### 9.2 指标收集

```typescript
// utils/metrics.ts
import { Counter, Histogram, Registry } from 'prom-client';

const register = new Registry();

export const toolCallsTotal = new Counter({
  name: 'tool_calls_total',
  help: 'Total number of tool calls',
  labelNames: ['tool', 'status'],
  registers: [register],
});

export const toolDuration = new Histogram({
  name: 'tool_duration_seconds',
  help: 'Tool execution duration',
  labelNames: ['tool'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

// 使用
export function recordToolCall(tool: string, duration: number, success: boolean) {
  toolCallsTotal.inc({ tool, status: success ? 'success' : 'error' });
  toolDuration.observe({ tool }, duration / 1000);
}
```

---

## 10. 最佳实践总结

| 原则 | 说明 |
|------|------|
| **Schema-first** | 用 Zod 定义 Schema，自动推导类型 |
| **多层防御** | 解析 → 分析 → 决策 → 执行，层层把关 |
| **工具模式** | 统一接口，便于扩展和测试 |
| **上下文隔离** | 每个请求独立的上下文，避免污染 |
| **结构化错误** | 错误码 + 状态码 + 详情，便于调试 |
| **渐进式加载** | 启动快，按需加载重型模块 |
| **缓存策略** | LRU 缓存 + TTL，避免重复计算 |
| **可观测性** | 结构化日志 + Prometheus 指标 |

---

*Development Guide v1.0 - 2026-04-16*
