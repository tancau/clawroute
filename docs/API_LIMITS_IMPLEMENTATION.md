# HopLLM API 防滥用措施实现

## 实现概述

本次实现为 HopLLM API 添加了完整的防滥用措施，包括：

1. **速率限制中间件** - 基于 Upstash Redis 的分布式速率限制
2. **每日调用限制** - 数据库支持的使用追踪
3. **注册防护** - Cloudflare Turnstile + IP 速率限制
4. **使用统计 API** - 用户查询自己的使用情况

## 文件变更

### 新增文件

| 文件 | 说明 |
|------|------|
| `lib/middleware/rate-limit.ts` | 速率限制中间件，支持 Upstash Redis 和内存回退 |
| `lib/db/usage-tracking.ts` | 用户使用追踪，每日/每月限制检查 |
| `app/api/user/usage/route.ts` | 使用统计 API 端点 |

### 修改文件

| 文件 | 变更 |
|------|------|
| `app/api/v1/chat/completions/route.ts` | 集成速率限制和使用追踪 |
| `app/api/auth/register/route.ts` | 添加 Turnstile 验证和 IP 速率限制 |
| `.env.example` | 添加 Upstash Redis 和 Turnstile 配置 |
| `package.json` | 添加 @upstash/redis 和 @upstash/ratelimit |

## 功能详情

### 1. 速率限制中间件

**文件**: `lib/middleware/rate-limit.ts`

**功能**:
- 基于 Tier 的速率限制
- 支持 Upstash Redis（生产环境）
- 内存回退（开发环境）
- 滑动窗口算法

**Tier 限制**:
| Tier | 限制 |
|------|------|
| Free | 20 次/分钟 |
| Pro | 100 次/分钟 |
| Team | 500 次/分钟 |
| Enterprise | 2000 次/分钟 |

**使用方法**:
```typescript
import { checkRateLimit } from '@/lib/middleware/rate-limit';

const result = await checkRateLimit(userId, 'free');
if (!result.success) {
  return Response.json({ error: 'Rate limited' }, { status: 429 });
}
```

### 2. 每日调用限制

**文件**: `lib/db/usage-tracking.ts`

**功能**:
- 每日/每月调用计数
- Tier-based 限制
- 使用统计查询
- 历史记录查询

**Tier 限制**:
| Tier | 每日限制 | 每月限制 |
|------|----------|----------|
| Free | 100 次 | 2,000 次 |
| Pro | 1,000 次 | 25,000 次 |
| Team | 5,000 次 | 150,000 次 |
| Enterprise | 无限制 | 无限制 |

**数据库表**:
```sql
CREATE TABLE user_usage (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date DATE NOT NULL,
  api_calls INTEGER DEFAULT 0,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  last_call TIMESTAMP,
  UNIQUE(user_id, date)
);
```

### 3. 注册防护

**文件**: `app/api/auth/register/route.ts`

**功能**:
- Cloudflare Turnstile 验证（人机验证）
- IP 速率限制（每小时 5 次）
- 输入验证增强

**Turnstile 配置**:
```env
TURNSTILE_SECRET_KEY=xxx
TURNSTILE_SITE_KEY=xxx
```

**IP 速率限制**:
- 同一 IP 每小时最多 5 次注册尝试
- 内存存储（轻量级，适合 Vercel Serverless）

### 4. 使用统计 API

**端点**: `GET /api/user/usage`

**响应示例**:
```json
{
  "tier": "free",
  "limits": {
    "daily": 100,
    "monthly": 2000
  },
  "today": {
    "calls": 45,
    "limit": 100,
    "remaining": 55
  },
  "month": {
    "calls": 1234,
    "limit": 2000,
    "remaining": 766
  },
  "rateLimit": {
    "limit": 20,
    "remaining": 15,
    "resetIn": 30,
    "window": "60s"
  }
}
```

**查询参数**:
- `history=true` - 返回历史记录
- `days=30` - 历史记录天数

## 环境变量配置

### 必需（生产环境）

```env
# Upstash Redis（用于速率限制）
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Cloudflare Turnstile（用于注册防护）
TURNSTILE_SECRET_KEY=xxx
TURNSTILE_SITE_KEY=xxx
```

### 可选

```env
# 允许无认证访问（开发模式）
ALLOW_NO_AUTH=true
```

## 错误响应格式

### 速率限制
```json
{
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Try again in 30s",
    "retry_after": 30,
    "remaining": 0
  }
}
```

### 每日限制
```json
{
  "error": {
    "code": "DAILY_LIMIT_EXCEEDED",
    "message": "Daily API call limit exceeded. Upgrade to Pro for more calls.",
    "usage": 100,
    "limit": 100
  }
}
```

### 每月限制
```json
{
  "error": {
    "code": "MONTHLY_LIMIT_EXCEEDED",
    "message": "Monthly API call limit exceeded. Upgrade to a higher tier.",
    "usage": 2000,
    "limit": 2000
  }
}
```

## 测试

运行测试：
```bash
npm test -- __tests__/api-limits.test.ts
```

## 部署说明

1. **安装依赖**:
   ```bash
   pnpm add @upstash/redis @upstash/ratelimit
   ```

2. **配置环境变量**:
   - 创建 Upstash Redis 实例: https://upstash.com
   - 创建 Cloudflare Turnstile: https://dash.cloudflare.com/?to=/:account/turnstile

3. **部署到 Vercel**:
   ```bash
   vercel --prod
   ```

## 免费方案说明

### Upstash Redis
- 免费额度: 10,000 请求/天
- 足够支持小型应用
- 自动扩容

### Cloudflare Turnstile
- 完全免费
- 无限制验证次数
- 隐私友好

## 监控建议

1. **Redis 监控**: Upstash 控制台查看请求量
2. **错误追踪**: 查看日志中的 `RATE_LIMITED` 错误
3. **使用统计**: 定期查询 `user_usage` 表

## 后续改进建议

1. **IP 黑名单**: 添加恶意 IP 黑名单功能
2. **异常检测**: 检测异常使用模式
3. **Webhook 通知**: 当用户接近限制时发送通知
4. **管理面板**: 添加管理员查看/重置用户使用量的界面

---

**实现日期**: 2026-04-21
**版本**: v1.0.0
