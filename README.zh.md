# 🚀 HopLLM (智跳)

> 为你打造的智能模型路由配置工具 — 节省 60-80% 的 API 费用。

[English](./README.md) | 简体中文

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/tancau/hopllm?style=flat-square)](https://github.com/tancau/hopllm)

**在线体验**：[https://hopllm.com](https://hopllm.com)

---

## 🎯 HopLLM 是什么？

HopLLM（智跳）是一个**智能路由 API 代理**，帮你：
1. 选择使用场景
2. 拖拽调整路由规则
3. 一键导出 OpenClaw 可用的 YAML 配置

**简单来说**：HopLLM 帮你生成最优的模型路由配置，智能路由，自动省钱。

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
👉 [https://hopllm.com](https://hopllm.com)

### 本地运行

```bash
# 克隆仓库
git clone https://github.com/tancau/hopllm.git
cd hopllm

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 运行测试
pnpm test
```

打开 [http://localhost:3000](http://localhost:3000) 即可使用。

---

## 🧩 技术栈

| 层 | 技术 |
|---|------|
| 框架 | Next.js 14 (App Router) |
| 国际化 | next-intl |
| 语言 | TypeScript |
| 样式 | Tailwind CSS + shadcn/ui |
| 状态管理 | Zustand |
| 拖拽排序 | @dnd-kit |
| 测试 | Vitest |
| 部署 | Vercel |

---

## 📐 项目架构

```
hopllm/
├── app/
│   └── [locale]/           # 国际化路由 (zh/en)
│       ├── page.tsx        # 首页（场景选择）
│       ├── configure/      # 配置页（规则编辑 + 预览）
│       └── templates/      # 模板市场
├── components/             # React 组件
├── lib/                    # 核心业务逻辑
├── data/                   # 静态数据
├── messages/               # 国际化翻译文件
│   ├── zh.json
│   └── en.json
└── store/                  # Zustand 全局状态
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

- 🌐 **在线体验**：[https://hopllm.com](https://hopllm.com)
- 📂 **GitHub**：[github.com/tancau/hopllm](https://github.com/tancau/hopllm)
- 📖 **OpenClaw 文档**：[docs.openclaw.ai](https://docs.openclaw.ai)
- 🤖 **OpenRouter**：[openrouter.ai](https://openrouter.ai) — 模型聚合平台

## 📸 截图

| 首页 | 配置页 | 模板市场 |
|:---:|:---:|:---:|
| <img src="https://raw.githubusercontent.com/tancau/hopllm/master/public/sc-home.png" width="300"/> | <img src="https://raw.githubusercontent.com/tancau/hopllm/master/public/sc-config.png" width="300"/> | <img src="https://raw.githubusercontent.com/tancau/hopllm/master/public/sc-tpl.png" width="300"/> |

---

*如果你觉得 HopLLM 有用，请给我们一个 ⭐*
