# Cost-Router (HopLLM) 设计架构评估报告

> 评估时间：2026-08-01
> 评估范围：`clawroute/` 全量代码（Next.js 主流程 + backend/ + lib/ + app/api/）
> 评估基线：commit `b1fbec1`（远端三大新功能 + 本地安全/限流修复整合后）

---

## 一、评估结论摘要

| 维度 | 评分 | 一句话结论 |
|------|------|-----------|
| 系统架构 | ⚠️ C+ | 双实现架构（Next.js + Hono backend）实质为死代码，增加认知负担 |
| 模块划分 | ⚠️ C | lib/ 扁平堆放 33 文件，数据层分散 4 处，缺乏领域边界 |
| 数据流程 | ✅ B | 请求全链路设计完整（认证→限流→分类→预算→缓存→健康→路由），但错误处理全静默 |
| 接口设计 | ⚠️ C+ | 40 路由扁平组织，版本化不一致，dashboard/admin 鉴权分层不统一 |
| 技术选型 | ✅ B+ | 主流栈合理（Next.js14/Postgres/Redis/Zustand），但缺日志/可观测性/并发控制 |
| 可扩展性 | ⚠️ C+ | 静默降级 + 内存缓存无失效，多实例部署会出问题 |
| 可维护性 | ⚠️ C | 双实现 + 三处重复 getSql + 静默 catch，故障不可见 |

**总体可行性**：当前架构能支撑 MVP 与中小流量，但存在 3 个 P0 级设计缺陷（backend 死代码、静默降级掩盖数据丢失、内存缓存跨实例不同步），在规模化或多实例部署时会暴露为生产事故。

---

## 二、系统架构评估

### 2.1 双实现架构现状（核心问题）

项目存在两条并行链路：

- **链路 A（活跃）**：Next.js Route Handler，`app/api/` 下 40 个路由，主流程。`lib/routing/classify.ts`、`lib/routing/providers.ts`、`lib/budget-guard.ts` 等支撑。
- **链路 B（死代码）**：`backend/src/`，34 文件的独立 Hono 服务，含 `api/server.ts`、`tools/classify/`、`tools/route/`、`db/`、`admin/`、`analytics/`、`sync/` 等完整分层。

**死代码判定证据链**：

