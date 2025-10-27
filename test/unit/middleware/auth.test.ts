import { describe, it, expect, vi } from 'vitest';
import { Hono } from 'hono';
import { apiKeyAuth } from '../../../src/middleware/auth';
import { Env } from '../../../src/models/env';

describe('Authentication Middleware', () => {
  describe('apiKeyAuth()', () => {
    it('should allow request with valid API key', async () => {
      const app = new Hono<{ Bindings: Env }>();

      // モック環境変数を設定
      app.use('*', async (c, next) => {
        c.env = {
          VALID_API_KEYS: 'key1,key2,key3',
        } as Env;
        await next();
      });

      app.use('*', apiKeyAuth);
      app.get('/test', (c) => c.json({ success: true }));

      const res = await app.request('/test', {
        headers: {
          'X-API-Key': 'key2',
        },
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({ success: true });
    });

    it('should reject request without API key header', async () => {
      const app = new Hono<{ Bindings: Env }>();

      app.use('*', async (c, next) => {
        c.env = {
          VALID_API_KEYS: 'key1,key2,key3',
        } as Env;
        await next();
      });

      app.use('*', apiKeyAuth);
      app.get('/test', (c) => c.json({ success: true }));

      const res = await app.request('/test');

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toHaveProperty('error');
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(body.error.message).toContain('API key');
    });

    it('should reject request with invalid API key', async () => {
      const app = new Hono<{ Bindings: Env }>();

      app.use('*', async (c, next) => {
        c.env = {
          VALID_API_KEYS: 'key1,key2,key3',
        } as Env;
        await next();
      });

      app.use('*', apiKeyAuth);
      app.get('/test', (c) => c.json({ success: true }));

      const res = await app.request('/test', {
        headers: {
          'X-API-Key': 'invalid-key',
        },
      });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toHaveProperty('error');
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should handle empty API key', async () => {
      const app = new Hono<{ Bindings: Env }>();

      app.use('*', async (c, next) => {
        c.env = {
          VALID_API_KEYS: 'key1,key2,key3',
        } as Env;
        await next();
      });

      app.use('*', apiKeyAuth);
      app.get('/test', (c) => c.json({ success: true }));

      const res = await app.request('/test', {
        headers: {
          'X-API-Key': '',
        },
      });

      expect(res.status).toBe(401);
    });

    it('should handle multiple valid keys', async () => {
      const app = new Hono<{ Bindings: Env }>();

      app.use('*', async (c, next) => {
        c.env = {
          VALID_API_KEYS: 'key1,key2,key3,key4,key5',
        } as Env;
        await next();
      });

      app.use('*', apiKeyAuth);
      app.get('/test', (c) => c.json({ success: true }));

      // Test all valid keys
      const validKeys = ['key1', 'key2', 'key3', 'key4', 'key5'];

      for (const key of validKeys) {
        const res = await app.request('/test', {
          headers: {
            'X-API-Key': key,
          },
        });

        expect(res.status).toBe(200);
      }
    });

    it('should handle VALID_API_KEYS with spaces', async () => {
      const app = new Hono<{ Bindings: Env }>();

      app.use('*', async (c, next) => {
        c.env = {
          VALID_API_KEYS: 'key1, key2 , key3',
        } as Env;
        await next();
      });

      app.use('*', apiKeyAuth);
      app.get('/test', (c) => c.json({ success: true }));

      const res = await app.request('/test', {
        headers: {
          'X-API-Key': 'key2',
        },
      });

      expect(res.status).toBe(200);
    });

    it('should reject when VALID_API_KEYS is undefined', async () => {
      const app = new Hono<{ Bindings: Env }>();

      app.use('*', async (c, next) => {
        c.env = {} as Env;
        await next();
      });

      app.use('*', apiKeyAuth);
      app.get('/test', (c) => c.json({ success: true }));

      const res = await app.request('/test', {
        headers: {
          'X-API-Key': 'any-key',
        },
      });

      expect(res.status).toBe(401);
    });

    it('should reject when VALID_API_KEYS is empty string', async () => {
      const app = new Hono<{ Bindings: Env }>();

      app.use('*', async (c, next) => {
        c.env = {
          VALID_API_KEYS: '',
        } as Env;
        await next();
      });

      app.use('*', apiKeyAuth);
      app.get('/test', (c) => c.json({ success: true }));

      const res = await app.request('/test', {
        headers: {
          'X-API-Key': 'any-key',
        },
      });

      expect(res.status).toBe(401);
    });

    it('should return proper error response format', async () => {
      const app = new Hono<{ Bindings: Env }>();

      app.use('*', async (c, next) => {
        c.env = {
          VALID_API_KEYS: 'valid-key',
        } as Env;
        await next();
      });

      app.use('*', apiKeyAuth);
      app.get('/test', (c) => c.json({ success: true }));

      const res = await app.request('/test', {
        headers: {
          'X-API-Key': 'invalid',
        },
      });

      expect(res.status).toBe(401);
      expect(res.headers.get('Content-Type')).toBe('application/json');

      const body = await res.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
      expect(body.error.code).toBe('UNAUTHORIZED');
      expect(typeof body.error.message).toBe('string');
    });
  });
});
