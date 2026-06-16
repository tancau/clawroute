# 🚀 HopLLM (智跳)

> 智能 LLM 路由代理 — 节省 40-80% 的 API 费用，自动选择最优模型。

[English](./README.md) | 简体中文

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/tancau/hopllm?style=flat-square)](https://github.com/tancau/hopllm)

**在线体验**：[https://hopllm.com](https://hopllm.com)

---

## 🎯 HopLLM 是什么？

HopLLM 是一个**智能 LLM 路由代理**，自动为每个请求选择最佳 AI 模型：

1. **意图分类** — 理解用户在问什么（编码、分析、聊天等）
2. **智能路由** — 选择满足质量要求的最便宜模型
3. **代理转发** — 转发到 Provider，失败自动重试
4. **追踪节省** — 实时追踪与高端模型（GPT-5.5 基准）的成本对比

**简单来说**：发请求到一个端点，HopLLM 帮你搞定剩下的事。

---

## ✨ 核心功能

### 🤖 智能意图分类
多语言意图识别（中文 / 英文 / 法文 / 德文 / 西班牙文 / 葡萄牙文 / 日文 / 韩文 / 俄文 / 阿拉伯文）：
- 编码、分析、推理、创意、翻译、长上下文、闲聊
- 基于模式的分类，准确率 90%+

### 🔀 智能模型路由
根据意图、成本和可用性自动选择最佳模型：
- 20+ 模型，覆盖 9 大 Provider（OpenAI、Anthropic、DeepSeek、Qwen、Google、OpenRouter、Mistral、Groq、Cohere）
- **支持任何 OpenAI 兼容 API** — Ollama、LocalAI、vLLM、API 中转站、自建模型等
- 用户 API Key 或系统管理 Key
- 自动降级，指数退避重试
- 自定义 Provider：添加你的 Base URL + API Key，任何 `/v1/chat/completions` 端点都能用

### 💰 真实成本节省
| 使用模型 | 对比 GPT-5.5 | 节省 |
|---------|-------------|------|
| Qwen3 Coder (免费) | $5.00 → $0.00 | 100% |
| DeepSeek V4 Flash | $5.00 → $0.10 | 98% |
| Qwen3.5 Coder Plus | $5.00 → $0.20 | 96% |

### 🎯 场景配置
6 套预建场景，优化模型选择：

| 场景 | 主力模型 | 节省 |
|------|---------|------|
| 🤖 交易 Bot | Qwen3 Coder Free | 60-80% |
| 💬 客服助手 | Qwen3 Coder Free | 40-60% |
| ✍️ 内容创作 | Qwen3.6 Plus | 30-50% |
| 📊 数据分析 | Qwen3 Coder | 50-70% |
| 🔍 研究助手 | DeepSeek V4 Pro | 35-55% |
| 🛠️ 开发工具 | Qwen3 Coder Free | 45-65% |

### 📋 模板市场
6 套预设场景模板，一键导入并自定义

### 📊 仪表盘与分析
- 实时使用追踪（请求数、Token 数、费用）
- 日/周/月使用趋势
- 与高端模型的成本节省对比
- 模型分布与热门模型

### 🔐 认证与安全
- JWT + API Key 双重认证
- AES-256-GCM 加密用户 Provider Key
- 速率限制（Upstash Redis + 内存降级）
- Cloudflare Turnstile 人机验证
- 管理面板与维护模式

### 🌍 完整国际化
支持 11 种语言：
🇺🇸 English · 🇨🇳 中文 · 🇹🇼 繁體中文 · 🇯🇵 日本語 · 🇰🇷 한국어 · 🇪🇸 Español · 🇫🇷 Français · 🇩🇪 Deutsch · 🇧🇷 Português · 🇷🇺 Русский · 🇸🇦 العربية

### 🔗 Webhook 与告警
- 自定义 Webhook 端点（额度不足、每日限额、错误等事件）
- Webhook 密钥验证，时序安全比较

---

## 🚀 快速开始

### 在线体验（无需安装）
👉 [https://hopllm.com](https://hopllm.com)

### 本地运行

```bash
# 克隆仓库
git clone https://github.com/tancau/clawroute.git
cd clawroute

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local 填入你的 API Key

# 启动开发服务器
pnpm dev

# 运行测试
pnpm test
```

打开 [http://localhost:3000](http://localhost:3000) 即可使用。

### API 使用

```bash
# 自动路由聊天（使用你的 API Key）
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer hl-your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto",
    "messages": [{"role": "user", "content": "写一个 Python 排序函数"}]
  }'
```

---

## 🧩 技术栈

| 层 | 技术 |
|---|------|
| 框架 | Next.js 14 (App Router) |
| 国际化 | next-intl |
| 语言 | TypeScript |
| 样式 | Tailwind CSS + shadcn/ui |
| 状态管理 | Zustand |
| 数据库 | Vercel Postgres + 内存降级 |
| 缓存 | Upstash Redis + 内存降级 |
| 认证 | JWT (HS256) + API Key |
| 加密 | AES-256-GCM |
| 测试 | Vitest |
| 部署 | Vercel |

---

## 📐 项目架构

```
clawroute/
├── app/
│   ├── [locale]/           # 国际化路由（11 种语言）
│   │   ├── page.tsx        # 首页
│   │   ├── configure/      # 配置向导（场景 → 对比 → 配置 → 预览）
│   │   ├── dashboard/      # 仪表盘（用量、节省、Key）
│   │   ├── templates/      # 模板市场
│   │   ├── admin/          # 管理面板
│   │   └── pricing/        # 价格页
│   └── api/
│       ├── auth/           # 登录 / 注册
│       ├── v1/chat/        # 聊天补全（智能路由代理）
│       ├── dashboard/      # 仪表盘数据 API
│       ├── admin/          # 管理 API
│       ├── credits/        # 额度管理
│       ├── webhooks/       # Webhook 管理
│       └── models/         # 模型目录与推荐
├── components/             # React 组件
│   ├── configure/          # 4 步配置向导
│   ├── Dashboard/          # 仪表盘组件
│   ├── Auth/               # 登录 / 注册表单
│   ├── home/               # 首页区块
│   ├── templates/          # 模板卡片与筛选
│   └── shared/             # 共享 UI 组件
├── lib/
│   ├── auth/               # 认证（JWT、密码哈希、用户 CRUD）
│   ├── routing/            # 核心路由逻辑（Provider、Key 管理）
│   ├── middleware/          # API 认证、限流、管理认证
│   ├── models/             # 模型目录与能力矩阵
│   ├── config/             # 动态系统配置
│   ├── db/                 # 数据库表与用量追踪
│   ├── i18n/               # 语言检测与配置
│   ├── encryption.ts       # AES-256-GCM 加密
│   ├── config-generator.ts # HopLLM 配置生成
│   ├── config-doctor.ts    # 配置健康检查
│   ├── share-config.ts     # URL 分享配置
│   └── webhook.ts          # Webhook 触发系统
├── data/                   # 静态数据
│   ├── models.json         # 模型目录（20+ 模型）
│   ├── scenes.json         # 6 个使用场景
│   ├── templates.json      # 场景模板
│   └── scene-model-mapping.json
├── messages/               # 11 种语言翻译文件
├── store/                  # Zustand 存储（app、user、theme）
└── backend/                # 独立后端服务（Express）
```

---

## 🔑 环境变量

```env
# 必需
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key

# 数据库（可选 - 降级为内存存储）
POSTGRES_URL=postgresql://...

# Redis（可选 - 降级为内存存储）
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Provider API Key（可选 - 用户可自行配置）
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DEEPSEEK_API_KEY=sk-...
DASHSCOPE_API_KEY=sk-...
GOOGLE_API_KEY=AI...
OPENROUTER_API_KEY=sk-or-...

# 人机验证（可选）
TURNSTILE_SECRET_KEY=0x4...

# 管理员
ADMIN_EMAIL=admin@hopllm.com
```

---

## 🤝 如何贡献

欢迎提交 Issue 和 PR！

**贡献方式**：
- 🐛 报告 Bug
- 💡 提出新功能建议
- 📝 提交新的场景模板
- 🔧 改进代码或文档
- 🌐 添加或改进翻译

---

## 📄 许可

MIT License — 可免费商用，但请保留署名。

---

## 🔗 相关链接

- 🌐 **在线体验**：[https://hopllm.com](https://hopllm.com)
- 📂 **GitHub**：[github.com/tancau/clawroute](https://github.com/tancau/clawroute)
- 🤖 **OpenRouter**：[openrouter.ai](https://openrouter.ai) — 模型聚合平台

---

*如果你觉得 HopLLM 有用，请给我们一个 ⭐*
