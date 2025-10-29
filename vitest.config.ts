import { defineConfig } from 'vitest/config';
import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import path from 'path';

export default defineWorkersConfig({
  test: {
    globals: true,
    // Disable snapshot serialization to avoid compatibility issues
    snapshotSerializers: [],
    // Use Cloudflare Workers pool for integration tests
    poolOptions: {
      workers: {
        wrangler: {
          configPath: './wrangler.toml',
        },
        miniflare: {
          // Workers KV binding for tests
          kvNamespaces: {
            TODO_KV: 'test-todo-kv',
          },
          // Environment variables for tests
          bindings: {
            VALID_API_KEYS: 'test-api-key,another-test-key',
            ALLOWED_ORIGINS: '*',
          },
        },
      },
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
