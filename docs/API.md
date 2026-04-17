# ClawRouter API 文档

## 基础信息

- **Base URL**: `http://localhost:3000/v1`
- **认证方式**: Bearer Token (JWT)

---

## 认证接口

### 用户注册

```
POST /v1/users/register
```

**请求体:**
```json
{
  "email": "user@example.com",
  "password": "your-password",
  "name": "用户名"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "name": "用户名"
    },
    "token": "jwt-token-here"
  }
}
```

### 用户登录

```
POST /v1/users/login
```

**请求体:**
```json
{
  "email": "user@example.com",
  "password": "your-password"
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com"
    },
    "token": "jwt-token-here"
  }
}
```

---

## API Key 管理

### 提交 API Key

```
POST /v1/keys
```

**Headers:**
```
Authorization: Bearer {token}
```

**请求体:**
```json
{
  "provider": "openai",
  "key": "sk-xxxxxxxx",
  "nickname": "我的 OpenAI Key"
}
```

**支持的 Provider:**
- `openai` - OpenAI
- `anthropic` - Anthropic
- `google` - Google AI
- `deepseek` - DeepSeek
- `moonshot` - Moonshot

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "key_123",
    "provider": "openai",
    "nickname": "我的 OpenAI Key",
    "maskedKey": "sk-***xxx",
    "status": "active",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### 查询用户 Keys

```
GET /v1/keys
```

**Headers:**
```
Authorization: Bearer {token}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "keys": [
      {
        "id": "key_123",
        "provider": "openai",
        "nickname": "我的 OpenAI Key",
        "maskedKey": "sk-***xxx",
        "status": "active",
        "usage": {
          "totalRequests": 1000,
          "totalTokens": 50000
        }
      }
    ]
  }
}
```

### 删除 API Key

```
DELETE /v1/keys/:id
```

**Headers:**
```
Authorization: Bearer {token}
```

**响应:**
```json
{
  "success": true,
  "message": "Key deleted successfully"
}
```

---

## 推理接口

### Chat Completions (OpenAI 兼容)

```
POST /v1/chat/completions
```

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**请求体:**
```json
{
  "model": "auto",
  "messages": [
    {
      "role": "user",
      "content": "你好"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 1000
}
```

**模型选择:**
- `auto` - 自动选择最优模型（默认）
- `gpt-4` - OpenAI GPT-4
- `gpt-3.5-turbo` - OpenAI GPT-3.5
- `claude-3-opus` - Anthropic Claude
- `gemini-pro` - Google Gemini

**响应 (流式):**
```
data: {"id":"chat_123","object":"chat.completion.chunk","choices":[{"delta":{"content":"你"},"index":0}]}

data: {"id":"chat_123","object":"chat.completion.chunk","choices":[{"delta":{"content":"好"},"index":0}]}

data: [DONE]
```

---

## 用户统计

### 获取 Dashboard 数据

```
GET /v1/users/:id/dashboard
```

**Headers:**
```
Authorization: Bearer {token}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "overview": {
      "totalRequests": 5000,
      "totalTokens": 250000,
      "totalSavings": 150.00
    },
    "usage": {
      "daily": [
        { "date": "2024-01-01", "requests": 100, "tokens": 5000 }
      ]
    },
    "keys": {
      "total": 3,
      "active": 2
    }
  }
}
```

### 获取收益统计

```
GET /v1/billing/earnings/:userId
```

**Headers:**
```
Authorization: Bearer {token}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "totalEarnings": 25.50,
    "pendingEarnings": 5.00,
    "withdrawn": 20.50,
    "breakdown": {
      "freePool": 2.50,
      "paidPool": 23.00
    },
    "history": [
      {
        "date": "2024-01-01",
        "amount": 5.00,
        "type": "contribution",
        "keyId": "key_123"
      }
    ]
  }
}
```

---

## 错误响应

所有错误响应遵循统一格式：

```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Token expired or invalid"
  }
}
```

**常见错误码:**
- `UNAUTHORIZED` - 未认证
- `INVALID_TOKEN` - Token 无效或过期
- `INVALID_KEY` - API Key 格式错误
- `KEY_VERIFICATION_FAILED` - Key 验证失败
- `RATE_LIMITED` - 请求频率超限
- `INSUFFICIENT_BALANCE` - 余额不足

---

## 速率限制

- 认证接口: 10 次/分钟
- 推理接口: 100 次/分钟
- 其他接口: 60 次/分钟

超出限制返回 HTTP 429。
