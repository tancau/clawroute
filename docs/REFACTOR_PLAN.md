# 架构重构变更设计方案

> 基线：[DESIGN_EVALUATION.md](./DESIGN_EVALUATION.md)
> 范围：阶段一止血（P0）+ 关键 P1
> 原则：小步前进、行为不变、每步可验证

---

## 一、重构目标

1. **消除双实现**：删除 backend/ 死代码，单一真相源
2. **失败可见化**：结构化日志 + requestId 串联 + PII 脱敏，取代静默 catch
3. **统一数据访问**：单一 db client，消除 3 处重复 getSql
4. **缓存可失效**：budgetCache 加 TTL，避免多实例陈旧
5. **语义正确**：budget-guard allowed 反映真实拦截意图

---

## 二、目标架构图

### 2.1 重构前（双实现）

```
┌─────────────────────────────────────────┐
│  Docker 镜像                            │
│  ┌────────────────────────────────┐     │
│  │ Next.js standalone (:3000)     │     │
│  │  app/api/* (40 路由)           │     │
│  │  lib/ (33 文件, 扁平)          │     │
│  │   ├ getSql() ×3 重复           │     │
│  │   ├ budgetCache (无失效)       │     │
│  │   └ catch {} 静默              │     │
│  └────────────────────────────────┘     │
│  ┌────────────────────────────────┐     │
│  │ backend/ (34 文件, 从不启动)   │ ←死代码
│  │  Hono + 重复 classify/db/admin │     │
│  └────────────────────────────────┘     │
└─────────────────────────────────────────┘
```

### 2.2 重构后（单一链路 + 分层）

```
┌──────────────────────────────────────────────────┐
│  Next.js standalone (:3000)                      │
│                                                  │
│  ┌──────────────────────────────────────────┐    │
│  │ 接入层  app/api/* (Route Handler)        │    │
│  │  middleware: requestId 注入 → auth → rate│    │
│  └───────────────┬──────────────────────────┘    │
│                  │                                │
│  ┌───────────────▼──────────────────────────┐    │
│  │ 领域层  lib/routing | budget | cache     │    │
│  │         | health | auth | credits        │    │
│  └──────┬────────────────────┬──────────────┘    │
│         │                    │                   │
│  ┌──────▼──────┐    ┌────────▼─────────┐         │
│  │ 基础设施层  │    │  可观测性         │         │
│  │ lib/db/     │    │  lib/logger.ts    │         │
│  │  client.ts  │    │  (Pino+requestId  │         │
│  │  (单一连接) │    │   +PII脱敏)       │         │
│  └─────────────┘    └──────────────────┘         │
└──────────────────────────────────────────────────┘
```

分层规则：接入层 → 领域层 → 基础设施层。依赖单向向下。logger 横切所有层。

---

## 三、模块间接口定义

### 3.1 lib/logger.ts（新增）

```typescript
import pino from 'pino';

// 单例 logger，带默认 context
export const logger: pino.Logger;

// PII 脱敏工具
export function redactEmail(email: string): string;   // u***@example.com
export function redactToken(token: string): string;    // hl-xxxx****

// 请求级子 logger（绑定 requestId）
export function createRequestLogger(requestId: string, ctx?: object): pino.Logger;

// 中间件：从 header 读或生成 requestId，注入 AsyncLocalStorage
export function withRequestId<T>(handler: T): T;
export function getRequestLogger(): pino.Logger; // 从 AsyncLocalStorage 取
```

### 3.2 lib/db/client.ts（新增，统一数据访问）

```typescript
// 单一连接入口，取代散落的 getSql()
export async function getDb(): Promise<SqlClient | null>;

// 健康检查（供 /api/health/db）
export async function isDbHealthy(): Promise<boolean>;

// 表 schema 集中定义（取代 db.ts + db-tables.ts 分散定义）
export const SCHEMA = {
  REQUEST_LOGS: 'request_logs',
  USERS: 'users',
  USER_BUDGETS: 'user_budgets',
  // ...
} as const;
```

