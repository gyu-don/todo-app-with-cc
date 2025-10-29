// Type definitions for cloudflare:test module
// This module is provided by @cloudflare/vitest-pool-workers

declare module 'cloudflare:test' {
  import type { KVNamespace } from '@cloudflare/workers-types';

  export interface TestEnv {
    TODO_KV: KVNamespace;
    VALID_API_KEYS: string;
    ALLOWED_ORIGINS: string;
  }

  export const env: TestEnv;
}
