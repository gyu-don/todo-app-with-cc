import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { configureCors } from '../../../src/middleware/cors';
import { Env } from '../../../src/models/env';

describe('CORS Middleware', () => {
  describe('configureCors()', () => {
    it('should add CORS headers to response', async () => {
      const app = new Hono<{ Bindings: Env }>();

      app.use('*', async (c, next) => {
        c.env = {
          ALLOWED_ORIGINS: '*',
        } as Env;
        await next();
      });

      app.use('*', configureCors);
      app.get('/test', (c) => c.json({ success: true }));

      const res = await app.request('/test');

      expect(res.headers.get('Access-Control-Allow-Origin')).toBeDefined();
    });

    it('should handle OPTIONS preflight request', async () => {
      const app = new Hono<{ Bindings: Env }>();

      app.use('*', async (c, next) => {
        c.env = {
          ALLOWED_ORIGINS: '*',
        } as Env;
        await next();
      });

      app.use('*', configureCors);
      app.get('/test', (c) => c.json({ success: true }));

      const res = await app.request('/test', {
        method: 'OPTIONS',
      });

      expect(res.status).toBe(204);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBeDefined();
      expect(res.headers.get('Access-Control-Allow-Methods')).toBeDefined();
    });

    it('should use wildcard origin when ALLOWED_ORIGINS is "*"', async () => {
      const app = new Hono<{ Bindings: Env }>();

      app.use('*', async (c, next) => {
        c.env = {
          ALLOWED_ORIGINS: '*',
        } as Env;
        await next();
      });

      app.use('*', configureCors);
      app.get('/test', (c) => c.json({ success: true }));

      const res = await app.request('/test', {
        headers: {
          Origin: 'https://example.com',
        },
      });

      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('should use wildcard when ALLOWED_ORIGINS is undefined', async () => {
      const app = new Hono<{ Bindings: Env }>();

      app.use('*', async (c, next) => {
        c.env = {} as Env;
        await next();
      });

      app.use('*', configureCors);
      app.get('/test', (c) => c.json({ success: true }));

      const res = await app.request('/test');

      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });

    it('should parse comma-separated origins', async () => {
      const app = new Hono<{ Bindings: Env }>();

      app.use('*', async (c, next) => {
        c.env = {
          ALLOWED_ORIGINS: 'https://app.example.com,https://todo.example.com',
        } as Env;
        await next();
      });

      app.use('*', configureCors);
      app.get('/test', (c) => c.json({ success: true }));

      const res = await app.request('/test', {
        headers: {
          Origin: 'https://app.example.com',
        },
      });

      const allowedOrigin = res.headers.get('Access-Control-Allow-Origin');
      expect(allowedOrigin).toBeTruthy();
    });

    it('should trim whitespace from origins', async () => {
      const app = new Hono<{ Bindings: Env }>();

      app.use('*', async (c, next) => {
        c.env = {
          ALLOWED_ORIGINS: 'https://app.example.com , https://todo.example.com',
        } as Env;
        await next();
      });

      app.use('*', configureCors);
      app.get('/test', (c) => c.json({ success: true }));

      const res = await app.request('/test', {
        headers: {
          Origin: 'https://app.example.com',
        },
      });

      expect(res.status).toBe(200);
    });

    it('should allow specified HTTP methods', async () => {
      const app = new Hono<{ Bindings: Env }>();

      app.use('*', async (c, next) => {
        c.env = {
          ALLOWED_ORIGINS: '*',
        } as Env;
        await next();
      });

      app.use('*', configureCors);
      app.get('/test', (c) => c.json({ success: true }));

      const res = await app.request('/test', {
        method: 'OPTIONS',
      });

      const allowedMethods = res.headers.get('Access-Control-Allow-Methods');
      expect(allowedMethods).toBeDefined();
      expect(allowedMethods).toContain('GET');
      expect(allowedMethods).toContain('POST');
      expect(allowedMethods).toContain('PUT');
      expect(allowedMethods).toContain('DELETE');
      expect(allowedMethods).toContain('OPTIONS');
    });

    it('should allow Content-Type and X-API-Key headers', async () => {
      const app = new Hono<{ Bindings: Env }>();

      app.use('*', async (c, next) => {
        c.env = {
          ALLOWED_ORIGINS: '*',
        } as Env;
        await next();
      });

      app.use('*', configureCors);
      app.get('/test', (c) => c.json({ success: true }));

      const res = await app.request('/test', {
        method: 'OPTIONS',
      });

      const allowedHeaders = res.headers.get('Access-Control-Allow-Headers');
      expect(allowedHeaders).toBeDefined();
      expect(allowedHeaders).toContain('Content-Type');
      expect(allowedHeaders).toContain('X-API-Key');
    });

    it('should handle empty ALLOWED_ORIGINS as wildcard', async () => {
      const app = new Hono<{ Bindings: Env }>();

      app.use('*', async (c, next) => {
        c.env = {
          ALLOWED_ORIGINS: '',
        } as Env;
        await next();
      });

      app.use('*', configureCors);
      app.get('/test', (c) => c.json({ success: true }));

      const res = await app.request('/test');

      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*');
    });
  });
});
