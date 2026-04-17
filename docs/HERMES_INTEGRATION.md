# ClawRouter × Hermes Agent 整合计划

> 将 Hermes Agent 的能力整合到 ClawRouter 项目

---

## 1. 背景分析

### Hermes Agent 核心能力

| 能力 | 描述 | 与 ClawRouter 关系 |
|------|------|-------------------|
| **多模型支持** | OpenRouter 200+, OpenAI, Anthropic 等 | ⭐ 直接相关 |
| **自我改进** | 学习循环、技能自我优化 | 🔥 核心价值 |
| **技能系统** | AgentSkills.io 标准，动态创建 | ✅ 可复用 |
| **持久记忆** | Honcho 用户建模，FTS5 搜索 | ✅ 可复用 |
| **多平台** | Telegram, Discord, Slack, WhatsApp, Signal | ✅ 可复用 |
| **调度任务** | Cron 调度，自然语言定义 | ✅ 可扩展 |
| **子代理** | 并行工作流，RPC 调用 | ✅ 已实现 |

### 整合价值

```
ClawRouter (智能路由) + Hermes Agent (自我改进) = 
    ↓
自我改进的智能路由 Agent
    ↓
- 根据使用历史优化路由规则
- 自动创建针对特定用户/场景的技能
- 持久化路由偏好
- 跨平台统一体验
```

---

## 2. 整合架构

### 2.1 三层整合方案

```
┌─────────────────────────────────────────────────────────────┐
│                    Layer 1: Provider 层                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ClawRouter API (Hono)                              │   │
│  │  - 意图分类                                          │   │
│  │  - 模型路由                                          │   │
│  │  - 请求代理                                          │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Layer 2: Agent 层                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Hermes Agent Core                                  │   │
│  │  - 自我改进循环                                      │   │
│  │  - 技能系统                                          │   │
│  │  - 持久记忆                                          │   │
│  │  - 调度任务                                          │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Layer 3: Interface 层                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Telegram │ │ Discord  │ │ WhatsApp │ │   CLI    │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 整合点

| 整合点 | 方式 | 优先级 |
|--------|------|--------|
| **路由插件** | ClawRouter 作为 Hermes 的 Tool | P0 |
| **技能继承** | 复用 AgentSkills.io 标准 | P1 |
| **记忆系统** | 集成 Honcho 用户建模 | P2 |
| **Gateway** | 共享 Hermes Gateway | P2 |

---

## 3. 分阶段实施计划

### Phase 1: 路由插件集成 (Week 1-2)

**目标**：让 Hermes Agent 使用 ClawRouter 的智能路由

```python
# hermes-skills/clawroute-router/SKILL.md

# ClawRoute Router

Intelligent model routing based on user intent.

## Installation
hermes skills install clawroute-router

## Usage
The agent automatically routes requests through ClawRouter when using model="auto".

## Features
- Intent classification (9 types)
- Rule-based routing (10 rules)
- User-provided API keys
- Cost optimization tracking
```

**实施步骤**：

```bash
# 1. 创建 Hermes Skill 目录
mkdir -p ~/projects/clawroute/hermes-skills/clawroute-router

# 2. 创建技能定义
# hermes-skills/clawroute-router/SKILL.md

# 3. 创建技能实现
# hermes-skills/clawroute-router/skill.py

# 4. 连接 ClawRouter Backend
# 通过 HTTP 调用 localhost:3000/v1/classify

# 5. 注册到 Hermes
hermes skills install ./hermes-skills/clawroute-router
```

**关键代码**：

```python
# hermes-skills/clawroute-router/skill.py
import httpx
from hermes import Skill, tool

