'use client';

import { useState } from 'react';
import Link from 'next/link';

interface FAQItem {
  question: string;
  answer: string;
}

interface Section {
  title: string;
  icon: string;
  items: { title: string; content: string }[];
}

const SECTIONS: Section[] = [
  {
    title: '快速开始',
    icon: '🚀',
    items: [
      {
        title: '5 分钟接入指南',
        content: `1. 注册账号并获取 API Key
2. 修改你的 API endpoint：
   - 将 api.openai.com 改为 api.clawrouter.ai
3. 使用你的 API Key 进行认证
4. 发送第一个请求，体验智能路由！

支持的开发语言：
- Python: openai.api_base = "https://api.clawrouter.ai/v1"
- Node.js: basePath: "https://api.clawrouter.ai/v1"
- 其他语言: 同样修改 API endpoint 即可`,
      },
      {
        title: '配置你的应用',
        content: `支持的应用类型：

🌐 浏览器插件
- 在插件设置中修改 API endpoint
- 输入你的 API Key

💻 桌面应用
- 设置环境变量 OPENAI_API_BASE
- 或在应用设置中修改

👨‍💻 开发项目
- Python/Node.js: 修改 openai 客户端配置
- 其他语言: 修改 API base URL

🔧 其他工具
- 支持所有 OpenAI 兼容的工具`,
      },
      {
        title: '第一个请求',
        content: `Python 示例：

\`\`\`python
import openai

openai.api_base = "https://api.clawrouter.ai/v1"
openai.api_key = "你的API Key"

response = openai.ChatCompletion.create(
    model="auto",  # 使用智能路由
    messages=[
        {"role": "user", "content": "你好！"}
    ]
)

print(response.choices[0].message.content)
\`\`\`

Node.js 示例：

\`\`\`javascript
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  basePath: "https://api.clawrouter.ai/v1",
  apiKey: "你的API Key",
});

const openai = new OpenAIApi(configuration);
const response = await openai.createChatCompletion({
  model: "auto",
  messages: [{ role: "user", content: "你好！" }],
});
\`\`\``,
      },
    ],
  },
  {
    title: '使用指南',
    icon: '📖',
    items: [
      {
        title: '智能路由原理',
        content: `ClawRouter 使用三层路由机制：

1️⃣ 规则引擎 (Layer 1)
- 零延迟，零成本
- 识别明确特征（代码块、关键词等）
- 处理 80%+ 的常见场景

2️⃣ AI 分类器 (Layer 2)
- 当规则无法判断时启用
- 使用轻量级 AI 模型分析意图
- 准确率 > 98%

3️⃣ 模型映射器 (Layer 3)
- 根据意图选择最优模型
- 考虑成本、质量、速度
- 应用用户偏好设置`,
      },
      {
        title: '场景最佳实践',
        content: `不同场景的推荐设置：

💻 编码任务
- 推荐：优先免费模型
- 原因：代码任务对质量要求明确，免费模型已足够

🧠 复杂推理
- 推荐：允许付费模型
- 原因：复杂问题需要更强的推理能力

🌐 翻译任务
- 推荐：优先免费模型
- 原因：翻译任务相对简单

✨ 创意写作
- 推荐：使用高质量模型
- 原因：创意内容需要更好的表达能力`,
      },
      {
        title: '成本优化技巧',
        content: `最大化节省成本的技巧：

1. 设置预算上限
   - 防止意外的高成本请求
   - 启用自动降级

2. 根据场景调整偏好
   - 简单任务用免费模型
   - 复杂任务才用付费模型

3. 排除不需要的高价模型
   - 在偏好设置中排除 GPT-4 等

4. 查看省钱报告
   - 了解哪些请求消耗最多
   - 优化使用习惯`,
      },
    ],
  },
  {
    title: '常见问题',
    icon: '❓',
    items: [
      {
        title: '如何查看省钱报告？',
        content: `进入控制台 → 点击「省钱报告」按钮

你可以看到：
- 总请求数、原始成本、实际成本
- 按意图分类的详细分析
- 模型使用分布
- 与上月对比`,
      },
      {
        title: '为什么有些请求用付费模型？',
        content: `当任务复杂度较高时，系统会自动选择付费模型以确保质量：

- 复杂推理任务
- 长文本处理
- 专业领域分析

你可以在偏好设置中调整策略：
- 选择「成本优先」模式
- 排除不想使用的付费模型`,
      },
      {
        title: '如何设置预算上限？',
        content: `进入控制台 → 偏好设置 → 预算控制

可设置：
- 单次请求上限 ($)
- 每日预算 ($)
- 超预算自动降级到免费模型`,
      },
      {
        title: 'API Key 无效怎么办？',
        content: `检查以下事项：

1. 确认 API Key 正确复制（无多余空格）
2. 检查是否在正确的 endpoint
3. 确认账号状态正常

如果问题持续，尝试：
- 重新生成 API Key
- 联系支持团队`,
      },
      {
        title: '请求超时怎么处理？',
        content: `超时可能的原因：

1. 网络问题
   - 检查网络连接
   - 尝试重试请求

2. 模型响应慢
   - 某些复杂任务需要更长时间
   - 等待或调整超时设置

3. 服务繁忙
   - 高峰期可能需要排队
   - 稍后重试`,
      },
    ],
  },
  {
    title: '故障排除',
    icon: '🔧',
    items: [
      {
        title: '连接问题',
        content: `如果无法连接到 ClawRouter：

1. 检查网络连接
2. 确认 endpoint 正确：
   https://api.clawrouter.ai/v1
3. 检查防火墙设置
4. 尝试使用 VPN 或代理`,
      },
      {
        title: '认证问题',
        content: `认证失败的常见原因：

1. API Key 错误或过期
   - 重新复制 API Key
   - 检查是否有隐藏字符

2. 账号权限问题
   - 确认账号状态
   - 检查是否有余额/额度

3. 请求格式错误
   - 确认使用正确的 API 格式
   - 检查 Header 设置`,
      },
      {
        title: '模型不可用',
        content: `如果提示模型不可用：

1. 该模型可能暂时离线
   - 系统会自动切换到备用模型

2. 模型已被排除
   - 检查偏好设置中的排除列表

3. 配额用尽
   - 检查预算设置
   - 等待配额重置`,
      },
    ],
  },
];

