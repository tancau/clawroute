# HopLLM (智跳)

> Intelligent LLM routing API proxy — Save **60-80%** on AI API costs with smart model selection.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/tancau/hopllm?style=flat-square&logo=github)](https://github.com/tancau/hopllm)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com)

**[🚀 Live Demo](https://hopllm.com)** · **[📖 Docs](https://docs.hopllm.com)** · **[🐛 Report Bug](https://github.com/tancau/hopllm/issues)** · **[💡 Request Feature](https://github.com/tancau/hopllm/discussions)**

---

## 🎯 What is HopLLM?

**HopLLM** (智跳) is an intelligent routing API proxy for Large Language Models. Instead of manually choosing which model to use, HopLLM automatically routes each request to the optimal model based on:

- **Complexity** — Simple queries → cheap models; complex tasks → advanced models
- **Context** — Code detection, reasoning requirements, token length
- **Cost efficiency** — Maximum savings without quality loss

**Zero migration cost** — Just switch your API base URL from `api.openai.com` to `hopllm.com`. Everything else stays the same.

---

## 💰 Cost Savings by Use Case

| Scene | Savings | Best For |
|-------|---------|----------|
| 🤖 Trading Bot | **60-80%** | Crypto/stock automated trading signals |
| 💬 Customer Service | **40-60%** | FAQ, ticket routing, auto-reply |
| 📊 Data Analysis | **50-70%** | Statistical analysis, report generation |
| ✍️ Content Creation | **30-50%** | Articles, copywriting, social media |
| 🔍 Research Assistant | **35-55%** | Literature review, academic search |
| 🛠️ Dev Tools | **45-65%** | Code generation, debugging, refactoring |

---

## ✨ Core Features

### 🎨 Visual Scene Selector
Select your use case from 6 preset scenes. HopLLM generates optimized routing rules instantly — no manual configuration needed.

### 🔧 Drag-and-Drop Rule Editor
Build routing rules visually:
- 4 condition attributes: Complexity / Contains Code / Needs Reasoning / Token Length
- Drag to reorder priority
- Real-time YAML preview

### 📊 Model Comparison Panel
Compare 24+ models side-by-side:
- **Qwen / DeepSeek / Claude / GPT / Gemini / Llama / Mistral** and more
- Sort by Cost · Quality · Speed
- Live price per 1M tokens

### 📋 Template Market
6 production-ready scene templates. Import with one click, customize as needed.

### 🔌 OpenAI-Compatible API
```bash
# Just change the base URL — everything else works out of the box
curl https://api.hopllm.com/v1/chat/completions \
  -H "Authorization: Bearer $HOPLLM_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

---

## 🚀 Quick Start

### Live Demo (No Installation)
👉 **[https://hopllm.com](https://hopllm.com)** — Try the visual configurator now

### Run Locally

```bash
git clone https://github.com/tancau/hopllm.git
cd hopllm
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and start configuring your routing rules.

---

## 🧩 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js 14](https://nextjs.org) (App Router) |
| Language | [TypeScript](https://typescriptlang.org) |
| Styling | [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) |
| i18n | [next-intl](https://next-intl-docs.vercel.app) |
| State | [Zustand](https://zustand-demo.pmnd.rs) |
| Drag & Drop | [@dnd-kit](https://dndkit.com) |
| Testing | [Vitest](https://vitest.dev) |
| Deployment | [Vercel](https://vercel.com) |

---

## 📐 Project Structure

```
hopllm/
├── app/
│   └── [locale]/           # i18n routes (en/zh)
│       ├── page.tsx        # Home (scene selector)
│       ├── configure/      # Rule editor + config preview
│       ├── templates/      # Template market
│       └── dashboard/      # Usage stats, API keys, providers
├── components/             # React components
├── lib/                    # Core routing logic
├── data/                   # Model data & pricing
├── store/                  # Zustand global state
└── messages/               # i18n translations (en.json, zh.json)
```

---

## 🤝 Contributing

Contributions are welcome! Open an [issue](https://github.com/tancau/hopllm/issues) or submit a PR.

**Ways to contribute**:
- 🐛 Report bugs or request features via [GitHub Issues](https://github.com/tancau/hopllm/issues)
- 📝 Submit new scene templates to the template market
- 🔧 Improve documentation
- ⭐ Star the repo if you find it useful

---

## 📄 License

[MIT License](LICENSE) — Free for personal and commercial use. Attribution appreciated.

---

## 🔗 Links

| Resource | URL |
|----------|-----|
| 🌐 Live Demo | [https://hopllm.com](https://hopllm.com) |
| 📂 GitHub | [github.com/tancau/hopllm](https://github.com/tancau/hopllm) |
| 📖 Docs | [docs.hopllm.com](https://docs.hopllm.com) |
| 🐦 Twitter | [@hopllm](https://twitter.com/hopllm) |
| 🤖 OpenRouter | [openrouter.ai](https://openrouter.ai) |
| 📖 OpenClaw Docs | [docs.openclaw.ai](https://docs.openclaw.ai) |

---

## 📸 Screenshots

| Home | Configure | Templates |
|:---:|:---:|:---:|
| <img src="https://raw.githubusercontent.com/tancau/hopllm/master/public/sc-home.png" width="300"/> | <img src="https://raw.githubusercontent.com/tancau/hopllm/master/public/sc-config.png" width="300"/> | <img src="https://raw.githubusercontent.com/tancau/hopllm/master/public/sc-tpl.png" width="300"/> |

---

*If HopLLM saves you money or time, please give us a ⭐*
