# ClawRouter 技术架构

> **精细化 AI 成本优化平台** — 根据模型能力 + 用户需求，智能匹配最优方案

---

## 1. 核心定位

### 1.1 我们做什么

```
用户需求 → 能力分析 → 智能匹配 → 最优方案 → 省钱报告
```

### 1.2 核心价值

- **成本优化**：平均节省 80-95%
- **智能匹配**：根据需求自动选择最优模型
- **透明可控**：详细的省钱报告和方案说明

### 1.3 与竞品差异

| 产品 | 路由方式 | 成本优化 | 用户 Key |
|------|----------|----------|---------|
| LiteLLM | 手动指定 | ❌ | ✅ |
| OpenRouter | 手动选择 | ❌ | ❌ |
| **ClawRouter** | **智能匹配** | **✅ 核心** | **✅** |

---

## 2. 系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Application                        │
│                    (OpenClaw / Custom App)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP Request
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Dynamic Router API                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  Rule Engine │  │ AI Classifier│  │ Model Mapper │           │
│  │   (Layer 1)  │  │   (Layer 2)  │  │   (Layer 3)  │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                  │
│                            │                                     │
│                     Intent Result                                │
│                 {intent, confidence, model}                      │
└────────────────────────────┬────────────────────────────────────┘
                             │ Forward Request
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Model Providers                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ OpenAI   │ │ Anthropic│ │ Google   │ │ OpenRouter│            │
│  │ GPT-5.4  │ │ Claude 4 │ │ Gemini   │ │ 500+     │            │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 三层路由机制

| 层级 | 名称 | 延迟 | 成本 | 准确率 | 触发条件 |
|------|------|------|------|--------|----------|
| **Layer 1** | 规则引擎 | 0ms | $0 | 95% | 明确特征（代码、语言、长度） |
| **Layer 2** | AI 分类器 | ~200ms | ~$0.0001 | 98% | 规则无法判断 |
| **Layer 3** | 模型映射 | 0ms | $0 | 100% | 根据意图查表 |

---

## 3. 核心组件设计

### 3.1 Layer 1: 规则引擎 (Rule Engine)

**目标**：零成本、零延迟处理 80%+ 的常见场景

```typescript
interface RuleEngine {
  // 预处理规则
  rules: RoutingRule[];
  
  // 执行规则匹配
  match(message: string, context?: ConversationContext): RuleResult | null;
}

interface RoutingRule {
  name: string;
  priority: number;
  condition: (msg: string, ctx?: Context) => boolean;
  intent: IntentType;
  confidence: number;
}

// 规则示例
const RULES: RoutingRule[] = [
  {
    name: 'code_block',
    priority: 100,
    condition: (msg) => msg.includes('```') || /def |function |class |import /.test(msg),
    intent: 'coding',
    confidence: 0.95
  },
  {
    name: 'long_context',
    priority: 90,
    condition: (msg) => msg.length > 4000,
    intent: 'long_context',
    confidence: 0.90
  },
  {
    name: 'chinese_chat',
    priority: 80,
    condition: (msg) => /[\u4e00-\u9fa5]/.test(msg) && msg.length < 500,
    intent: 'casual_chat',
    confidence: 0.85
  },
  {
    name: 'math_analysis',
    priority: 85,
    condition: (msg) => /计算|分析|统计|数学|公式/.test(msg),
    intent: 'analysis',
    confidence: 0.85
  },
  {
    name: 'translation',
    priority: 75,
    condition: (msg) => /翻译|translate|中文译|英文译/.test(msg),
    intent: 'translation',
    confidence: 0.90
  },
  {
    name: 'creative_writing',
    priority: 70,
    condition: (msg) => /写一篇|创作|故事|小说|文案/.test(msg),
    intent: 'creative',
    confidence: 0.80
  },
  {
    name: 'trading_signal',
    priority: 95,
    condition: (msg) => /BTC|ETH|价格|涨跌|交易|持仓/.test(msg),
    intent: 'trading',
    confidence: 0.90
  }
];
```

### 3.2 Layer 2: AI 分类器 (AI Classifier)

**目标**：处理规则无法判断的复杂/模糊场景

```typescript
interface AIClassifier {
  // 意图分类模型（轻量级）
  model: string;  // qwen-0.5b / gemma-2b
  
