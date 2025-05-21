/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
  }
};

module.exports = nextConfig;