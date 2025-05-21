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