  // 分类方法
  classify(message: string, context?: ConversationContext): Promise<ClassificationResult>;
}

interface ClassificationResult {
  intent: IntentType;
  confidence: number;
  reasoning?: string;  // 可选：分类理由
  alternatives?: Array<{intent: IntentType; probability: number}>;
}

// 分类 Prompt 设计
const CLASSIFICATION_PROMPT = `
你是一个意图分类器。分析用户消息，判断用户意图。

消息："{message}"

上下文（最近3条）：
{context}

意图类别：
- coding: 代码编写、调试、重构
- analysis: 数据分析、数学计算
- creative: 创意写作、内容创作
- casual_chat: 日常对话、问答
- trading: 交易信号、市场分析
- translation: 翻译任务
- long_context: 长文本处理
- reasoning: 复杂推理、逻辑分析
- knowledge: 知识查询、信息检索

返回 JSON：
{"intent": "xxx", "confidence": 0.95, "reasoning": "xxx"}
`;
```

### 3.3 Layer 3: 模型映射器 (Model Mapper)

**目标**：根据意图 + 用户配置，选择最优模型

```typescript
interface ModelMapper {
  // 用户配置的路由表
  routingTable: RoutingTable;
  
  // 默认模型映射
  defaultMapping: Record<IntentType, ModelConfig>;
  
  // 选择模型
  selectModel(intent: IntentType, userProfile?: UserProfile): ModelConfig;
}

interface RoutingTable {
  userId?: string;
  scene: SceneType;  // trading_bot, content_creator, etc.
  
  // 意图 → 模型映射（用户可自定义）
  mappings: Record<IntentType, ModelConfig>;
  
  // 成本/性能偏好
  preferences: {
    optimizeFor: 'cost' | 'performance' | 'balanced';
    maxLatency?: number;  // ms
    maxCostPerRequest?: number;  // USD
  };
}

interface ModelConfig {
  provider: 'openai' | 'anthropic' | 'google' | 'openrouter' | 'new-api';
  model: string;
  params?: {
    temperature?: number;
    max_tokens?: number;
  };
}

// 默认映射表
const DEFAULT_ROUTING: Record<IntentType, ModelConfig> = {
  coding: {
    provider: 'openrouter',
    model: 'qwen/qwen3-coder:free',
    params: { temperature: 0.3 }
  },
  analysis: {
    provider: 'openrouter',
    model: 'google/gemma-4-31b-it:free',
    params: { temperature: 0.2 }
  },
  creative: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    params: { temperature: 0.9 }
  },
  casual_chat: {
    provider: 'openrouter',
    model: 'google/gemma-3-12b-it:free',
    params: { temperature: 0.7 }
  },
  trading: {
    provider: 'openrouter',
    model: 'qwen/qwen3.6-plus:free',
    params: { temperature: 0.2 }
  },
  translation: {
    provider: 'openrouter',
    model: 'qwen/qwen3-coder:free',
    params: { temperature: 0.3 }
  },
  long_context: {
    provider: 'google',
    model: 'gemini-2.0-flash',
    params: { temperature: 0.5 }
  },
  reasoning: {
    provider: 'anthropic',
    model: 'claude-3.5-sonnet',
    params: { temperature: 0.5 }
  },
  knowledge: {
    provider: 'openrouter',
    model: 'google/gemma-4-31b-it:free',
    params: { temperature: 0.4 }
  }
};
```

---

## 4. 数据流设计

### 4.1 请求处理流程

```
┌──────────────────────────────────────────────────────────────┐
│ 1. 接收请求                                                   │
│    POST /v1/chat/completions                                 │
│    { messages, user?, stream? }                              │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. 提取上下文                                                 │
│    - 最后一条消息内容                                          │
│    - 最近 N 条消息历史（可选）                                  │
│    - 用户 ID / 会话 ID                                        │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. Layer 1: 规则引擎                                          │
│    for rule in rules (priority desc):                        │
│      if rule.match(message, context):                        │
│        return { intent, confidence, source: 'rule' }         │
│                                                              │
│    → 如果匹配成功 → 跳到步骤 5                                 │
│    → 如果无匹配 → 进入 Layer 2                                 │
└────────────────────────┬─────────────────────────────────────┘
                         │ (无匹配时)
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. Layer 2: AI 分类器                                         │
│    response = await classifier.classify(message, context)    │
│    return { intent, confidence, source: 'ai' }               │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ 5. Layer 3: 模型映射                                          │
│    modelConfig = mapper.selectModel(intent, userProfile)     │
│    → 检查用户自定义路由表                                      │
│    → 应用成本/性能偏好                                         │
│    → 返回模型配置                                              │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ 6. 转发请求                                                   │
│    response = await provider.forward(request, modelConfig)   │
│    → 添加 API Key                                             │
│    → 调整请求参数                                              │
│    → 流式/非流式响应                                           │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ 7. 返回响应                                                   │
│    { ...response, _routing: { intent, model, latency } }     │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 缓存策略

