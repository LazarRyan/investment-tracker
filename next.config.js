/** @type {import('next').NextConfig} */
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    serverMinification: true,
    serverSourceMaps: false,
    optimizeCss: true,
    optimizePackageImports: ['@supabase/ssr']
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

    return config;
  },
  outputFileTracing: true,
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@swc/core-linux-x64-gnu',
      'node_modules/@swc/core-linux-x64-musl',
      'node_modules/@esbuild/linux-x64',
      '.git/**',
      '**/*.map',
      '**/*.test.*'
    ]
  }
}

module.exports = nextConfig 