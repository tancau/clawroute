# 🦞 ClawRoute

> 为 OpenClaw 用户打造的智能模型路由配置工具 — 节省 60-80% 的 API 费用。

[![Deploy with Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/tancau/clawroute?style=flat-square)](https://github.com/tancau/clawroute)

**在线体验**：[https://clawroute.vercel.app](https://clawroute.vercel.app)

---

## 🎯 ClawRoute 是什么？

OpenClaw 默认把所有请求都发送到同一个模型 — 这就像用法拉利去买菜。

ClawRoute 是一个**可视化的路由配置生成器**，帮你：
1. 选择使用场景
2. 拖拽调整路由规则
3. 一键导出 OpenClaw 可用的 YAML 配置

**简单来说**：你告诉 ClawRoute 你用 OpenClaw 做什么，它帮你生成最优的模型路由配置。

---

## ✨ 核心功能

### 🤖 场景选择器
选择你的使用场景，获取针对该场景优化的路由配置：

| 场景 | 节省 | 说明 |
|------|------|------|
| 🤖 交易 Bot | 60-80% | 加密货币/股票自动化交易 |
| 💬 客服助手 | 40-60% | 智能客服对话 |
| ✍️ 内容创作 | 30-50% | 文章撰写、文案生成 |
| 📊 数据分析 | 50-70% | 数据处理、统计分析 |
| 🔍 研究助手 | 35-55% | 学术研究、文献分析 |
| 🛠️ 开发工具 | 45-65% | 代码生成、调试、重构 |

### 🔧 拖拽式规则编辑器
可视化编辑路由规则，无需手写 YAML：
- 支持 4 种条件属性：复杂度 / 包含代码 / 需要推理 / Token 长度
- 拖拽排序，调整优先级
- 默认规则兜底

### 📊 模型对比面板
- 覆盖 24+ 主流模型（Qwen / DeepSeek / Claude / GPT / Gemini / Llama 等）
- 按成本 / 质量 / 速度排序
- 显示每千 token 价格

### 📋 模板市场
6 套预设场景模板，一键导入并修改

---

## 🚀 快速开始

### 在线体验（无需安装）
👉 [https://clawroute.vercel.app](https://clawroute.vercel.app)

### 本地运行

```bash
# 克隆仓库
git clone https://github.com/tancau/clawroute.git
cd clawroute

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 运行测试
pnpm test
```

打开 [http://localhost:3000](http://localhost:3000) 即可使用。

---

## 📦 一键部署到 Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/tancau/clawroute)

或者手动部署：

```bash
# 安装 Vercel CLI
npm i -g vercel

# 登录并部署
vercel

# 生产环境部署
vercel --prod
```

---

## 🧩 技术栈

| 层 | 技术 |
|---|------|
| 框架 | Next.js 14 (App Router) |
| 语言 | TypeScript |
| 样式 | Tailwind CSS + shadcn/ui |
| 状态管理 | Zustand |
| 拖拽排序 | @dnd-kit |
| 测试 | Vitest |
| 部署 | Vercel（免费） |

---

## 📐 项目架构

```
clawroute/
├── app/                    # Next.js App Router 页面
│   ├── page.tsx           # 首页（场景选择）
│   ├── configure/         # 配置页（规则编辑 + 预览）
│   └── templates/          # 模板市场
├── components/            # React 组件
│   ├── SceneSelector.tsx   # 场景选择卡片
│   ├── RuleEditor.tsx      # 拖拽式规则编辑器
│   ├── ModelComparePanel.tsx # 模型对比面板
│   ├── ConfigPreview.tsx    # YAML 预览 & 导出
│   └── ui/                # shadcn/ui 基础组件
├── lib/                   # 核心业务逻辑
│   ├── models-db.ts        # 模型数据库（24+ 模型元数据）
│   ├── router-engine.ts    # 路由规则引擎（CRUD + 排序）
│   └── yaml-generator.ts   # YAML 配置生成器
├── data/                  # 静态数据
│   ├── models.json         # 模型价格/能力数据
│   ├── scenes.json        # 场景定义
│   └── templates.json     # 预设路由模板
└── store/
    └── use-app-store.ts   # Zustand 全局状态
```

---

## 🤝 如何贡献

欢迎提交 Issue 和 PR！

**贡献方式**：
- 🐛 报告 Bug
- 💡 提出新功能建议
- 📝 提交新的场景模板
- 🔧 改进代码或文档

---

## 📄 许可

MIT License — 可免费商用，但请保留署名。

---

## 🔗 相关链接

- 🌐 **在线体验**：[https://clawroute.vercel.app](https://clawroute.vercel.app)
- 📂 **GitHub**：[github.com/tancau/clawroute](https://github.com/tancau/clawroute)
- 📖 **OpenClaw 文档**：[docs.openclaw.ai](https://docs.openclaw.ai)
- 🤖 **OpenRouter**：[openrouter.ai](https://openrouter.ai) — 模型聚合平台

---

*如果你觉得 ClawRoute 有用，请给我们一个 ⭐*