const FAQS: FAQItem[] = [
  {
    question: 'ClawRouter 支持哪些模型？',
    answer: '我们支持 50+ 模型，包括 OpenAI、Anthropic、Google、DeepSeek、Qwen 等。免费模型和付费模型都可用。',
  },
  {
    question: '智能路由准确吗？',
    answer: '我们的三层路由机制准确率超过 98%。规则引擎处理 80%+ 的常见场景，AI 分类器处理复杂情况。',
  },
  {
    question: '如何获得免费额度？',
    answer: '新用户注册即获得免费额度。你也可以贡献 API Key 到资源池获得额外积分。',
  },
  {
    question: '数据安全如何保障？',
    answer: '我们使用加密传输，不存储用户对话内容，API Key 加密保存。详细隐私政策请查看服务条款。',
  },
];

export default function HelpPage() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState(0);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">📚 帮助中心</h1>
          <p className="text-[#94a3b8] text-lg">快速找到你需要的答案</p>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="md:col-span-1">
            <div className="sticky top-8 space-y-2">
              {SECTIONS.map((section, index) => (
                <button
                  key={index}
                  onClick={() => setActiveSection(index)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    activeSection === index
                      ? 'bg-gradient-to-r from-[#00c9ff]/20 to-[#92fe9d]/20 text-white'
                      : 'text-[#94a3b8] hover:bg-[#1e293b]'
                  }`}
                >
                  <span className="mr-2">{section.icon}</span>
                  {section.title}
                </button>
              ))}
              <div className="pt-4 mt-4 border-t border-[#1e293b]">
                <Link
                  href="/dashboard"
                  className="block text-center px-4 py-2 bg-[#1e293b] text-[#94a3b8] rounded-lg hover:bg-[#334155] transition-colors"
                >
                  返回控制台
                </Link>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="md:col-span-3 space-y-8">
            {/* Active Section */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6">
                {SECTIONS[activeSection]?.icon} {SECTIONS[activeSection]?.title}
              </h2>

              <div className="space-y-6">
                {SECTIONS[activeSection]?.items.map((item, index) => (
                  <div key={index} className="border-b border-[#1e293b] pb-6 last:border-0 last:pb-0">
                    <h3 className="text-lg font-semibold text-white mb-3">{item.title}</h3>
                    <div className="text-[#94a3b8] whitespace-pre-wrap text-sm leading-relaxed">
                      {item.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FAQ Section */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6">❓ 快速问答</h2>

              <div className="space-y-3">
                {FAQS.map((faq, index) => (
                  <div
                    key={index}
                    className="bg-[#1e293b] rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                      className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-[#334155] transition-colors"
                    >
                      <span className="text-white font-medium">{faq.question}</span>
                      <span className="text-[#94a3b8]">
                        {expandedFaq === index ? '▲' : '▼'}
                      </span>
                    </button>
                    {expandedFaq === index && (
                      <div className="px-4 py-3 border-t border-[#334155] text-[#94a3b8]">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