迁移：lib/db.ts、lib/auth/index.ts、lib/budget-guard.ts、lib/provider-health.ts、lib/prompt-cache.ts 的内联 `getSql()` 全部改为 `import { getDb } from '@/lib/db/client'`。

### 3.3 lib/budget-guard.ts（改造）

```typescript
// 缓存条目加过期时间
interface CacheEntry { config: BudgetConfig; expiresAt: number; }
const CACHE_TTL_MS = 60_000; // 60s

// 语义修复：blocked 真正拦截
export async function checkBudgetAndGetModelTier(userId: string): Promise<{
  allowed: boolean;          // blocked 时 false
  modelTier: 'full'|'cheap'|'free';
  status: BudgetStatus;
}>;
```

---

## 四、数据流程图（重构后）

### 4.1 请求主链路（含日志与数据访问）

```
POST /api/v1/chat/completions
  │
  │  [middleware] 生成 requestId → AsyncLocalStorage
  │
  ├─ 1. authenticateApiRequest ─── logger.info({userId, requestId}, 'auth ok')
  │      └ lib/auth → getDb() ─── 统一连接
  │
  ├─ 2. checkChatRateLimit ─────── logger.warn(超限时)
  │      └ Upstash Redis
  │
  ├─ 3. classifyIntent ─────────── logger.debug({intent, source})
  │      └ 规则 → classifyWithAI(Ollama)
  │
  ├─ 4. checkBudgetAndGetModelTier ─ logger.warn({usagePercent}, 'budget downgrade')
  │      └ getDb() → request_logs 求和
  │         (budgetCache TTL 60s)
  │
  ├─ 5. findCacheHit ───────────── logger.info({cacheHit}, 'cache hit')
  ├─ 6. getHealthyProvider ─────── logger.debug({provider, health})
  ├─ 7. routeModel + 转发 ─────── logger.info({model, provider, latency})
  ├─ 8. deductCredits ─────────── getDb()
  └─ 9. logRequest ─────────────── getDb() → request_logs
                                 └ catch (err) → logger.error({err, requestId}, 'logRequest failed')
                                    (不再静默吞掉)

错误路径：任何 catch → logger.error({err, requestId, ctx}) → 适当 HTTP 响应
```

### 4.2 关键变化点

| 环节 | 重构前 | 重构后 |
|------|--------|--------|
| 数据库连接 | 3 处 getSql 各自 SELECT 1 | 单一 getDb()，复用连接 |
| 错误处理 | catch {} 静默 | catch(err) { logger.error(...) } |
| 日志 | console.log 散落 | Pino 结构化 + requestId 串联 |
| PII | email 明文入日志 | redactEmail 半掩码 |
| budget 缓存 | 永不过期 | TTL 60s |
| budget allowed | 恒 true | blocked 时 false |

---

## 五、实施顺序与验证

| 步骤 | 内容 | 验证 |
|------|------|------|
| 1 | 删 backend/ + 清理 next.config/tsconfig/Dockerfile | tsc + build 通过 |
| 2 | 新增 lib/logger.ts + 装 pino | tsc 通过 |
| 3 | 新增 lib/db/client.ts | tsc 通过 |
| 4 | 迁移各模块 getSql → getDb | tsc + 现有测试 |
| 5 | 改造关键 catch → logger | tsc + lint |
| 6 | budget-guard TTL + 语义修复 | 单元测试 |
| 7 | 全量 tsc + lint + vitest | 全绿 |
| 8 | 提交 + 推送 | CI 绿 |

每步独立提交，行为可回溯。

---

## 六、风险与回滚

- **行为变更风险**：budget allowed 语义变化可能影响调用方。需审查 chat/completions route 对 allowed 的使用。
- **回滚**：每步独立提交，可 `git revert` 单步。
- **不引入新依赖风险**：仅新增 pino（成熟稳定）。其余为内部重构。
