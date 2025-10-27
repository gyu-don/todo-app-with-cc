import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    // Note: Using 'node' environment for now (type definition tests)
    // Will switch to '@cloudflare/vitest-pool-workers' for integration tests
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'test/**',
        '**/*.config.*',
        '**/dist/**',
        '**/.wrangler/**',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@models': path.resolve(__dirname, './src/models'),
      '@handlers': path.resolve(__dirname, './src/handlers'),
      '@middleware': path.resolve(__dirname, './src/middleware'),
      '@storage': path.resolve(__dirname, './src/storage'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
});
