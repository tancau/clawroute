import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/toaster";
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

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
    google: 'your-google-verification-code',
  },
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
        </NextIntlClientProvider>
      </body>
    </html>
  );
}