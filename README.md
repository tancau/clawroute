# 🚀 HopLLM (智跳)

> Smart LLM routing proxy — Save 40-80% on API costs with intelligent model selection.

English | [简体中文](./README.zh.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![GitHub Stars](https://img.shields.io/github/stars/tancau/hopllm?style=flat-square)](https://github.com/tancau/hopllm)

**Live Demo**: [https://hopllm.com](https://hopllm.com)

---

## 🎯 What is HopLLM?

HopLLM is a **smart LLM routing proxy** that automatically selects the best AI model for each request:

1. **Classify intent** — Understand what the user is asking (coding, analysis, chat, etc.)
2. **Route to optimal model** — Pick the cheapest model that meets quality requirements
3. **Proxy & fallback** — Forward to the provider, auto-retry on failures
4. **Track & save** — Real-time cost tracking vs. premium models (GPT-5.5 baseline)

**Simply put**: Send requests to one endpoint, HopLLM handles the rest.

---

## ✨ Core Features

### 🤖 Intelligent Intent Classification
Multi-language intent detection (Chinese / English / French / German / Spanish / Portuguese / Japanese / Korean / Russian / Arabic):
- Coding, Analysis, Reasoning, Creative, Translation, Long Context, Casual Chat
- Pattern-based classification with 90%+ accuracy

### 🔀 Smart Model Routing
Auto-select the best model based on intent, cost, and availability:
- 20+ models across 9 providers (OpenAI, Anthropic, DeepSeek, Qwen, Google, OpenRouter, Mistral, Groq, Cohere)
- **Any OpenAI-compatible API supported** — Ollama, LocalAI, vLLM, API gateways, self-hosted models, etc.
- User API keys or system-managed keys
- Automatic fallback with exponential backoff retry
- Custom providers: add your own base URL + API key, works with any `/v1/chat/completions` endpoint

### 💰 Real Cost Savings
| Model Used | vs GPT-5.5 | Savings |
|-----------|-----------|---------|
| Qwen3 Coder (Free) | $5.00 → $0.00 | 100% |
| DeepSeek V4 Flash | $5.00 → $0.10 | 98% |
| Qwen3.5 Coder Plus | $5.00 → $0.20 | 96% |

### 🎯 Scene-Based Configuration
6 pre-built scenes with optimized model selection:

| Scene | Primary Model | Savings |
|-------|--------------|---------|
| 🤖 Trading Bot | Qwen3 Coder Free | 60-80% |
| 💬 Customer Service | Qwen3 Coder Free | 40-60% |
| ✍️ Content Creation | Qwen3.6 Plus | 30-50% |
| 📊 Data Analysis | Qwen3 Coder | 50-70% |
| 🔍 Research Assistant | DeepSeek V4 Pro | 35-55% |
| 🛠️ Dev Tools | Qwen3 Coder Free | 45-65% |

### 📋 Template Market
6 preset scene templates, import and customize with one click

### 📊 Dashboard & Analytics
- Real-time usage tracking (requests, tokens, cost)
- Daily/weekly/monthly usage trends
- Cost savings vs. premium models
- Model distribution and top models

### 🔐 Authentication & Security
- JWT + API Key dual authentication
- AES-256-GCM encryption for user provider keys
- Rate limiting (Upstash Redis + memory fallback)
- Cloudflare Turnstile CAPTCHA for registration
- Admin panel with maintenance mode

### 🌍 Full Internationalization
11 languages supported:
🇺🇸 English · 🇨🇳 中文 · 🇹🇼 繁體中文 · 🇯🇵 日本語 · 🇰🇷 한국어 · 🇪🇸 Español · 🇫🇷 Français · 🇩🇪 Deutsch · 🇧🇷 Português · 🇷🇺 Русский · 🇸🇦 العربية

### 🔗 Webhooks & Alerts
- Custom webhook endpoints for events (low credits, daily limits, errors)
- Webhook secret verification with timing-safe comparison

---

## 🚀 Quick Start

### Live Demo (No Installation)
👉 [https://hopllm.com](https://hopllm.com)

### Run Locally

```bash
# Clone the repo
git clone https://github.com/tancau/clawroute.git
cd clawroute

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Start dev server
pnpm dev

# Run tests
pnpm test
```

Open [http://localhost:3000](http://localhost:3000) to use.

### API Usage

```bash
# Chat with auto-routing (using your API key)
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Authorization: Bearer hl-your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto",
    "messages": [{"role": "user", "content": "Write a Python function to sort a list"}]
  }'
```

---

## 🧩 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| i18n | next-intl |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| State | Zustand |
| Database | Vercel Postgres + memory fallback |
| Cache | Upstash Redis + memory fallback |
| Auth | JWT (HS256) + API Key |
| Encryption | AES-256-GCM |
| Testing | Vitest |
| Deployment | Vercel |

---

## 📐 Project Structure

```
clawroute/
├── app/
│   ├── [locale]/           # i18n routes (11 languages)
│   │   ├── page.tsx        # Home
│   │   ├── configure/      # Config wizard (scene → compare → configure → preview)
│   │   ├── dashboard/      # Dashboard (usage, savings, keys)
│   │   ├── templates/      # Template market
│   │   ├── admin/          # Admin panel
│   │   └── pricing/        # Pricing page
│   └── api/
│       ├── auth/           # Login / Register
│       ├── v1/chat/        # Chat completions (smart routing proxy)
│       ├── dashboard/      # Dashboard data APIs
│       ├── admin/          # Admin APIs
│       ├── credits/        # Credits management
│       ├── webhooks/       # Webhook management
│       └── models/         # Model catalog & recommendations
├── components/             # React components
│   ├── configure/          # 4-step config wizard
│   ├── Dashboard/          # Dashboard widgets
│   ├── Auth/               # Login / Register forms
│   ├── home/               # Landing page sections
│   ├── templates/          # Template cards & filters
│   └── shared/             # Shared UI components
├── lib/
│   ├── auth/               # Authentication (JWT, password hashing, user CRUD)
│   ├── routing/            # Core routing logic (providers, key manager)
│   ├── middleware/          # API auth, rate limiting, admin auth
│   ├── models/             # Model catalog & capability matrix
│   ├── config/             # Dynamic system configuration
│   ├── db/                 # Database tables & usage tracking
│   ├── i18n/               # Language detection & config
│   ├── encryption.ts       # AES-256-GCM encryption
│   ├── config-generator.ts # HopLLM config generation
│   ├── config-doctor.ts    # Config health check
│   ├── share-config.ts     # Config sharing via URL
│   └── webhook.ts          # Webhook trigger system
├── data/                   # Static data
│   ├── models.json         # Model catalog (20+ models)
│   ├── scenes.json         # 6 use-case scenes
│   ├── templates.json      # Scene templates
│   └── scene-model-mapping.json
├── messages/               # 11 language translation files
├── store/                  # Zustand stores (app, user, theme)
└── backend/                # Standalone backend service (Express)
```

---

## 🔑 Environment Variables

```env
# Required
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-encryption-key

# Database (optional - falls back to in-memory)
POSTGRES_URL=postgresql://...

# Redis (optional - falls back to in-memory)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Provider API Keys (optional - users can configure their own)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
DEEPSEEK_API_KEY=sk-...
DASHSCOPE_API_KEY=sk-...
GOOGLE_API_KEY=AI...
OPENROUTER_API_KEY=sk-or-...

# CAPTCHA (optional)
TURNSTILE_SECRET_KEY=0x4...

# Admin
ADMIN_EMAIL=admin@hopllm.com
```

---

## 🤝 Contributing

Issues and PRs are welcome!

**Ways to contribute**:
- 🐛 Report bugs
- 💡 Suggest new features
- 📝 Submit new scene templates
- 🔧 Improve code or documentation
- 🌐 Add or improve translations

---

## 📄 License

MIT License — Free for commercial use, but please keep attribution.

---

## 🔗 Links

- 🌐 **Live Demo**: [https://hopllm.com](https://hopllm.com)
- 📂 **GitHub**: [github.com/tancau/clawroute](https://github.com/tancau/clawroute)
- 🤖 **OpenRouter**: [openrouter.ai](https://openrouter.ai) — Model aggregation platform

---

*If you find HopLLM useful, please give us a ⭐*
