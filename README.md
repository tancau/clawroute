# 🦞 ClawRouter

> AI 推理成本优化平台 — "API Key 的 Airbnb"
> 用户共享闲置 API Key，智能路由选择最优模型，平均节省 80-95% 成本

English | [简体中文](./README.zh.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/tancau/clawroute?style=flat-square)](https://github.com/tancau/clawroute)

**Live Demo**: [https://clawroute.vercel.app](https://clawroute.vercel.app)

---

## 🎬 Demo Video

Watch how ClawRoute helps you save 60-80% on OpenClaw costs in under 30 seconds:

[![ClawRoute Demo](https://img.shields.io/badge/Video-Coming%20Soon-blue?style=for-the-badge)](https://github.com/tancau/clawroute/discussions)

*Video coming soon — showing scene selection → config generation → export*

---

## 🎯 What is ClawRouter?

ClawRouter 是一个 **AI 推理成本优化平台**，核心理念：

1. **资源共享** — 用户贡献闲置 API Key，获得收益分成
2. **智能路由** — 根据请求复杂度自动选择最优模型
3. **成本优化** — 平均节省 80-95% 推理成本

**一句话**：你的 API Key 睡觉时也在赚钱。

---

## ✨ Core Features

### 🤖 Scene Selector
Choose your use case and get optimized routing configuration:

| Scene | Savings | Description |
|-------|---------|-------------|
| 🤖 Trading Bot | 60-80% | Crypto/stock automated trading |
| 💬 Customer Service | 40-60% | Intelligent customer support |
| ✍️ Content Creation | 30-50% | Article writing, copywriting |
| 📊 Data Analysis | 50-70% | Data processing, statistical analysis |
| 🔍 Research Assistant | 35-55% | Academic research, literature analysis |
| 🛠️ Dev Tools | 45-65% | Code generation, debugging, refactoring |

### 🔧 Drag-and-Drop Rule Editor
Visual editing of routing rules, no YAML writing required:
- 4 condition attributes: Complexity / Contains Code / Needs Reasoning / Token Length
- Drag to reorder priorities
- Default rule as fallback

### 📊 Model Comparison Panel
- 24+ mainstream models (Qwen / DeepSeek / Claude / GPT / Gemini / Llama, etc.)
- Sort by Cost / Quality / Speed
- Display price per 1K tokens

### 📋 Template Market
6 preset scene templates, import and customize with one click

---

## 🚀 Quick Start

### 方式一：Docker 部署（推荐）

```bash
# Clone the repo
git clone https://github.com/tancau/clawroute.git
cd clawroute

# 配置环境变量
cp .env.example .env
# 编辑 .env 设置 JWT_SECRET 和 ENCRYPTION_KEY

# 启动服务
docker-compose up -d
```

访问:
- 前端: http://localhost:3001
- 后端 API: http://localhost:3000

### 方式二：开发模式

```bash
# 安装依赖
pnpm install
cd backend && npm install && cd ..

# 启动开发服务
./scripts/start.sh

# 或手动启动
cd backend && npm run dev &  # 后端
npm run dev                   # 前端
```

### 运行测试

```bash
./scripts/test.sh
```

详细 API 文档见 [docs/API.md](./docs/API.md)

---

## 🧩 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| i18n | next-intl |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand |
| Drag & Drop | @dnd-kit |
| Testing | Vitest |
| Deployment | Vercel |

---

## 📐 Project Structure

```
clawroute/
├── app/                    # Next.js 前端
│   └── [locale]/           # i18n routes (zh/en)
├── backend/                # NestJS 后端 API
│   ├── src/                # 源代码
│   ├── dist/               # 编译输出
│   └── Dockerfile          # 后端容器配置
├── components/             # React 组件
├── lib/                    # 核心业务逻辑
├── data/                   # 静态数据
├── docs/                   # 文档
│   └── API.md              # API 文档
├── scripts/                # 脚本
│   ├── start.sh            # 开发启动脚本
│   └── test.sh             # 测试脚本
├── docker-compose.yml      # Docker 编排
└── .env.example            # 环境变量示例
```

---

## 🤝 Contributing

Issues and PRs are welcome!

**Ways to contribute**:
- 🐛 Report bugs
- 💡 Suggest new features
- 📝 Submit new scene templates
- 🔧 Improve code or documentation

---

## 📄 License

MIT License — Free for commercial use, but please keep attribution.

---

## 🔗 Links

- 🌐 **Live Demo**: [https://clawroute.vercel.app](https://clawroute.vercel.app)
- 📂 **GitHub**: [github.com/tancau/clawroute](https://github.com/tancau/clawroute)
- 📖 **OpenClaw Docs**: [docs.openclaw.ai](https://docs.openclaw.ai)
- 🤖 **OpenRouter**: [openrouter.ai](https://openrouter.ai) — Model aggregation platform

## 📸 Screenshots

| Home | Configure | Templates |
|:---:|:---:|:---:|
| <img src="https://raw.githubusercontent.com/tancau/clawroute/master/public/sc-home.png" width="300"/> | <img src="https://raw.githubusercontent.com/tancau/clawroute/master/public/sc-config.png" width="300"/> | <img src="https://raw.githubusercontent.com/tancau/clawroute/master/public/sc-tpl.png" width="300"/> |

---

*If you find ClawRoute useful, please give us a ⭐*
