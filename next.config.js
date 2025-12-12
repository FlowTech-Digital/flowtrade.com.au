const { initOpenNextCloudflareForDev } = require("@opennextjs/cloudflare");

initOpenNextCloudflareForDev();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force unique build ID to regenerate all chunks
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
  
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
  
  // DM-08 Webpack Fix: Experimental optimizations
  experimental: {
    // Tree-shake large icon/component libraries
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons', '@radix-ui/react-slot'],
  },
  
  // DM-08 Webpack Fix: Server external packages
  // Prevents Supabase from being bundled into client chunks
  serverExternalPackages: ['@supabase/supabase-js'],
  
  // DM-08 Webpack Fix: Custom webpack configuration for chunk splitting
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Override splitChunks to prevent tiny orphan chunks
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        minSize: 50000, // 50KB minimum - prevents tiny chunks like 1695
        maxSize: 200000, // 200KB max - keeps chunks manageable
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          // Force vendor chunks for common libraries
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          // Consolidate Radix UI components
          radix: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'radix-ui',
            chunks: 'all',
            priority: 20,
          },
          // Consolidate Lucide icons
          lucide: {
            test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            name: 'lucide-icons',
            chunks: 'all',
            priority: 20,
          },
        },
      };
    }
    return config;
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