```typescript
interface CacheStrategy {
  // 意图缓存（相同消息内容）
  intentCache: LRUCache<string, ClassificationResult>;
  
  // 用户路由表缓存
  routingTableCache: LRUCache<string, RoutingTable>;
  
  // 模型响应缓存（可选，仅限确定性任务）
  responseCache?: Cache<string, any>;
}

const CACHE_CONFIG = {
  intentCache: {
    maxSize: 10000,
    ttl: 3600  // 1小时
  },
  routingTableCache: {
    maxSize: 1000,
    ttl: 300   // 5分钟
  }
};
```

---

## 5. API 接口设计

### 5.1 核心 API

```typescript
// 主接口：兼容 OpenAI API 格式
POST /v1/chat/completions
{
  "messages": [...],
  "model": "auto",  // 使用 "auto" 启用动态路由
  "user": "user_123",  // 可选：用于加载用户配置
  "stream": true
}

// 响应（非流式）
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "model": "qwen/qwen3-coder:free",  // 实际使用的模型
  "choices": [...],
  "usage": {...},
  "_routing": {  // 路由元信息
    "intent": "coding",
    "confidence": 0.95,
    "source": "rule",
    "latency_ms": 5
  }
}

// 响应（流式）
data: {"id":"chatcmpl-xxx","choices":[{"delta":{"content":"..."}}]}
data: [DONE]
```

### 5.2 配置管理 API

```typescript
// 获取/更新用户路由配置
GET /v1/routing/config
PUT /v1/routing/config
{
  "scene": "trading_bot",
  "mappings": {
    "trading": { "model": "qwen/qwen3.6-plus:free" }
  },
  "preferences": {
    "optimizeFor": "cost"
  }
}

// 获取路由统计
GET /v1/routing/stats
{
  "total_requests": 10000,
  "by_intent": {
    "coding": 3500,
    "casual_chat": 4000,
    "analysis": 2500
  },
  "by_model": {
    "qwen/qwen3-coder": 3500,
    "google/gemma-3-12b": 4000
  },
  "avg_latency_ms": 245,
  "total_cost_saved_usd": 125.50
}
```

---

## 6. 技术选型

### 6.1 后端技术栈

| 组件 | 技术选型 | 理由 |
|------|----------|------|
| **运行时** | Node.js / Bun | 快速开发，与 Next.js 共享代码 |
| **框架** | Hono / Express | 轻量、快速、TypeScript 友好 |
| **分类模型** | Qwen-0.5B / Gemma-2B | 超低延迟、低成本 |
| **缓存** | Redis / 内存 LRU | 快速查询 |
| **配置存储** | SQLite / PostgreSQL | 简单可靠 |

### 6.2 部署架构

