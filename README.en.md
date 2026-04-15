# 🦞 ClawRoute

> Smart model routing config generator for OpenClaw users — Save 60-80% on API costs.

English | [简体中文](./README.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/tancau/clawroute?style=flat-square)](https://github.com/tancau/clawroute)

**Live Demo**: [https://clawroute.vercel.app](https://clawroute.vercel.app)

---

## 🎯 What is ClawRoute?

OpenClaw sends all requests to the same model by default — like driving a Ferrari to buy groceries.

ClawRoute is a **visual routing config generator** that helps you:
1. Select your use case
2. Drag-and-drop to adjust routing rules
3. Export OpenClaw-compatible YAML config with one click

**Simply put**: Tell ClawRoute what you use OpenClaw for, and it generates the optimal model routing configuration.

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

### Live Demo (No Installation)
👉 [https://clawroute.vercel.app](https://clawroute.vercel.app)

### Run Locally

```bash
# Clone the repo
git clone https://github.com/tancau/clawroute.git
cd clawroute

# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Run tests
pnpm test
```

Open [http://localhost:3000](http://localhost:3000) to use.

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
├── app/
│   └── [locale]/           # i18n routes (zh/en)
│       ├── page.tsx        # Home (scene selector)
│       ├── configure/      # Config page (rule editor + preview)
│       └── templates/      # Template market
├── components/             # React components
├── lib/                    # Core business logic
├── data/                   # Static data
├── messages/               # i18n translation files
│   ├── zh.json
│   └── en.json
└── store/                  # Zustand global state
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
