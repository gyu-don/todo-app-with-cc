import { describe, it, expect, beforeEach } from 'vitest';
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
      const res = await app.request(
        '/',
        {
          headers: {
            Origin: 'https://example.com',
          },
        },
        env
      );

      expect(res.headers.get('Access-Control-Allow-Origin')).toBeDefined();
    });

    it('should handle OPTIONS preflight request', async () => {
      const res = await app.request(
        '/todos',
        {
          method: 'OPTIONS',
        },
        env
      );

      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Methods')).toBeDefined();
    });
  });

  describe('Authentication', () => {
    it('should reject requests without API key', async () => {
      const res = await app.request(
        '/todos',
        {
          method: 'GET',
        },
        env
      );

      // 認証エラーの場合は401
      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject requests with invalid API key', async () => {
      const res = await app.request(
        '/todos',
        {
          method: 'GET',
          headers: {
            'X-API-Key': 'invalid-key',
          },
        },
        env
      );

      // 認証エラーの場合は401
      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should allow requests with valid API key', async () => {
      const res = await app.request(
        '/todos',
        {
          method: 'GET',
          headers: {
            'X-API-Key': 'test-api-key',
          },
        },
        env
      );

      // 認証は通るはず（200 OK、空配列）
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
    });
  });

  describe('404 Not Found', () => {
    it('should return 404 for undefined routes', async () => {
      const res = await app.request(
        '/undefined-route',
        {
          headers: {
            'X-API-Key': 'test-api-key',
          },
        },
        env
      );

      expect(res.status).toBe(404);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Error Handling', () => {
    it('should return standardized error response format', async () => {
      const res = await app.request(
        '/todos',
        {
          method: 'GET',
        },
        env
      );

      // 認証エラー（401）
      expect(res.status).toBe(401);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
    });

    it('should not expose stack traces in error responses', async () => {
      const res = await app.request(
        '/todos',
        {
          method: 'GET',
        },
        env
      );

      const body = await res.json();
      const bodyText = JSON.stringify(body);
      expect(bodyText).not.toContain('at ');
      expect(bodyText).not.toContain('.ts:');
    });
  });

  describe('RESTful Routes', () => {
    it('should define POST /todos route', async () => {
      const res = await app.request(
        '/todos',
        {
          method: 'POST',
          headers: {
            'X-API-Key': 'test-api-key',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title: 'Test Todo' }),
        },
        env
      );

      // KV設定済みなので201 Created
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('title', 'Test Todo');
    });

    it('should define GET /todos route', async () => {
      const res = await app.request(
        '/todos',
        {
          method: 'GET',
          headers: {
            'X-API-Key': 'test-api-key',
          },
        },
        env
      );

      // KV設定済みなので200 OK
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body)).toBe(true);
    });

    it('should define GET /todos/:id route', async () => {
      const res = await app.request(
        '/todos/550e8400-e29b-41d4-a716-446655440000',
        {
          method: 'GET',
          headers: {
            'X-API-Key': 'test-api-key',
          },
        },
        env
      );

      // 存在しないので404
      expect(res.status).toBe(404);
    });

    it('should define PUT /todos/:id route', async () => {
      const res = await app.request(
        '/todos/550e8400-e29b-41d4-a716-446655440000',
        {
          method: 'PUT',
          headers: {
            'X-API-Key': 'test-api-key',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title: 'Updated' }),
        },
        env
      );

      // 存在しないので404
      expect(res.status).toBe(404);
    });

    it('should define DELETE /todos/:id route', async () => {
      const res = await app.request(
        '/todos/550e8400-e29b-41d4-a716-446655440000',
        {
          method: 'DELETE',
          headers: {
            'X-API-Key': 'test-api-key',
          },
        },
        env
      );

      // 存在しないので404
      expect(res.status).toBe(404);
    });
  });

  describe('CRUD Flow Integration', () => {
    it('should create todo, retrieve it, and verify data matches', async () => {
      // POST /todos - Create
      const createRes = await app.request(
        '/todos',
        {
          method: 'POST',
          headers: {
            'X-API-Key': 'test-api-key',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title: 'CRUD Test Todo' }),
        },
        env
      );

      expect(createRes.status).toBe(201);
      const created = (await createRes.json()) as {
        id: string;
        title: string;
        completed: boolean;
        createdAt: string;
      };
      expect(created).toHaveProperty('id');
      expect(created.title).toBe('CRUD Test Todo');
      expect(created.completed).toBe(false);

      // GET /todos/:id - Retrieve
      const getRes = await app.request(
        `/todos/${created.id}`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': 'test-api-key',
          },
        },
        env
      );

      expect(getRes.status).toBe(200);
      const retrieved = await getRes.json();
      expect(retrieved).toEqual(created);
    });

    it('should update todo and verify changes persist', async () => {
      // Create todo first
      const createRes = await app.request(
        '/todos',
        {
          method: 'POST',
          headers: {
            'X-API-Key': 'test-api-key',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title: 'Original Title' }),
        },
        env
      );

      const created = (await createRes.json()) as {
        id: string;
        title: string;
        completed: boolean;
        createdAt: string;
      };

      // PUT /todos/:id - Update
      const updateRes = await app.request(
        `/todos/${created.id}`,
        {
          method: 'PUT',
          headers: {
            'X-API-Key': 'test-api-key',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title: 'Updated Title', completed: true }),
        },
        env
      );

      expect(updateRes.status).toBe(200);
      const updated = (await updateRes.json()) as {
        id: string;
        title: string;
        completed: boolean;
        createdAt: string;
      };
      expect(updated.title).toBe('Updated Title');
      expect(updated.completed).toBe(true);
      expect(updated.id).toBe(created.id); // ID unchanged
      expect(updated.createdAt).toBe(created.createdAt); // createdAt unchanged

      // GET /todos/:id - Verify update persisted
      const getRes = await app.request(
        `/todos/${created.id}`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': 'test-api-key',
          },
        },
        env
      );

      const retrieved = await getRes.json();
      expect(retrieved).toEqual(updated);
    });

    it('should delete todo and verify it no longer exists', async () => {
      // Create todo first
      const createRes = await app.request(
        '/todos',
        {
          method: 'POST',
          headers: {
            'X-API-Key': 'test-api-key',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title: 'To Be Deleted' }),
        },
        env
      );

      const created = (await createRes.json()) as {
        id: string;
        title: string;
        completed: boolean;
        createdAt: string;
      };

      // DELETE /todos/:id - Delete
      const deleteRes = await app.request(
        `/todos/${created.id}`,
        {
          method: 'DELETE',
          headers: {
            'X-API-Key': 'test-api-key',
          },
        },
        env
      );

      expect(deleteRes.status).toBe(204);

      // GET /todos/:id - Verify 404
      const getRes = await app.request(
        `/todos/${created.id}`,
        {
          method: 'GET',
          headers: {
            'X-API-Key': 'test-api-key',
          },
        },
        env
      );

      expect(getRes.status).toBe(404);
      const body = (await getRes.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should retrieve multiple todos via GET /todos', async () => {
      // Create multiple todos
      const todo1Res = await app.request(
        '/todos',
        {
          method: 'POST',
          headers: {
            'X-API-Key': 'test-api-key',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title: 'Todo 1' }),
        },
        env
      );

      const todo2Res = await app.request(
        '/todos',
        {
          method: 'POST',
          headers: {
            'X-API-Key': 'test-api-key',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title: 'Todo 2' }),
        },
        env
      );

      const todo1 = (await todo1Res.json()) as {
        id: string;
        title: string;
        completed: boolean;
        createdAt: string;
      };
      const todo2 = (await todo2Res.json()) as {
        id: string;
        title: string;
        completed: boolean;
        createdAt: string;
      };

      // GET /todos - Retrieve all
      const getAllRes = await app.request(
        '/todos',
        {
          method: 'GET',
          headers: {
            'X-API-Key': 'test-api-key',
          },
        },
        env
      );

      expect(getAllRes.status).toBe(200);
      const allTodos = (await getAllRes.json()) as Array<{
        id: string;
        title: string;
        completed: boolean;
        createdAt: string;
      }>;
      expect(Array.isArray(allTodos)).toBe(true);
      expect(allTodos.length).toBeGreaterThanOrEqual(2);

      // Verify both todos are in the list
      const ids = allTodos.map((t) => t.id);
      expect(ids).toContain(todo1.id);
      expect(ids).toContain(todo2.id);
    });
  });
});
