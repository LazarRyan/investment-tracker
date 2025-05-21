/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    serverMinification: true,
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
        '**/analysis-service/**'
      ]
    }
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
        concatenateModules: true,
        mangleExports: true
      };
    }
    return config;
  }
};

module.exports = nextConfig;