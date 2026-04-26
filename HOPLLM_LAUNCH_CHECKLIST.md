# HopLLM Launch Checklist 🚀

## ✅ 已完成

- [x] 代码开发完成（分支 feat/custom-routing-rules）
- [x] PR 已创建
- [x] SEO 优化完成
- [x] 截图素材准备完毕
- [x] 营销文案准备完毕

## ⏳ 需要 tancau 操作

### 1. Product Hunt 发布（最重要！）

**访问**: https://www.producthunt.com/post

**选择**: "I want to launch a product"

**填写信息**:
- **Product Name**: HopLLM
- **Tagline**: Smart routing. Automatic savings. Same quality.
- **Description** (140字内):
  > One API call, auto-routes to optimal AI model. Save 80% on costs, same quality. Zero config needed.

**上传截图** (从 `public/` 目录):
- sc-home.png - 首页场景选择器
- sc-config.png - 配置页
- sc-tpl.png - 模板市场

**Tags**: #AI #DeveloperTools #APIs #OpenAI #CostOptimization #LLM

**Gallery 卡片**:
```
# Before
client = OpenAI(base_url="https://api.openai.com/v1")

# After  
client = OpenAI(base_url="https://hopllm.com/v1")  # That's it!
```

**Links**:
- Website: https://hopllm.com
- GitHub: https://github.com/tancau/hopllm

---

### 2. V2EX 发布

**访问**: https://www.v2ex.com/new

**标题**: [分享] 做了一个 AI API 智能路由工具，帮你省 80% 的 API 费用

**正文**: 使用 `marketing/v2ex_post.md` 的内容

---

### 3. AlternativeTo 提交

**访问**: https://alternativeto.net/submit/

**Product Name**: HopLLM

**Category**: Developer Tools / API Management

**Description**: 
> HopLLM is a smart routing API proxy that helps developers save 60-80% on AI API costs. Simply replace your OpenAI base_url, use model="auto", and let HopLLM handle the rest.

**Pricing**: Free / Open Source

---

### 4. Google Search Console

**访问**: https://search.google.com/search-console

1. 添加属性（输入 hopllm.com）
2. 下载验证文件或添加 TXT 记录
3. 验证后提交 sitemap: https://hopllm.com/sitemap.xml

---

### 5. GitHub Repo 发布（可选）

如果还没有 release:
1. 创建 GitHub Release
2. Tag: v1.0.0
3. Title: HopLLM v1.0.0 - Smart LLM Routing

---

## 🐦 Twitter/X 推广（可立即发）

**预热推文**:
```
🚀 Built a tool that saved my AI costs by 80%.

Every GPT-4 call doesn't need GPT-4.

HopLLM auto-routes to the best model for each request.

Check it out: https://hopllm.com

#AI #APICosts #Developers
```

**Launch 推文**:
```
🚀 HopLLM is LIVE!

One API call. Auto-routes to optimal model.
Save up to 80%. Same quality.

👉 https://hopllm.com
👉 https://github.com/tancau/hopllm

#AI #DeveloperTools #LaunchDay
```

---

## 📊 核心宣传语

**英文**: Smart routing. Automatic savings. Same quality.
**中文**: 智能路由，自动省钱，质量不变。

**一句话**: 一个 API 改 base_url，省 80% 费用

---

## 🔗 重要链接

| 资源 | 链接 |
|------|------|
| 官网 | https://hopllm.com |
| GitHub | https://github.com/tancau/hopllm |
| PR | https://github.com/tancau/clawroute/pull/1 |
| 截图 | `public/sc-*.png` |
| 营销文案 | `marketing/PH_README.md` |
| V2EX 帖 | `marketing/v2ex_post.md` |

---

*Last updated: 2026-04-27*
