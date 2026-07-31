# 开发指南

> 配套文档：[DESIGN_EVALUATION.md](./DESIGN_EVALUATION.md)（架构评估）、[REFACTOR_PLAN.md](./REFACTOR_PLAN.md)（重构方案）

## 一、架构分层

```
接入层  app/api/**/route.ts        → HTTP 入口，调用领域层
领域层  lib/routing | budget |     → 业务逻辑
        cache | health | auth
基础设施 lib/db/client | lib/logger → 数据访问、日志（横切）
```

依赖单向向下：接入层 → 领域层 → 基础设施层。logger 横切所有层。

## 二、日志（lib/logger.ts）

### 2.1 基本用法

```typescript
import { getRequestLogger, redactEmail } from '@/lib/logger';

export async function POST(req: Request) {
  const log = getRequestLogger(); // 自动带 requestId（若在请求上下文）
  log.info({ userId: 'u123' }, 'login success');
  log.warn({ email: redactEmail('user@example.com') }, 'suspicious login');
  log.error({ err }, 'db write failed');
}
```

### 2.2 requestId 串联

用 `withRequestId` 包裹 Route Handler，自动从 `x-request-id` header 读取或生成：

```typescript
import { withRequestId } from '@/lib/logger';

export const POST = withRequestId(async (req: NextRequest) => {
  const log = getRequestLogger(); // 已绑定 requestId
  // ...
});
```

非请求上下文（如定时任务）用 `runWithRequestId`：

```typescript
import { runWithRequestId } from '@/lib/logger';
await runWithRequestId('cron-sync', async () => {
  getRequestLogger().info('sync started');
});
```

### 2.3 PII 脱敏

| 函数 | 输入 | 输出 |
|------|------|------|
| `redactEmail` | user@example.com | u***@example.com |
| `redactToken` | hl-abcd1234efgh5678 | hl-****5678 |

logger 默认 redact `password/apiKey/token/secret` 等字段（输出 `[REDACTED]`），无需手动处理。

### 2.4 错误处理约定

**禁止** `catch {}` 静默吞错。改为：

```typescript
try {
  await db`...`;
} catch (err) {
  logger.error({ err, userId }, 'operation failed');
  // 按需：return null 降级，或 throw 上抛
}
```

## 三、数据访问（lib/db/client.ts）

### 3.1 获取连接

```typescript
import { getDb } from '@/lib/db/client';

const db = await getDb();
if (!db) {
  // 数据库不可用（开发环境降级，生产视调用方策略）
  return null;
}
const result = await db`SELECT * FROM users WHERE id = ${userId}`;
```

**不要**在新代码里写本地 `getSql()`/`getPostgres()`——统一用 `getDb()`。

### 3.2 表名常量

```typescript
import { SCHEMA } from '@/lib/db/client';
await db`SELECT * FROM ${SCHEMA.TABLES.REQUEST_LOGS} WHERE ...`;
```

集中管理表名，避免跨模块隐式依赖（见评估 P1-5）。

### 3.3 健康检查

```typescript
import { isDbHealthy, isDbConnected } from '@/lib/db/client';
const healthy = await isDbHealthy();  // 异步，强制探测
const connected = isDbConnected();     // 同步，查缓存状态
```

### 3.4 fail-fast 策略

`getDb()` 始终返回 `null | DbClient`，不抛错。是否 fail-fast 由调用方决定：
- **auth 模块**：生产环境 null 时抛错（拒绝降级到内存，防丢数据）
- **budget-guard / db.logRequest**：null 时降级 + log（不阻断主流程）

## 四、本地开发

```bash
pnpm install
pnpm dev        # 开发，pino-pretty 彩色输出
pnpm lint
pnpm test       # vitest
pnpm build      # 生产构建（限制内存：NODE_OPTIONS=--max-old-space-size=1536）
```

日志级别：`LOG_LEVEL=debug pnpm dev`

## 五、提交规范

- `feat:` 新功能 / `fix:` 修复 / `refactor:` 重构 / `docs:` 文档 / `ci:` CI
- 提交信息说明"为什么"而非仅"是什么"
- 每个逻辑变更独立提交，便于回溯
