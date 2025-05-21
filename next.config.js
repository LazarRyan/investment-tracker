/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    serverMinification: false,
    serverSourceMaps: false,
    optimizeCss: true,
    optimizePackageImports: ['@supabase/ssr'],
    serverComponentsExternalPackages: ['@supabase/supabase-js'],
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc/core-darwin-*/**/*',
        'node_modules/@swc/core-win32-*/**/*',
        'node_modules/@esbuild/win32-x64/**/*',
        'node_modules/@esbuild/darwin-*/**/*',
        '.git/**',
        '**/*.test.js',
        '**/*.spec.js',
        '**/tests/**',
        '**/__tests__/**',
        '**/README.md',
        '**/LICENSE*',
        '**/*.map',
        '**/jest/**',
        '**/esm/**',
        '**/umd/**',
        '**/analysis-service/**',
        '**/node_modules/typescript/**',
        '**/node_modules/@types/**',
        '**/node_modules/tslib/**'
      ]
    }
  },
  serverRuntimeConfig: {
    PROJECT_ROOT: __dirname
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  }
};

module.exports = nextConfig;