/** @type {import('next').NextConfig} */
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');

const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    serverMinification: true,
    serverSourceMaps: false,
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
      };
    }

    return config;
  },
}

module.exports = nextConfig 