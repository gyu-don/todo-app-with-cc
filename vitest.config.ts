import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'miniflare',
    environmentOptions: {
      bindings: {
        TODO_KV: 'TODO_KV',
        VALID_API_KEYS: 'test-key-1,test-key-2',
        ALLOWED_ORIGINS: '*',
      },
      kvNamespaces: ['TODO_KV'],
    },
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
