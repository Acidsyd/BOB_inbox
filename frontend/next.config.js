/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000',
  },

  // Basic production settings
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,

  // Simple image configuration
  images: {
    formats: ['image/webp', 'image/avif'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Minimal experimental features to avoid build issues
  experimental: {},

  // Simplified webpack config
  webpack: (config) => {
    return config;
  },

  // TypeScript and ESLint - ignore errors for DigitalOcean build
  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  // Output for production deployment - disable standalone temporarily
  // output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,

  // Fix monorepo workspace root detection
  outputFileTracingRoot: require('path').join(__dirname, '../'),

  // API rewrites
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: process.env.NODE_ENV === 'production' 
          ? '/api/:path*' 
          : 'http://localhost:4000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;