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
    optimizePackageImports: ['@supabase/ssr'],
    // Add file tracing excludes with the correct property name
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc/core-darwin-arm64',
        'node_modules/@swc/core-darwin-x64',
        'node_modules/@swc/core-win32-arm64-msvc',
        'node_modules/@swc/core-win32-ia32-msvc',
        'node_modules/@swc/core-win32-x64-msvc',
        'node_modules/@esbuild/win32-x64',
        'node_modules/@esbuild/darwin-x64',
        'node_modules/@esbuild/darwin-arm64',
        '.git/**',
        '.github/**',
        '**/*.test.js',
        '**/*.spec.js',
        '**/tests/**',
        '**/__tests__/**',
        '**/README.md',
        '**/CHANGELOG.md',
        '**/LICENSE',
        '**/TS_EXCLUDED_FILES.txt',
        '**/*.d.ts.map',
      ]
    }
  },
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
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
    }

    // Exclude unnecessary files
    if (isServer) {
      config.externals = [...(config.externals || []), {
        '@swc/core-linux-x64-gnu': 'commonjs @swc/core-linux-x64-gnu',
        '@swc/core-linux-x64-musl': 'commonjs @swc/core-linux-x64-musl',
        '@esbuild/linux-x64': 'commonjs @esbuild/linux-x64'
      }];
    }

    return config;
  }
}

module.exports = nextConfig