```
┌─────────────────────────────────────────┐
│           Vercel / Cloudflare           │
│         (ClawRoute Frontend)            │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│        Dynamic Router Service           │
│   (Docker / VPS / Serverless)           │
│                                         │
│  ┌──────────┐  ┌──────────┐             │
│  │ API      │  │ Classi-  │             │
│  │ Gateway  │  │ fier     │             │
│  └──────────┘  └──────────┘             │
│  ┌──────────┐  ┌──────────┐             │
│  │ Rule     │  │ Model    │             │
│  │ Engine   │  │ Mapper   │             │
│  └──────────┘  └──────────┘             │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│        Model Providers                  │
│  OpenAI / Anthropic / Google /          │
│  OpenRouter / New-API                   │
└─────────────────────────────────────────┘
```

---

## 7. 开发计划

### Phase 1: MVP (Week 1-2)
- [ ] 规则引擎实现
- [ ] 基础模型映射
- [ ] OpenAI 兼容 API
- [ ] 单元测试

### Phase 2: AI 分类器 (Week 3-4)
- [ ] 集成 Qwen-0.5B / Gemma-2B
- [ ] 分类 Prompt 优化
- [ ] 性能基准测试

### Phase 3: 用户配置 (Week 5-6)
- [ ] 路由表存储
- [ ] 配置管理 API
- [ ] ClawRoute UI 集成

### Phase 4: 优化 & 部署 (Week 7-8)
- [ ] 缓存优化
- [ ] 监控 & 日志
- [ ] 生产部署
- [ ] 文档完善

---

## 8. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 分类延迟影响体验 | 高 | 规则引擎优先 + 本地模型 |
| 分类错误选错模型 | 中 | 多轮累积判断 + 回退机制 |
| API Key 泄露 | 高 | 环境变量 + 加密存储 |
| 模型服务不可用 | 中 | 多 Provider 冗余 |
| 成本超预期 | 中 | 监控告警 + 预算限制 |

---

## 9. 成功指标

| 指标 | 目标 |
|------|------|
| 意图识别准确率 | > 95% |
| 路由延迟增加 | < 100ms (P95) |
| 成本节省 | > 50% vs 固定 GPT-4 |
| 用户满意度 | > 90% |
| 系统可用性 | > 99.9% |

---

## 10. 分布式推理架构（Year 2+）

### 10.1 核心工作流

```
┌─────────────────────────────────────────────────────────────┐
│                    用户请求                                  │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│              任务分析器 (Task Analyzer)                      │
│  - 任务类型识别                                              │
│  - 复杂度评估                                                │
│  - 可分解性判断                                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        ↓                             ↓
┌───────────────────┐      ┌──────────────────────┐
│   简单任务         │      │    复杂任务           │
│   直接执行         │      │    任务分解           │
└─────────┬─────────┘      └──────────┬───────────┘
          ↓                           ↓
   ┌──────────────┐         ┌─────────────────────┐
   │ 智能路由      │         │  任务调度器          │
   │ 选最优节点    │         │  分配到多节点        │
   └──────┬───────┘         └──────────┬──────────┘
          ↓                            │
    ┌───────────┐           ┌──────────┼──────────┐
    │ 执行结果   │           ↓          ↓          ↓
    └─────┬─────┘      ┌────────┐ ┌────────┐ ┌────────┐
          │            │节点 A  │ │节点 B  │ │节点 C  │
          │            │子任务1 │ │子任务2 │ │子任务3 │
          │            └────┬───┘ └────┬───┘ └────┬───┘
          │                 │          │          │
          │                 └──────────┼──────────┘
          │                            ↓
          │                 ┌──────────────────┐
          │                 │  结果聚合器       │
          │                 │  合并子任务结果   │
          │                 └────────┬─────────┘
          │                          │
          └──────────────────────────┤
                                     ↓
                     ┌────────────────────────────┐
                     │   高级别验证节点            │
                     │   - 质量检查                │
                     │   - 一致性验证              │
                     │   - 结果修正（如需要）      │
                     └──────────────┬─────────────┘
                                    ↓
                         ┌─────────────────┐
                         │  最终结果       │
                         └─────────────────┘
```

### 10.2 双重资源池

