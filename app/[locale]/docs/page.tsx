'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Zap, Book, HelpCircle, PlayCircle, ChevronDown, ChevronUp, 
  Copy, Check, ExternalLink, Code, Terminal, Settings, Key
} from 'lucide-react';

export default function DocsPage() {
  const t = useTranslations('docsPage');
  const tFaq = useTranslations('docsFaq');
  const tDocs = useTranslations('docs');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const copyCode = async (code: string, index: number) => {
    await navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const codeExamples = [
    {
      language: 'python',
      code: `# Python OpenAI SDK
from openai import OpenAI

# Just change the base_url
client = OpenAI(
    base_url="https://hopllm.com/v1",
    api_key="your-hopllm-api-key"
)

# Use model="auto" for smart routing
response = client.chat.completions.create(
    model="auto",  # Smart routing!
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)
print(response.choices[0].message.content)`,
    },
    {
      language: 'javascript',
      code: `// JavaScript / Node.js
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://hopllm.com/v1',
  apiKey: 'your-hopllm-api-key'
});

// Smart routing with model="auto"
const response = await client.chat.completions.create({
  model: 'auto',
  messages: [{ role: 'user', content: 'Hello!' }]
});

console.log(response.choices[0].message.content);`,
    },
    {
      language: 'curl',
      code: `# curl
curl https://hopllm.com/v1/chat/completions \\
  -H "Authorization: Bearer your-hopllm-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "auto",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`,
    },
  ];

  const faqs = [
    {
      question: tFaq('q1'),
      answer: tFaq('a1'),
    },
    {
      question: tFaq('q2'),
      answer: tFaq('a2'),
    },
    {
      question: tFaq('q3'),
      answer: tFaq('a3'),
    },
    {
      question: tFaq('q4'),
      answer: tFaq('a4'),
    },
    {
      question: tFaq('q5'),
      answer: tFaq('a5'),
    },
    {
      question: tFaq('q6'),
      answer: tFaq('a6'),
    },
  ];

  return (
    <div className="min-h-screen bg-surface-base">
      {/* Hero */}
      <div className="bg-gradient-to-b from-brand-primary/10 to-surface-base border-b border-border-subtle">
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-primary/20 rounded-full text-brand-primary text-sm mb-6">
            <Book className="h-4 w-4" />
            Documentation
          </div>
          <h1 className="text-4xl font-bold text-neutral-10 mb-4">
            {t('quickStartGuide')}
          </h1>
          <p className="text-lg text-neutral-7 max-w-2xl mx-auto">
            {t('startIn3Min')}
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Quick Start Steps */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-neutral-10 mb-8 flex items-center gap-2">
            <Zap className="h-6 w-6 text-brand-primary" />
            {t('threeSteps')}
          </h2>

          <div className="space-y-6">
            {/* Step 1 */}
            <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-primary text-white flex items-center justify-center font-bold">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-neutral-10 flex items-center gap-2">
                    <Key className="h-5 w-5 text-brand-primary" />
                    {tDocs('getApiKey')}
                  </h3>
                  <p className="text-neutral-7 mt-2 mb-4">
                    {t('getApiKeyDesc')}
                  </p>
                  <a
                    href="/dashboard/api-key"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors"
                  >
                    {t('getApiKey')}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-accent text-white flex items-center justify-center font-bold">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-neutral-10 flex items-center gap-2">
                    <Settings className="h-5 w-5 text-brand-accent" />
                    {tDocs('changeBaseUrl')}
                  </h3>
                  <p className="text-neutral-7 mt-2">
                    {t('changeBaseUrlDesc')}
                  </p>
                  <div className="mt-4 p-3 bg-surface-overlay rounded-lg font-mono text-sm text-neutral-10">
                    base_url=&quot;https://hopllm.com/v1&quot;
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-secondary text-white flex items-center justify-center font-bold">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-neutral-10 flex items-center gap-2">
                    <Code className="h-5 w-5 text-brand-secondary" />
                    {tDocs('useAutoModel')}
                  </h3>
                  <p className="text-neutral-7 mt-2">
                    {t('useAutoDesc')}
                  </p>
                  <div className="mt-4 p-3 bg-surface-overlay rounded-lg font-mono text-sm text-neutral-10">
                    model=&quot;auto&quot; {/* Smart routing! */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Code Examples */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-neutral-10 mb-8 flex items-center gap-2">
            <Terminal className="h-6 w-6 text-brand-accent" />
            {t('codeExamples')}
          </h2>

          <div className="space-y-6">
            {codeExamples.map((example, i) => (
              <div key={i} className="bg-surface-raised border border-border-subtle rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-surface-overlay border-b border-border-subtle">
                  <span className="text-sm text-neutral-7 font-mono">{example.language}</span>
                  <button
                    onClick={() => copyCode(example.code, i)}
                    className="flex items-center gap-1 px-2 py-1 text-sm text-neutral-7 hover:text-neutral-10 transition-colors"
                  >
                    {copiedIndex === i ? (
                      <>
                        <Check className="h-4 w-4 text-semantic-success" />
                        <span className="text-semantic-success">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <pre className="p-4 overflow-x-auto text-sm text-neutral-10 font-mono">
                  <code>{example.code}</code>
                </pre>
              </div>
            ))}
          </div>
        </section>

        {/* Video Demo */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-neutral-10 mb-8 flex items-center gap-2">
            <PlayCircle className="h-6 w-6 text-brand-primary" />
            {t('videoDemo')}
          </h2>

          <div className="bg-surface-raised border border-border-subtle rounded-xl p-8 text-center">
            <div className="w-full aspect-video bg-surface-overlay rounded-lg flex items-center justify-center mb-4">
              <div className="text-center">
                <PlayCircle className="h-16 w-16 text-brand-primary mx-auto mb-4 opacity-50" />
                <p className="text-neutral-7">
                  {t('videoComingSoon')}
                </p>
              </div>
            </div>
            <p className="text-neutral-7 text-sm">
              {t('videoDesc')}
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-neutral-10 mb-8 flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-brand-secondary" />
            {t('faq')}
          </h2>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-surface-raised border border-border-subtle rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-surface-overlay/50 transition-colors"
                >
                  <span className="font-medium text-neutral-10">{faq.question}</span>
                  {expandedFaq === i ? (
                    <ChevronUp className="h-5 w-5 text-neutral-7" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-neutral-7" />
                  )}
                </button>
                {expandedFaq === i && (
                  <div className="px-6 pb-4 text-neutral-7 border-t border-border-subtle pt-4">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-brand-primary/20 to-brand-accent/20 border border-brand-primary/30 rounded-xl p-8 text-center">
          <h2 className="text-2xl font-bold text-neutral-10 mb-4">
            {t('readyToStart')}
          </h2>
          <p className="text-neutral-7 mb-6">
            {t('signUpDesc')}
          </p>
          <div className="flex items-center justify-center gap-4">
            <a
              href="/dashboard/api-key"
              className="px-6 py-3 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 transition-colors font-medium"
            >
              {t('getApiKey')}
            </a>
            <a
              href="/configure"
              className="px-6 py-3 bg-surface-raised text-neutral-10 rounded-lg hover:bg-surface-overlay transition-colors font-medium border border-border-subtle"
            >
              {t('configureProxy')}
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}