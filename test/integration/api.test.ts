import { describe, it, expect, beforeEach, vi } from 'vitest';
import { env } from 'cloudflare:test';
import app from '../../src/index';

// Workers poolの環境変数を使用
// vitest.config.tsで設定された環境変数とKVバインディングが自動的に利用可能

beforeEach(async () => {
  // テスト前にKVを空にする
  const keys = await env.TODO_KV.list();
  for (const key of keys.keys) {
    await env.TODO_KV.delete(key.name);
  }
});

describe('API Integration Tests', () => {
  describe('Health Check', () => {
    it('should return health status without authentication', async () => {
      const res = await app.request('/', {}, env);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('name', 'Cloudflare Workers Todo API');
      expect(body).toHaveProperty('status', 'healthy');
    });
  });

  describe('CORS', () => {
    it('should include CORS headers in response', async () => {
      const res = await app.request('/', {
        headers: {
          Origin: 'https://example.com',
        },
      }, env);

      expect(res.headers.get('Access-Control-Allow-Origin')).toBeDefined();
    });

    it('should handle OPTIONS preflight request', async () => {
      const res = await app.request('/todos', {
        method: 'OPTIONS',
      }, env);

      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Methods')).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('should reject requests without API key', async () => {
      const res = await app.request('/todos', {
        method: 'GET',
      }, env);

      // 認証エラーの場合は401
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject requests with invalid API key', async () => {
      const res = await app.request('/todos', {
        method: 'GET',
        headers: {
          'X-API-Key': 'invalid-key',
        },
      }, env);

      // 認証エラーの場合は401
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should allow requests with valid API key', async () => {
      const res = await app.request('/todos', {
        method: 'GET',
        headers: {
          'X-API-Key': 'test-api-key',
        },
      }, env);

      // 認証は通るはず（200 OK、空配列）
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
    });
  });

  describe('404 Not Found', () => {
    it('should return 404 for undefined routes', async () => {
      const res = await app.request('/undefined-route', {
        headers: {
          'X-API-Key': 'test-api-key',
        },
      }, env);

      expect(res.status).toBe(404);
      const body = await res.json();
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Error Handling', () => {
    it('should return standardized error response format', async () => {
      const res = await app.request('/todos', {
        method: 'GET',
      }, env);

      // 認証エラー（401）
      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
    });

    it('should not expose stack traces in error responses', async () => {
      const res = await app.request('/todos', {
        method: 'GET',
      }, env);

      const body = await res.json();
      const bodyText = JSON.stringify(body);
      expect(bodyText).not.toContain('at ');
      expect(bodyText).not.toContain('.ts:');
    });
  });

  describe('RESTful Routes', () => {
    it('should define POST /todos route', async () => {
      const res = await app.request('/todos', {
        method: 'POST',
        headers: {
          'X-API-Key': 'test-api-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'Test Todo' }),
      }, env);

      // KV設定済みなので201 Created
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('title', 'Test Todo');
    });

    it('should define GET /todos route', async () => {
      const res = await app.request('/todos', {
        method: 'GET',
        headers: {
          'X-API-Key': 'test-api-key',
        },
      }, env);

      // KV設定済みなので200 OK
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
    });

    it('should define GET /todos/:id route', async () => {
      const res = await app.request('/todos/550e8400-e29b-41d4-a716-446655440000', {
        method: 'GET',
        headers: {
          'X-API-Key': 'test-api-key',
        },
      }, env);

      // 存在しないので404
      expect(res.status).toBe(404);
    });

    it('should define PUT /todos/:id route', async () => {
      const res = await app.request('/todos/550e8400-e29b-41d4-a716-446655440000', {
        method: 'PUT',
        headers: {
          'X-API-Key': 'test-api-key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'Updated' }),
      }, env);

      // 存在しないので404
      expect(res.status).toBe(404);
    });

    it('should define DELETE /todos/:id route', async () => {
      const res = await app.request('/todos/550e8400-e29b-41d4-a716-446655440000', {
        method: 'DELETE',
        headers: {
          'X-API-Key': 'test-api-key',
        },
      }, env);

      // 存在しないので404
      expect(res.status).toBe(404);
    });
  });
});