```typescript
interface ResourcePool {
  // API Key 池（云端资源）
  apiKeyPool: {
    keys: SharedKey[];
    providers: Provider[];
    priority: 'immediate';  // 即时接入
    costModel: 'usage-based';
  };
  
  // 算力池（本地资源，Year 2+）
  computePool: {
    nodes: ComputeNode[];
    models: LocalModel[];
    priority: 'optimized';  // 深度优化
    costModel: 'contribution-based';
  };
}

// 智能路由决策
function selectResource(request: Request): Resource {
  const analysis = analyzeTask(request);
  
  if (analysis.complexity === 'simple') {
    // 简单任务：优先本地算力
    return computePool.getAvailableNode(analysis.requirements);
  } else if (analysis.complexity === 'complex') {
    // 复杂任务：分解 + 混合使用
    return {
      strategy: 'hybrid',
      computeNodes: selectComputeNodes(analysis.subTasks),
      apiKeys: selectApiKeys(analysis.validationNeeds),
    };
  } else {
    // 默认：API Key 池
    return apiKeyPool.getBestKey(analysis);
  }
}
```

### 10.3 任务分解策略

```typescript
const DECOMPOSITION_STRATEGIES = {
  // 数据并行：按数据分片
  'data_parallel': {
    applies: ['multi_document', 'batch_processing'],
    method: 'split_by_data',
    example: '10份文档 → 10个节点并行分析',
  },
  
  // 功能并行：按功能模块
  'functional_parallel': {
    applies: ['complex_pipeline'],
    method: 'split_by_function',
    example: '分析→计算→总结 → 3个阶段',
  },
  
  // 推测解码：小模型生成 + 大模型验证
  'speculative': {
    applies: ['generation_tasks'],
    method: 'draft_and_verify',
    example: 'Qwen-7B生成 → GPT-4验证',
    advantage: '速度快 + 成本低',
  },
  
  // 流水线：按阶段切分
  'pipeline': {
    applies: ['multi_stage'],
    method: 'split_by_stage',
    example: '预处理→推理→后处理',
  },
};
```

### 10.4 结果验证机制

```typescript
class ResultValidator {
  // 验证策略选择
  selectStrategy(result: AggregatedResult): ValidationStrategy {
    const factors = {
      confidence: result.confidence,
      importance: result.taskImportance,
      budget: result.budget,
    };
    
    // 低置信度 → 完整验证
    if (factors.confidence < 0.7) {
      return {
        type: 'full_validation',
        node: 'best_validator', // Claude-3.5 / GPT-4
        cost: 'high',
      };
    }
    
    // 高置信度 + 低预算 → 抽样验证
    if (factors.budget === 'low' && factors.confidence > 0.9) {
      return {
        type: 'sampling_validation',
        sampleRate: 0.2,  // 抽样 20%
        node: 'medium_validator',
        cost: 'low',
      };
    }
    
    // 默认：困惑度验证（无需额外推理）
    return {
      type: 'perplexity_validation',
      threshold: 10,
      cost: 'free',
    };
  }
  
  // 多节点结果不一致处理
  handleDisagreement(results: Result[]): Result {
    // 方法 1：投票机制
    const voted = this.voting(results);
    
    // 方法 2：置信度加权
    const weighted = this.weightedAverage(results);
    
    // 方法 3：转高级节点仲裁
    const arbitrated = this.arbitrate(results);
    
    return arbitrated;
  }
}
```

### 10.5 实施路线

| 阶段 | 功能 | 时间 |
|------|------|------|
| **Phase 1** | 请求级路由 + API Key 池 | ✅ 已完成 |
| **Phase 2** | 任务分解 + 并行执行 | Year 1 Q2 |
| **Phase 3** | 推测解码 + 结果聚合 | Year 2 Q1 |
| **Phase 4** | 本地算力接入 + 双重资源池 | Year 2 Q2 |
| **Phase 5** | 自适应优化 + 智能验证 | Year 2 Q3 |

---

*Architecture v2.0 - 2026-04-17 - 分布式推理架构*
