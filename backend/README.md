# ClawRouter Backend

Dynamic intelligent routing middleware for LLM APIs.

## 🎯 Features

- **Intent Classification**: Rule-based + AI-powered intent detection
- **Model Routing**: Intelligent model selection based on intent & constraints
- **Request Proxy**: Multi-provider request forwarding with key management
- **Three-Layer Routing**: Rules → AI Classifier → Model Mapper
- **OpenAI Compatible**: Drop-in replacement for OpenAI API
- **Schema-First Design**: Type-safe with Zod validation
- **Tool Pattern**: Unified interface for extensibility

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   └── providers.ts       # Provider & model configurations
│   ├── tools/                 # Tool definitions
│   │   ├── types.ts           # Tool interface
│   │   ├── registry.ts        # Tool registry
│   │   ├── classify/          # Intent classification
│   │   │   ├── index.ts       # ClassifyTool
│   │   │   └── rules.ts       # Rule engine (10 rules)
│   │   ├── route/             # Model routing
│   │   │   └── index.ts       # RouteTool
│   │   └── proxy/             # Request proxy
│   │       ├── index.ts       # ProxyTool
│   │       └── key-manager.ts # API Key management
│   ├── api/
│   │   └── server.ts          # HTTP server (Hono)
│   ├── __tests__/             # Integration tests
│   ├── index.ts               # Main exports
│   └── start.ts               # Server entry
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Type check
npm run typecheck
```

## 📡 API Endpoints

### Health Check
```
GET /health
```

### Tool List
```
GET /v1/tools
```

### Intent Classification
```
POST /v1/classify
{
  "message": "写一个快速排序算法",
  "history": ["可选：历史消息"],
  "fastMode": false
}
```

### Model Routing
```
POST /v1/route
{
  "intent": "coding",
  "message": "写一个快速排序算法",
  "constraints": {
    "maxLatency": 1000,
    "preferredProvider": "anthropic"
  }
}
```

### OpenAI Compatible Chat
```
POST /v1/chat/completions
{
  "model": "auto",  // 或指定模型如 "gpt-4o"
  "messages": [
    { "role": "user", "content": "Hello" }
  ]
}
```

Response includes routing metadata:
```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "model": "claude-3-5-sonnet-20241022",
  "choices": [...],
  "usage": {...},
  "_routing": {
    "intent": "coding",
    "model": "claude-3-5-sonnet-20241022",
    "provider": "anthropic",
    "reason": "high quality, intent: coding",
    "alternatives": [...]
  }
}
```

## 🧩 Intent Types

| Intent | Description | Example |
|--------|-------------|---------|
| `coding` | Code writing/debugging | "写一个排序函数" |
| `trading` | Trading signals | "BTC 现在多少钱" |
| `analysis` | Data analysis | "计算这些数据的平均值" |
| `translation` | Translation tasks | "翻译成英文" |
| `creative` | Creative writing | "写一篇科幻小说" |
| `casual_chat` | Daily conversation | "你好" |
| `long_context` | Long text processing | >4000 chars |
| `reasoning` | Complex reasoning | "分析这个论点" |
| `knowledge` | Knowledge queries | "什么是量子计算" |

## 🔧 Development

### Environment Variables

```bash
# Provider API Keys (comma-separated for multiple keys)
OPENAI_API_KEY=sk-xxx,sk-yyy
ANTHROPIC_API_KEY=sk-ant-xxx
DEEPSEEK_API_KEY=sk-xxx
QWEN_API_KEY=sk-xxx
LITELLM_API_KEY=sk-xxx

# Server Configuration
PORT=3000
```

### Adding a New Provider

```typescript
// src/config/providers.ts
providers.push({
  name: 'new-provider',
  baseUrl: 'https://api.new-provider.com/v1',
  apiKeyEnv: 'NEW_PROVIDER_API_KEY',
  models: ['model-1', 'model-2'],
  rateLimit: { rpm: 60 },
  timeout: 30000,
  priority: 70,
  enabled: true,
});

modelCapabilities.push({
  model: 'model-1',
  provider: 'new-provider',
  intents: ['coding', 'analysis'],
  contextWindow: 32000,
  inputCost: 1.0,
  outputCost: 2.0,
  avgLatency: 500,
  qualityScore: 0.85,
});
```

```typescript
// src/tools/my-tool/index.ts
import { z } from 'zod';
import type { Tool } from '../types';

const MyToolInputSchema = z.object({
  // define input schema
});

export const MyTool: Tool<typeof MyToolInputSchema> = {
  name: 'my-tool',
  description: 'My custom tool',
  inputSchema: MyToolInputSchema,
  
  async call(input, context) {
    // implement tool logic
    return { data: result };
  },
  
  isEnabled: () => true,
  isConcurrencySafe: () => true,
  isReadOnly: () => true,
};

// Register in src/tools/registry.ts
toolRegistry.register(MyTool);
```

### Adding a New Rule

```typescript
// src/tools/classify/rules.ts
{
  name: 'my_rule',
  priority: 85,
  condition: (msg) => /pattern/.test(msg),
  intent: 'my_intent',
  confidence: 0.85,
}
```

## 📊 Test Coverage

```
 ✓ src/tools/classify/rules.test.ts  (10 tests)
 ✓ src/tools/classify/index.test.ts  (11 tests)
 ✓ src/__tests__/api.test.ts          (8 tests)

 Test Files  3 passed
 Tests       29 passed
```

## 🔒 Security

- Schema validation with Zod
- Input sanitization
- Rate limiting ready
- CORS support
- Secure headers

## 📝 License

MIT
