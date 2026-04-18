import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  // Exclude backend directory from Next.js compilation
  experimental: {
    outputFileTracingExcludes: {
      '*': ['./backend/**'],
    },
  },
};

export default withNextIntl(nextConfig);
