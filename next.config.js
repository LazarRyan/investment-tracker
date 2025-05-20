/** @type {import('next').NextConfig} */
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');

const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Add case sensitivity plugin
    config.plugins = config.plugins || [];
    config.plugins.push(new CaseSensitivePathsPlugin());

    return config;
  },
}

module.exports = nextConfig 