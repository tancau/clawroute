# 🦞 ClawRoute

> 为 OpenClaw 用户打造的智能模型路由配置工具 — 节省 60-80% 的 API 费用。

[![Deploy with Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

## 为什么需要 ClawRoute？

OpenClaw 默认把所有请求都发送到同一个模型 — 这就像用法拉利去买菜。

**实际情况：**
- 心跳检查 → Claude Opus ($0.015/1K tokens) ❌
- 简单问答 → GPT-4o ($0.005/1K tokens) ❌
- 代码补全 → DeepSeek R1 ($0.001/1K tokens) ✅

ClawRoute 帮你**自动把请求路由到最便宜的模型**，同时保证输出质量。

## 🎯 核心功能

### 1. 场景选择器
选择你的使用场景，获取针对该场景优化的路由配置：

- 🤖 **交易 Bot** — 节省 60-80%
- 💬 **客服助手** — 节省 40-60%
- ✍️ **内容创作** — 节省 30-50%
- 📊 **数据分析** — 节省 50-70%
- 🔍 **研究助手** — 节省 35-55%
- 🛠️ **开发工具** — 节省 45-65%

### 2. 拖拽式规则编辑器
可视化编辑路由规则，无需手写 YAML：
- 支持 4 种条件属性：复杂度 / 包含代码 / 需要推理 / Token 长度
- 拖拽排序，调整优先级
- 默认规则兜底

### 3. 模型对比面板
- 24+ 主流模型实时对比
- 按成本 / 质量 / 速度排序
- 显示预估节省金额

### 4. 模板市场
预设 6 套场景模板，可一键导入并修改

## 📸 截图

```
首页 → 选择场景 → 配置规则 → 导出 YAML
```

## 🚀 快速开始

```bash
# 克隆项目
git clone https://github.com/your-username/clawroute.git
cd clawroute

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 运行测试
pnpm test

# 构建生产版本
pnpm build
```

打开 [http://localhost:3000](http://localhost:3000) 即可使用。

## 📦 部署

### Vercel（推荐）

1. Fork 这个仓库
2. 在 [vercel.com/new](https://vercel.com/new) 导入
3. Deploy — 自动完成

```bash
# 或通过 CLI
pnpm i -g vercel
vercel
```

### 其他平台

- **Netlify**: `next export` 输出静态文件
- **Cloudflare Pages**: 支持 Next.js App Router

## 🧩 技术栈

| 层 | 技术 |
|---|------|
| 框架 | Next.js 14 (App Router) |
| 语言 | TypeScript |
| 样式 | Tailwind CSS + shadcn/ui |
| 状态管理 | Zustand |
| 拖拽 | @dnd-kit |
| 国际化 | next-intl |
| 测试 | Vitest |
| 部署 | Vercel (免费) |

## 📐 架构

```
clawroute/
├── app/                    # Next.js App Router 页面
├── components/             # React 组件
│   └── ui/                 # shadcn/ui 基础组件
├── lib/                    # 核心逻辑
│   ├── models-db.ts        # 模型数据库
│   ├── router-engine.ts    # 路由规则引擎
│   └── yaml-generator.ts   # YAML 生成器
├── data/                   # 静态数据
│   ├── models.json         # 模型元数据
│   ├── scenes.json         # 场景定义
│   └── templates.json      # 预设模板
├── store/                  # Zustand 状态
└── messages/               # 国际化文案
```

## 🤝 贡献

欢迎提交 Issue 和 PR！

如果你有更好的路由策略或新的场景模板，欢迎贡献。

## 📄 许可

MIT License

## 🔗 相关链接

- [OpenClaw 官方文档](https://docs.openclaw.ai)
- [Manifest — 开源 LLM 路由器](https://github.com/your-username/manifest)
- [OpenRouter — 模型聚合平台](https://openrouter.ai)
- [New-API — 免费模型 API](https://new-api.com)

---

**Made with 💜 for the OpenClaw community**
