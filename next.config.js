/** @type {import('next').NextConfig} */
const nextConfig = {
  // Optimize for CloudFlare Pages
  output: 'standalone',
  
  // Image optimization - use CloudFlare Images or disable
  images: {
    unoptimized: true,
  },
  
  // Strict mode for better debugging
  reactStrictMode: true,
  
  // TypeScript strict checking
  typescript: {
    // Don't fail build on type errors during development
    // Set to true for production CI/CD
    ignoreBuildErrors: false,
  },
  
  // ESLint
  eslint: {
    // Run linting during build
    ignoreDuringBuilds: false,
  },
  
  // Environment variables that should be available client-side
  env: {
    NEXT_PUBLIC_APP_NAME: 'FlowTrade',
    NEXT_PUBLIC_APP_URL: 'https://flowtrade.com.au',
  },
  
  // Headers for security
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