class ClawRouteRouterSkill(Skill):
    """Intelligent routing skill for Hermes Agent"""
    
    name = "clawroute-router"
    description = "Route LLM requests based on intent classification"
    
    def __init__(self):
        self.router_url = "http://localhost:3000"
    
    @tool
    async def classify_intent(self, message: str) -> dict:
        """Classify user intent from message"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.router_url}/v1/classify",
                json={"message": message}
            )
            return response.json()
    
    @tool
    async def get_model_for_intent(self, intent: str) -> str:
        """Get recommended model for intent"""
        model_mapping = {
            "coding": "qwen/qwen3-coder:free",
            "trading": "qwen/qwen3.6-plus:free",
            "creative": "openai/gpt-4o-mini",
            "casual_chat": "google/gemma-3-12b-it:free",
        }
        return model_mapping.get(intent, "google/gemma-4-31b-it:free")
```

---

### Phase 2: 自我改进集成 (Week 3-4)

**目标**：让 ClawRouter 的路由规则能自我优化

```python
# src/learning/route_learnerner.py

from hermes.memory import HonchoMemory
from hermes.skills import SkillCreator

class RouteLearner:
    """Learn and improve routing rules from usage"""
    
    def __init__(self):
        self.memory = HonchoMemory()
        self.skill_creator = SkillCreator()
    
    async def learn_from_routing(self, 
                                  message: str, 
                                  intent: str, 
                                  model: str,
                                  success: bool,
                                  user_feedback: str = None):
        """Learn from a routing decision"""
        
        # 1. 存储到 Hermes 记忆
        self.memory.store({
            "type": "routing_decision",
            "message": message,
            "intent": intent,
            "model": model,
            "success": success,
            "user_feedback": user_feedback,
            "timestamp": datetime.now()
        })
        
        # 2. 分析模式
        patterns = await self.analyze_patterns()
        
        # 3. 如果发现新规则，创建技能
        if patterns.needs_new_skill:
            skill = await self.skill_creator.create(
                name=f"route-{patterns.intent}",
                description=f"Auto-learned routing for {patterns.intent}",
                rules=patterns.rules
            )
            return skill
        
        return None
    
    async def analyze_patterns(self):
        """Analyze routing history for patterns"""
        history = self.memory.search("routing_decision")
        
        # 分析成功/失败模式
        # 识别用户偏好
        # 提取规则
        
        return patterns
```

---

### Phase 3: 记忆系统集成 (Week 5-6)

**目标**：共享用户画像和偏好

```typescript
// src/integration/hermes-memory.ts

import { HonchoClient } from '@hermes/memory';

export class HermesMemoryBridge {
  private honcho: HonchoClient;
  
  async syncUserProfile(userId: string) {
    // 从 Hermes 获取用户画像
    const profile = await this.honcho.getUserProfile(userId);
    
    // 同步到 ClawRouter
    await this.updateRoutingPreferences(userId, {
      preferredModels: profile.preferences.models,
      routingHistory: profile.routing_decisions,
      costPreference: profile.settings.cost_optimization,
    });
  }
  
  async recordRoutingDecision(userId: string, decision: RoutingDecision) {
    // 双向同步
    await this.honcho.store(userId, decision);
    await this.localMemory.append(userId, decision);
  }
}
```

---

### Phase 4: Gateway 共享 (Week 7-8)

**目标**：统一多平台接入

```yaml
# config/hermes-gateway.yaml

gateway:
  platforms:
    - telegram
    - discord
    - whatsapp
    - signal
  
  router:
    backend: "http://localhost:3000"
    model: "auto"  # 启用 ClawRouter
  
  memory:
    honcho: true
    sync_interval: 300  # 5分钟同步一次
  
  skills:
    - clawroute-router
    - user-preferences
    - cost-tracker
```

---

## 4. 技术实施细节

### 4.1 项目结构调整

```
clawroute/
├── backend/                    # 已有：ClawRouter 核心
│   ├── src/
│   │   ├── tools/
│   │   ├── api/
│   │   └── learning/          # 新增：学习模块
│   │       ├── route_learner.py
│   │       └── pattern_analyzer.py
│   └── package.json
│
├── hermes-skills/              # 新增：Hermes 技能
│   ├── clawroute-router/
│   │   ├── SKILL.md
│   │   ├── skill.py
│   │   └── tests/
│   ├── user-preferences/
│   └── cost-tracker/
│
├── integration/                # 新增：集成层
│   ├── hermes-memory.ts
│   ├── gateway-bridge.ts
│   └── sync-service.ts
│
├── docs/
│   ├── ARCHITECTURE.md        # 已有
│   ├── BUSINESS_MODEL.md      # 已有
│   ├── DEVELOPMENT_GUIDE.md   # 已有
│   └── HERMES_INTEGRATION.md  # 新增
│
└── docker-compose.yml         # 新增：联合部署
```

### 4.2 API 扩展

```typescript
// 新增 API 端点

// 学习反馈
POST /v1/learn/routing
{
  "message": "...",
  "intent": "coding",
  "model": "qwen/qwen3-coder:free",
  "success": true,
  "feedback": "Response was helpful"
}

// 用户偏好
GET  /v1/user/:id/preferences
POST /v1/user/:id/preferences
{
  "preferredModels": {
    "coding": "qwen/qwen3-coder:free",
    "trading": "qwen/qwen3.6-plus:free"
  },
  "costOptimization": true
}

// 路由历史
GET /v1/user/:id/routing-history

// 技能创建
POST /v1/skills/create
{
  "name": "trading-router",
  "patterns": [...]
}
```

### 4.3 Docker 联合部署

```yaml
# docker-compose.yml

version: '3.8'

services:
  clawrouter:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://...
      - HERMES_URL=http://hermes:8000
    depends_on:
      - postgres
      - redis
  
  hermes:
    image: nousresearch/hermes-agent:latest
    ports:
      - "8000:8000"
    environment:
      - CLAWROUTER_URL=http://clawrouter:3000
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
    volumes:
      - ./hermes-skills:/app/skills
      - hermes_data:/app/data
  
  postgres:
    image: postgres:15
    volumes:
      - pg_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7
    volumes:
      - redis_data:/data

volumes:
  pg_data:
  redis_data:
  hermes_data:
```

---

## 5. 成本与收益分析

### 5.1 开发成本

| 阶段 | 时间 | 复杂度 | 依赖 |
|------|------|--------|------|
| Phase 1 | 2周 | 中 | Hermes Skill API |
| Phase 2 | 2周 | 高 | Honcho Memory |
| Phase 3 | 2周 | 中 | 双向同步机制 |
| Phase 4 | 2周 | 低 | Docker 配置 |

**总计**：8周

### 5.2 收益

| 收益 | 描述 |
|------|------|
| **智能路由** | 根据用户历史自动优化 |
| **自我改进** | 路由规则持续优化 |
| **技能生态** | 接入 Hermes Skills Hub |
| **多平台** | 一次开发，多平台可用 |
| **用户画像** | 更精准的个性化路由 |

---

## 6. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| Hermes API 变更 | 高 | 版本锁定 + 适配层 |
| 性能开销 | 中 | 缓存 + 异步处理 |
| 数据同步冲突 | 中 | CRDT + 冲突解决 |
| 学习曲线 | 低 | 文档 + 示例 |

---

## 7. 快速开始（Phase 1 MVP）

```bash
# 1. 安装 Hermes Agent
curl -fsSL https://raw.githubusercontent.com/NousResearch/hermes-agent/main/scripts/install.sh | bash

# 2. 启动 ClawRouter Backend
cd ~/projects/clawroute/backend
npm run dev

# 3. 安装 ClawRouter Skill
hermes skills install ./hermes-skills/clawroute-router

# 4. 配置使用 ClawRouter
hermes config set model auto

# 5. 开始使用
hermes
> 写一个快速排序算法  # 自动路由到 qwen-coder
> BTC 现在多少钱？    # 自动路由到 trading model
```

---

## 8. 下一步行动

### 立即开始（Phase 1）
1. [ ] 安装 Hermes Agent 到开发环境
2. [ ] 创建 `hermes-skills/clawroute-router/` 目录
3. [ ] 实现 Skill 基础结构
4. [ ] 连接 ClawRouter Backend
5. [ ] 测试路由功能

### 本周目标
- 完成 Phase 1 MVP
- 实现基本路由插件
- 验证整合可行性

---

*整合计划 v1.0 - 2026-04-16*
