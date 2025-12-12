const { initOpenNextCloudflareForDev } = require("@opennextjs/cloudflare");
const webpack = require('webpack');

initOpenNextCloudflareForDev();

// Force unique build ID - changes every build
const BUILD_TIMESTAMP = Date.now();

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force unique build ID to regenerate all chunks
  generateBuildId: async () => {
    return `build-${BUILD_TIMESTAMP}`;
  },
  
  // Image optimization - use CloudFlare Images or disable
  images: {
    unoptimized: true,
  },
  
  // Strict mode for better debugging
  reactStrictMode: true,
  
  // TypeScript strict checking
  typescript: {
    ignoreBuildErrors: false,
  },
  
  // ESLint
  eslint: {
    ignoreDuringBuilds: false,
  },
  
  // Environment variables that should be available client-side
  env: {
    NEXT_PUBLIC_APP_NAME: 'FlowTrade',
    NEXT_PUBLIC_APP_URL: 'https://flowtrade.com.au',
    // Force chunk hash regeneration
    NEXT_PUBLIC_BUILD_TIME: String(BUILD_TIMESTAMP),
  },
  
  // DM-08 Webpack Fix: Experimental optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons', '@radix-ui/react-slot'],
  },
  
  // DM-08 Webpack Fix: Server external packages
  serverExternalPackages: ['@supabase/supabase-js'],
  
  // DM-08 Webpack Fix: Custom webpack configuration for chunk splitting
  webpack: (config, { isServer }) => {
    // Add DefinePlugin to embed build timestamp - forces new chunk hashes
    config.plugins.push(
      new webpack.DefinePlugin({
        '__BUILD_TIMESTAMP__': JSON.stringify(BUILD_TIMESTAMP),
      })
    );
    
    if (!isServer) {
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        minSize: 50000,
        maxSize: 200000,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          radix: {
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            name: 'radix-ui',
            chunks: 'all',
            priority: 20,
          },
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
