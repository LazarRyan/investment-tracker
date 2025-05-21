/** @type {import('next').NextConfig} */
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');

const nextConfig = {
  reactStrictMode: true,
  // Consolidated output configuration
  output: 'standalone',
  experimental: {
    serverMinification: true,
    serverSourceMaps: false,
    optimizeCss: true,
    optimizePackageImports: ['@supabase/ssr', 'openai'],
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc/core-darwin-*/**/*',
        'node_modules/@swc/core-win32-*/**/*',
        'node_modules/@esbuild/win32-x64/**/*',
        'node_modules/@esbuild/darwin-*/**/*',
        'node_modules/openai/dist/**/*.browser.js',
        'node_modules/openai/dist/**/*.min.js',
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
        '**/umd/**'
      ]
    }
  },
  webpack: (config, { isServer }) => {
    // Add case sensitivity plugin
    config.plugins = config.plugins || [];
    config.plugins.push(new CaseSensitivePathsPlugin());

    // Optimize the build
    if (isServer) {
      config.optimization = {
        ...config.optimization,
        minimize: true,
        concatenateModules: true,
        moduleIds: 'deterministic'
      };

      // Exclude unnecessary packages from the server build
      config.externals = [...(config.externals || []), {
        '@swc/core-linux-x64-gnu': 'commonjs @swc/core-linux-x64-gnu',
        '@swc/core-linux-x64-musl': 'commonjs @swc/core-linux-x64-musl',
        '@esbuild/linux-x64': 'commonjs @esbuild/linux-x64',
        'encoding': 'commonjs encoding'
      }];
    }

    return config;
  }
}

module.exports = nextConfig