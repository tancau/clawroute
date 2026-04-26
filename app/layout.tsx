import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/toaster";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "HopLLM (智跳) - Smart Routing API Proxy | Save 80% on AI Costs",
    template: "%s | HopLLM",
  },
  description: "HopLLM is an intelligent routing API proxy that automatically selects the optimal AI model for your requests. Save up to 80% on API costs with OpenAI-compatible API, zero migration cost.",
  keywords: [
    'HopLLM',
    '智跳',
    'AI routing',
    'API proxy',
    'OpenAI alternative',
    'LLM optimization',
    'cost savings',
    'smart routing',
    'AI API',
    'GPT-4 alternative',
    'Claude API',
    'model selection',
    'API gateway',
    'AI cost reduction',
    'OpenAI compatible',
    'LLM proxy',
  ],
  authors: [{ name: 'HopLLM Team' }],
  creator: 'HopLLM',
  publisher: 'HopLLM',
  metadataBase: new URL('https://hopllm.com'),
  alternates: {
    canonical: '/',
    languages: {
      'en-US': '/en',
      'zh-CN': '/zh',
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'zh_CN',
    url: 'https://hopllm.com',
    siteName: 'HopLLM',
    title: 'HopLLM (智跳) - Smart Routing API Proxy',
    description: 'Save up to 80% on AI API costs with intelligent routing. OpenAI-compatible API, zero migration cost.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'HopLLM - Smart Routing API Proxy',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HopLLM (智跳) - Smart Routing API Proxy',
    description: 'Save up to 80% on AI API costs with intelligent routing. OpenAI-compatible API, zero migration cost.',
    images: ['/og-image.png'],
    creator: '@hopllm',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'google-site-verification-code',
  },
};

// JSON-LD Structured Data for SEO
export const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://hopllm.com/#organization',
      name: 'HopLLM',
      url: 'https://hopllm.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://hopllm.com/logo.png',
      },
      sameAs: [
        'https://github.com/tancau/hopllm',
        'https://twitter.com/hopllm',
      ],
    },
    {
      '@type': 'WebApplication',
      '@id': 'https://hopllm.com/#webapp',
      name: 'HopLLM',
      alternateName: '智跳',
      description: 'Smart LLM routing API proxy that saves 60-80% on AI API costs with intelligent model selection.',
      url: 'https://hopllm.com',
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        priceType: 'Free',
      },
      browserRequirements: 'Requires JavaScript',
      softwareVersion: '1.0',
      provider: { '@id': 'https://hopllm.com/#organization' },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://hopllm.com/#software',
      name: 'HopLLM',
      description: 'Intelligent routing API proxy for LLM calls — saves 60-80% on API costs by automatically selecting the optimal model.',
      url: 'https://hopllm.com',
      applicationCategory: 'DeveloperApplication',
      programmingLanguage: 'TypeScript',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
    },
    {
      '@type': 'FAQPage',
      '@id': 'https://hopllm.com/#faq',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'How does HopLLM save API costs?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'HopLLM uses intelligent routing to automatically select the optimal LLM for each request based on complexity, context, and cost. Simple queries go to cheaper models while complex tasks use advanced models — saving 60-80% on average.',
          },
        },
        {
          '@type': 'Question',
          name: 'Is HopLLM compatible with OpenAI API?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. HopLLM provides an OpenAI-compatible API endpoint. You can switch to HopLLM by just changing the base URL — zero migration cost.',
          },
        },
        {
          '@type': 'Question',
          name: 'Which models does HopLLM support?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'HopLLM supports 24+ models including GPT-4, GPT-3.5, Claude, Gemini, DeepSeek, Qwen, Llama, and more through OpenRouter integration.',
          },
        },
      ],
    },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Theme script to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = JSON.parse(localStorage.getItem('clawroute-theme') || '{}');
                  var theme = stored.state && stored.state.theme || 'dark';
                  var resolved = theme;
                  if (theme === 'system') {
                    resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  }
                  if (resolved === 'light') {
                    document.documentElement.classList.add('light');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
          <Toaster />
          <Analytics />
          <SpeedInsights />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}