| 文件 | 行为 | 结论 |
|------|------|------|
| [next.config.mjs](file:///home/tancau/.openclaw/workspace/PROJECTS/cost-router/clawroute/next.config.mjs) L11-15 | `outputFileTracingExcludes` 排除 `./backend/**` | Next.js 不打包 backend |
| [tsconfig.json](file:///home/tancau/.openclaw/workspace/PROJECTS/cost-router/clawroute/tsconfig.json) | exclude backend | TS 不编译 backend |
| [Dockerfile](file:///home/tancau/.openclaw/workspace/PROJECTS/cost-router/clawroute/Dockerfile) L29 | `COPY --from=builder /app/backend ./backend` | 拷贝进镜像 |
| [Dockerfile](file:///home/tancau/.openclaw/workspace/PROJECTS/cost-router/clawroute/Dockerfile) L40 | `CMD ["node", "server.js"]` | **只启动 Next.js standalone，从不启动 backend Hono 服务** |
| [package.json](file:///home/tancau/.openclaw/workspace/PROJECTS/cost-router/clawroute/package.json) | scripts 只有 `next dev/build/start`，无 backend 启动脚本，deps 无 hono | 主项目不构建/不运行 backend |

**结论**：backend/ 在 Docker 镜像里被拷贝但从不启动，是纯死代码。两套 classify / key-manager / db / analytics / admin 实现并存，链路 B 的所有逻辑都被链路 A 重新实现了一遍。

**重复模块对照**：

| 功能 | 链路 A（活跃） | 链路 B（死代码） |
|------|---------------|-----------------|
| 意图分类 | `lib/routing/classify.ts` | `backend/src/tools/classify/` |
| Key 管理 | `lib/routing/key-manager.ts` | `backend/src/tools/proxy/key-manager.ts` |
| 路由逻辑 | `lib/routing/providers.ts` | `backend/src/tools/route/` |
| 数据库 | `lib/db.ts` + `lib/db/` | `backend/src/db/` |
| 分析统计 | `lib/db/usage-tracking.ts` | `backend/src/analytics/` |
| 管理后台 | `app/api/admin/` | `backend/src/admin/` |

### 2.2 部署架构

```
Docker 镜像
├── node server.js (Next.js standalone, :3000)  ← 唯一运行进程
└── backend/ (拷贝但从不启动)                   ← 死代码
```

单进程 Next.js 承载全部职责（前端 + API + 后台 + 同步）。无独立 worker 进程，无 cron scheduler 运行（backend/src/sync/scheduler.ts 是死代码，模型同步依赖手动 `app/api/admin/sync`）。

**架构缺陷**：长耗时任务（模型同步、provider 发现、预算告警 webhook）在 Next.js Route Handler 内同步执行，会阻塞 Vercel/serverless 的请求超时。

---

## 三、模块划分评估

### 3.1 lib/ 结构（33 文件，扁平混杂）

```
lib/
├── auth/index.ts          # 认证 + 用户 + credits + provider keys（God Module）
├── routing/
│   ├── classify.ts        # AI 意图分类
│   ├── providers.ts       # 路由 + 成本计算
│   └── key-manager.ts     # API Key 轮换
├── middleware/
│   ├── api-auth.ts        # API 鉴权
│   ├── admin-auth.ts      # 管理员鉴权
│   └── rate-limit.ts      # 限流
├── db.ts                  # 表工具（request_logs）
├── db/                    # 数据库子模块
│   ├── usage-tracking.ts
│   ├── system-config.ts
│   └── feedback-tables.ts
├── db-tables.ts           # 又一处表定义
├── budget-guard.ts        # 预算守护
├── prompt-cache.ts        # Prompt 缓存
├── provider-health.ts     # Provider 健康度
├── config/index.ts        # 配置
├── encryption.ts          # 加密
├── webhook.ts / email.ts / api.ts / utils.ts / types.ts / ...
└── models/ + i18n/ + config-generator.ts + config-doctor.ts + ...
```

**问题**：
1. **`lib/auth/index.ts` 是 God Module**：单文件承担密码哈希、JWT 签发/验证、用户 CRUD、credits 扣减、provider keys 加解密、Postgres 连接管理 6 类职责，400+ 行。
2. **数据层分散 4 处**：`lib/db.ts`、`lib/db/`（3 文件）、`lib/db-tables.ts`、各模块内联的 `getSql()`（budget-guard/provider-health/prompt-cache 各自实现）。无统一数据访问层。
3. **领域边界模糊**：`budget-guard.ts`、`prompt-cache.ts`、`provider-health.ts` 是核心路由策略，却与 `email.ts`、`export-utils.ts`、`share-config.ts` 等工具同级平铺。

### 3.2 数据访问层重复（3 处独立 getSql）

```typescript
// lib/db.ts L9-18
async function getSql() {
  const { sql } = await import('@vercel/postgres');
  await sql`SELECT 1`;  // 每次调用都测试连接
  return sql;
}

// lib/auth/index.ts getPostgres() — 同样的 SELECT 1 测试
// lib/budget-guard.ts L62-70 getSql() — 第三份相同实现
```

**缺陷**：
- 三处独立实现，连接状态/重试策略不一致（auth 有 30s 重试间隔，db.ts/budget-guard 无）
- 每次调用 `SELECT 1` 测试连接，热点路径（如 chat completions）每次请求多一次往返
- 静默降级（`catch { return null }`）使数据库故障对上层不可见

---

## 四、数据流程评估

### 4.1 请求全链路（chat/completions）

```
POST /api/v1/chat/completions
  │
  ├─ 1. authenticateApiRequest (api-auth.ts)
  │     JWT 或 API Key → AuthResult { userId, tier }
  │
  ├─ 2. checkChatRateLimit (rate-limit.ts)  [tier-aware]
  │     分钟级 TIER_LIMITS + 日级 getDailyLimitByTier
  │
  ├─ 3. classifyIntent (classify.ts)
  │     规则匹配 → 未命中 → classifyWithAI(Ollama) → 降级 casual_chat
  │
  ├─ 4. checkBudgetAndGetModelTier (budget-guard.ts)
  │     getBudgetStatus → modelTier: full/cheap/free
  │
  ├─ 5. findCacheHit (prompt-cache.ts)
  │     命中 → 跳过 provider 调用，calculateCacheAwareCost
  │
  ├─ 6. getHealthyProvider (provider-health.ts)
  │     过滤不健康 provider
  │
  ├─ 7. routeModel (providers.ts)
  │     选模型 + 转发 + 流式响应
  │
  ├─ 8. deductCredits (auth/index.ts)
  │
  └─ 9. logRequest (db.ts) + recordPromptCache
```

**设计优点**：链路完整，职责分步，三大新功能（预算/缓存/健康）各自独立模块，可单独开关。

### 4.2 数据流设计缺陷

**缺陷 1：错误处理全静默（P0）**

贯穿全栈的 `catch {}` 或 `catch { return null }` 模式：

```typescript
// lib/budget-guard.ts L90-92, L122-124, L162-164, L245-247
} catch {
  // 静默处理
}

// lib/db.ts L98-100
} catch {
  // 日志记录失败不应影响主流程
}
```

**影响**：数据库写失败、预算检查异常、缓存记录失败全部静默吞掉。生产环境数据丢失（request_logs 写失败导致预算计算不准、analytics 缺数据）且无任何告警。这是"开发便利"与"生产可靠"的根本冲突。

**缺陷 2：内存缓存无失效（P0）**

```typescript
// lib/budget-guard.ts L58
const budgetCache = new Map<string, BudgetConfig>();  // 永不过期
```

`budgetCache.set` 后无 TTL、无失效逻辑。多实例部署时，实例 A 修改预算，实例 B 仍用旧值，导致用户已提高预算但仍被 block，或已降预算仍可超额。

**缺陷 3：checkBudgetAndGetModelTier 语义误导（P1）**

```typescript
// lib/budget-guard.ts L256-273
export async function checkBudgetAndGetModelTier(userId: string) {
  const status = await getBudgetStatus(userId);
  if (status.status === 'blocked') {
    return { allowed: true, modelTier: 'free', status };  // block 却 allowed: true
  }
  return { allowed: true, modelTier: status.modelTier, status };
}
```

`allowed` 永远是 `true`，"block" 实际是"降级到免费模型"，并非真正阻止。API 契约与实现不符，调用方若依赖 `allowed` 判断会误判。

**缺陷 4：预算计算跨模块隐式依赖（P1）**

`getMonthlySpend` 查询 `request_logs` 表（[lib/budget-guard.ts](file:///home/tancau/.openclaw/workspace/PROJECTS/cost-router/clawroute/lib/budget-guard.ts) L234-248），该表由 `lib/db.ts` 的 `logRequest` 写入。budget-guard 隐式依赖 db.ts 的表结构，但两者无任何契约约束。若 db.ts 改表名/字段，budget-guard 静默返回 0（catch 吞错），预算守卫失效。

---

## 五、接口设计评估

### 5.1 API 路由组织（40 路由）

```
app/api/
├── v1/                    # 仅 chat/completions + health 版本化
│   ├── chat/completions
│   └── health
├── auth/ (login, register, me)
├── dashboard/ (11 个：savings/usage/budget/health/models/intents/stats/recent/top-models)
├── admin/ (5 个：sync/errors/revenue/retention/config)
├── credits/ (deduct, balance)
├── models/ (capabilities, recommend, feedback)
├── user/ (providers, usage)
├── alerts/, webhooks/, export/, notifications/
├── health/, ping/, verify/, discover/, test-completion/
└── public-models/
```

**问题**：
1. **版本化不一致**：仅 `v1/chat/completions` 和 `v1/health` 有版本前缀，其余 38 个路由无版本化。破坏性变更无法平滑迁移。
2. **鉴权分层不统一**：`api-auth.ts` 定义 PUBLIC_API_PATHS 和 OPTIONAL_AUTH_PATHS，但 dashboard/* 和 admin/* 的鉴权分散在各 route 内调用，无统一中间件强制。`admin-auth.ts` 独立存在但 admin 路由需各自接入。
3. **dashboard 路由过多**：11 个 dashboard 路由扁平，应聚合为 `/api/dashboard` 单端点 + 查询参数，或 GraphQL，减少请求往返。

### 5.2 OpenAI 兼容性

`/api/v1/chat/completions` 对外声称 OpenAI 兼容，但实际返回结构、流式格式、错误码需对照 OpenAI 规范审计（本次未深入）。

---

## 六、技术选型评估

### 6.1 合理选型

| 技术 | 用途 | 评价 |
|------|------|------|
| Next.js 14 (App Router) | 全栈 | ✅ 适合，serverless 友好 |
| @vercel/postgres | 数据库 | ✅ 与 Vercel 部署一致 |
| @upstash/redis + ratelimit | 限流 | ✅ 分布式限流正确选择 |
| Zustand | 前端状态 | ✅ 轻量 |
| next-intl | i18n | ✅ 合理 |
| vitest | 测试 | ✅ 现代 |

### 6.2 技术缺口

| 缺口 | 影响 | 严重度 |
|------|------|--------|
| 无日志框架（Pino） | console.log 散落，无 requestId 串联，PII（email）可能入日志 | P1 |
| 无可观测性（metrics） | 无 /api/ready、/api/metrics，无法被 K8s/监控系统集成 | P1 |
| 自定义 JWT（无 jose） | 已修 timingSafeEqual，但自实现缺标准库审计，刷新令牌/吊销需自查 | P2 |
| 无并发控制 | 无令牌桶、无 provider maxConcurrent，突发流量可能打满 provider | P2 |
| 无队列/Worker | 长任务（同步/webhook）在请求线程同步执行 | P2 |

### 6.3 安全配置

[next.config.mjs](file:///home/tancau/.openclaw/workspace/PROJECTS/cost-router/clawroute/next.config.mjs) L23 CSP 含 `script-src 'unsafe-inline' 'unsafe-eval'`——Next.js 运行所需，但削弱 XSS 防护。生产应通过 nonce 收紧。

---

## 七、可扩展性与可维护性评估

### 7.1 可扩展性瓶颈

1. **多实例部署不可行**：内存缓存（budgetCache、memoryRateLimitMap、memoryUsers）无跨实例同步。Redis 配置后限流可分布式，但 budget-guard 的 budgetCache 和 auth 的 memoryUsers 仍是单实例。
2. **数据库连接无池化**：每次 `getSql()` 动态 import + SELECT 1，无连接池复用。高并发下连接开销显著。
3. **无水平扩展抽象**：provider 调用、模型同步、预算告警均假设单实例执行，无分布式锁。

### 7.2 可维护性债务

1. **双实现认知负担**：新人需判断该改 lib/ 还是 backend/（答案永远是 lib/，但 backend/ 的存在制造困惑）。
2. **静默降级掩盖故障**：所有 catch 静默，排查问题无线索，"为什么不工作"只能靠猜。
3. **God Module**：lib/auth/index.ts 承担 6 类职责，任何改动都有连带风险。
4. **无架构文档**：docs/ 仅 1 文件（API_LIMITS_IMPLEMENTATION.md），无 ADR、无模块依赖图。

---

## 八、设计缺陷清单（按严重度）

### P0（阻塞性，规模化前必须解决）

| # | 缺陷 | 位置 | 影响 |
|---|------|------|------|
| P0-1 | backend/ 死代码双实现 | backend/src/ (34文件) | 认知负担 + 维护双倍成本 + 误导 |
| P0-2 | 静默降级掩盖数据丢失 | lib/db.ts, budget-guard.ts, auth/index.ts 全栈 | 生产数据丢失无感知，预算/analytics 失准 |
| P0-3 | 内存缓存无失效/无跨实例同步 | budget-guard.ts budgetCache, auth memoryUsers | 多实例部署数据陈旧，预算守卫失效 |

### P1（重要，影响可靠性与合规）

| # | 缺陷 | 位置 | 影响 |
|---|------|------|------|
| P1-1 | 数据层分散 4 处 + 3 处重复 getSql | lib/db.ts, lib/db/, db-tables.ts, 各模块内联 | 连接管理不一致，性能损耗 |
| P1-2 | 无日志框架/requestId/PII脱敏 | 全栈 console.log | 排查困难，PII 泄露风险 |
| P1-3 | checkBudgetAndGetModelTier 语义误导 | budget-guard.ts L256 | allowed 恒 true，调用方误判 |
| P1-4 | API 版本化不一致 | app/api/ | 破坏性变更无法平滑迁移 |
| P1-5 | 预算计算跨模块隐式依赖 | budget-guard → request_logs | 表结构变更致预算静默失效 |

### P2（改进项，提升健壮性）

| # | 缺陷 | 影响 |
|---|------|------|
| P2-1 | 无可观测性（metrics/ready 端点） | 无法集成监控 |
| P2-2 | 无并发控制（令牌桶/maxConcurrent） | 突发流量打满 provider |
| P2-3 | 自定义 JWT（未换 jose） | 缺标准库审计 |
| P2-4 | 长任务在请求线程同步执行 | serverless 超时 |
| P2-5 | lib/auth/index.ts God Module | 改动连带风险 |
| P2-6 | CSP 含 unsafe-inline/unsafe-eval | XSS 防护削弱 |

---

## 九、优化建议（分阶段路线图）

### 阶段一：止血（1-2 周，消除 P0）

1. **删除 backend/ 死代码**（P0-1）
   - 确认 Dockerfile/CICD 无依赖后，删除 `backend/` 整个目录
   - 清理 next.config.mjs 的 `outputFileTracingExcludes`、tsconfig 的 exclude、Dockerfile L29 的 COPY
   - 统一到链路 A

2. **引入结构化日志 + 失败可见化**（P0-2, P1-2）
   - 引入 Pino，创建 `lib/logger.ts` 统一封装
   - 所有 `catch {}` 改为 `catch (err) { logger.error({ err, ctx }, 'operation failed') }`
   - 注入 requestId（中间件生成，贯穿请求链）
   - PII 脱敏（email/token/key 半掩码）

3. **内存缓存加失效 + Redis 化**（P0-3）
   - budgetCache 加 TTL（如 60s）+ setBudgetConfig 时主动失效
   - memoryUsers 在 Redis 可用时迁移到 Redis
   - 或直接声明：单实例部署，多实例前必须 Redis 化

### 阶段二：分层重构（2-3 周，消除 P1）

4. **统一数据访问层**（P1-1）
   - 创建 `lib/db/client.ts`，单一 getSql + 连接池 + 健康检查
   - lib/db.ts、lib/db/、budget-guard、provider-health、prompt-cache 全部引用统一 client
   - 表定义集中到 `lib/db/schema.ts`

5. **修复 budget-guard 语义**（P1-3, P1-5）
   - checkBudgetAndGetModelTier 的 blocked 真正返回 `allowed: false`（或重命名 API）
   - budget-guard 与 db.ts 的表契约显式化（共享 schema 常量）

6. **API 版本化统一**（P1-4）
   - 所有对外 API 迁移到 `/api/v1/`，内部 dashboard/admin 可保持无版本

### 阶段三：健壮性提升（3-4 周，消除 P2）

7. **可观测性**（P2-1）：`/api/ready`（K8s readiness）、`/api/metrics`（Prometheus 格式）
8. **并发控制**（P2-2）：provider 级 maxConcurrent + 令牌桶（@upstash/ratelimit 已可用）
9. **JWT 换 jose**（P2-3）：标准库替代自实现
10. **长任务异步化**（P2-4）：Vercel Cron + 队列（或 QStash），模型同步/webhook 出请求线程
11. **拆分 God Module**（P2-5）：lib/auth 拆为 auth/jwt.ts、auth/password.ts、users/repository.ts、credits.ts

---

## 十、评估结论

### 可行性判定

当前设计**可行于 MVP 阶段与单实例中小流量**，核心请求链路（认证→限流→分类→预算→缓存→健康→路由→计费）设计完整，三大新功能（预算守护/Prompt缓存/Provider健康度）模块化合理。

### 主要风险

1. **backend 死代码**是历史决策遗留，持续消耗维护成本并制造架构困惑，应尽快清除。
2. **静默降级模式**是最危险的设计习惯——它让开发期便利，却让生产期故障隐形。这是比任何单一 bug 都严重的系统性问题。
3. **内存缓存无失效**在单实例下隐藏，多实例部署时爆发为数据一致性事故。

### 与行业最佳实践差距

- 缺结构化日志、分布式追踪、metrics 端点（可观测性三件套全缺）
- 缺数据访问层抽象（DAO/Repository 模式）
- 缺 ADR（架构决策记录）与模块依赖文档
- 双实现违背"单一真相源"原则

### 建议优先级

**立即执行**：P0-1（删 backend）、P0-2（日志可见化）——这两项投入小、收益大、风险低，且不改变现有功能行为，是性价比最高的起步。
