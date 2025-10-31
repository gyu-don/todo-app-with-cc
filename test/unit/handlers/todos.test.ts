import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import {
  createTodoHandler,
  getTodosHandler,
  getTodoByIdHandler,
  updateTodoHandler,
  deleteTodoHandler,
} from '../../../src/handlers/todos';
import { IStorage } from '../../../src/storage/interface';
import { Todo } from '../../../src/models/todo';
import { Env } from '../../../src/models/env';

describe('Todo Handlers', () => {
  describe('createTodoHandler()', () => {
    let mockStorage: IStorage;

    beforeEach(() => {
      mockStorage = {
        create: vi.fn(),
        getAll: vi.fn(),
        getById: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };
    });

    it('should create a new todo with valid input', async () => {
      const mockTodo: Todo = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test Todo',
        completed: false,
        createdAt: '2025-10-27T15:00:00.000Z',
        position: 0,
      };

      (mockStorage.getAll as any).mockResolvedValue([]);
      (mockStorage.create as any).mockResolvedValue(mockTodo);

      const app = new Hono<{ Bindings: Env }>();
      app.post('/todos', (c) => createTodoHandler(c, mockStorage));

      const res = await app.request('/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test Todo' }),
      });

      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('title', 'Test Todo');
      expect(body).toHaveProperty('completed', false);
      expect(body).toHaveProperty('createdAt');
    });

    it('should reject empty title', async () => {
      const app = new Hono<{ Bindings: Env }>();
      app.post('/todos', (c) => createTodoHandler(c, mockStorage));

      const res = await app.request('/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '' }),
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject missing title', async () => {
      const app = new Hono<{ Bindings: Env }>();
      app.post('/todos', (c) => createTodoHandler(c, mockStorage));

      const res = await app.request('/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject title exceeding 500 characters', async () => {
      const longTitle = 'a'.repeat(501);
      const app = new Hono<{ Bindings: Env }>();
      app.post('/todos', (c) => createTodoHandler(c, mockStorage));

      const res = await app.request('/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: longTitle }),
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject title with control characters', async () => {
      const app = new Hono<{ Bindings: Env }>();
      app.post('/todos', (c) => createTodoHandler(c, mockStorage));

      const res = await app.request('/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test\x00Todo' }),
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject when todo limit is reached (500)', async () => {
      const existingTodos = Array.from({ length: 500 }, (_, i) => ({
        id: `id-${i}`,
        title: `Todo ${i}`,
        completed: false,
        createdAt: new Date().toISOString(),
        position: i,
      }));

      (mockStorage.getAll as any).mockResolvedValue(existingTodos);

      const app = new Hono<{ Bindings: Env }>();
      app.post('/todos', (c) => createTodoHandler(c, mockStorage));

      const res = await app.request('/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Todo' }),
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe('TODO_LIMIT_REACHED');
    });

    it('should set default values for completed and createdAt', async () => {
      const mockTodo: Todo = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test Todo',
        completed: false,
        createdAt: '2025-10-27T15:00:00.000Z',
        position: 0,
      };

      (mockStorage.getAll as any).mockResolvedValue([]);
      (mockStorage.create as any).mockResolvedValue(mockTodo);

      const app = new Hono<{ Bindings: Env }>();
      app.post('/todos', (c) => createTodoHandler(c, mockStorage));

      const res = await app.request('/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test Todo' }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as {
        id: string;
        title: string;
        completed: boolean;
        createdAt: string;
      };
      expect(body.completed).toBe(false);
      expect(body.createdAt).toBeDefined();
    });

    it('should generate UUID v4 for new todo', async () => {
      const mockTodo: Todo = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test Todo',
        completed: false,
        createdAt: '2025-10-27T15:00:00.000Z',
        position: 0,
      };

      (mockStorage.getAll as any).mockResolvedValue([]);
      (mockStorage.create as any).mockResolvedValue(mockTodo);

      const app = new Hono<{ Bindings: Env }>();
      app.post('/todos', (c) => createTodoHandler(c, mockStorage));

      const res = await app.request('/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test Todo' }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as {
        id: string;
        title: string;
        completed: boolean;
        createdAt: string;
      };
      expect(body.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should call storage.create with correct data', async () => {
      const mockTodo: Todo = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test Todo',
        completed: false,
        createdAt: '2025-10-27T15:00:00.000Z',
        position: 0,
      };

      (mockStorage.getAll as any).mockResolvedValue([]);
      (mockStorage.create as any).mockResolvedValue(mockTodo);

      const app = new Hono<{ Bindings: Env }>();
      app.post('/todos', (c) => createTodoHandler(c, mockStorage));

      await app.request('/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Test Todo' }),
      });

      expect(mockStorage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Todo',
          completed: false,
        })
      );
    });
  });

  describe('getTodosHandler()', () => {
    let mockStorage: IStorage;

    beforeEach(() => {
      mockStorage = {
        create: vi.fn(),
        getAll: vi.fn(),
        getById: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };
    });

    it('should return all todos', async () => {
      const mockTodos: Todo[] = [
        {
          id: '1',
          title: 'Todo 1',
          completed: false,
          createdAt: '2025-10-27T15:00:00.000Z',
          position: 0,
        },
        {
          id: '2',
          title: 'Todo 2',
          completed: true,
          createdAt: '2025-10-27T15:01:00.000Z',
          position: 1,
        },
      ];

      (mockStorage.getAll as any).mockResolvedValue(mockTodos);

      const app = new Hono<{ Bindings: Env }>();
      app.get('/todos', (c) => getTodosHandler(c, mockStorage));

      const res = await app.request('/todos');

      expect(res.status).toBe(200);
      const body = (await res.json()) as Array<{
        id: string;
        title: string;
        completed: boolean;
        createdAt: string;
      }>;
      expect(body).toHaveLength(2);
      expect(body[0]).toHaveProperty('id', '1');
      expect(body[1]).toHaveProperty('id', '2');
    });

    it('should return empty array when no todos exist', async () => {
      (mockStorage.getAll as any).mockResolvedValue([]);

      const app = new Hono<{ Bindings: Env }>();
      app.get('/todos', (c) => getTodosHandler(c, mockStorage));

      const res = await app.request('/todos');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual([]);
    });
  });

  describe('getTodoByIdHandler()', () => {
    let mockStorage: IStorage;

    beforeEach(() => {
      mockStorage = {
        create: vi.fn(),
        getAll: vi.fn(),
        getById: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };
    });

    it('should return todo by id', async () => {
      const mockTodo: Todo = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test Todo',
        completed: false,
        createdAt: '2025-10-27T15:00:00.000Z',
        position: 0,
      };

      (mockStorage.getById as any).mockResolvedValue(mockTodo);

      const app = new Hono<{ Bindings: Env }>();
      app.get('/todos/:id', (c) => getTodoByIdHandler(c, mockStorage));

      const res = await app.request('/todos/550e8400-e29b-41d4-a716-446655440000');

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('id', '550e8400-e29b-41d4-a716-446655440000');
      expect(body).toHaveProperty('title', 'Test Todo');
    });

    it('should return 404 when todo not found', async () => {
      (mockStorage.getById as any).mockResolvedValue(null);

      const app = new Hono<{ Bindings: Env }>();
      app.get('/todos/:id', (c) => getTodoByIdHandler(c, mockStorage));

      const res = await app.request('/todos/550e8400-e29b-41d4-a716-446655440000');

      expect(res.status).toBe(404);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should reject invalid UUID', async () => {
      const app = new Hono<{ Bindings: Env }>();
      app.get('/todos/:id', (c) => getTodoByIdHandler(c, mockStorage));

      const res = await app.request('/todos/invalid-id');

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('updateTodoHandler()', () => {
    let mockStorage: IStorage;

    beforeEach(() => {
      mockStorage = {
        create: vi.fn(),
        getAll: vi.fn(),
        getById: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };
    });

    it('should update todo with valid data', async () => {
      const updatedTodo: Todo = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Updated Title',
        completed: true,
        createdAt: '2025-10-27T15:00:00.000Z',
        position: 0,
      };

      (mockStorage.update as any).mockResolvedValue(updatedTodo);

      const app = new Hono<{ Bindings: Env }>();
      app.put('/todos/:id', (c) => updateTodoHandler(c, mockStorage));

      const res = await app.request('/todos/550e8400-e29b-41d4-a716-446655440000', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title', completed: true }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('title', 'Updated Title');
      expect(body).toHaveProperty('completed', true);
    });

    it('should return 404 when todo not found', async () => {
      (mockStorage.update as any).mockResolvedValue(null);

      const app = new Hono<{ Bindings: Env }>();
      app.put('/todos/:id', (c) => updateTodoHandler(c, mockStorage));

      const res = await app.request('/todos/550e8400-e29b-41d4-a716-446655440000', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated Title' }),
      });

      expect(res.status).toBe(404);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should reject empty update data', async () => {
      const app = new Hono<{ Bindings: Env }>();
      app.put('/todos/:id', (c) => updateTodoHandler(c, mockStorage));

      const res = await app.request('/todos/550e8400-e29b-41d4-a716-446655440000', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject invalid UUID', async () => {
      const app = new Hono<{ Bindings: Env }>();
      app.put('/todos/:id', (c) => updateTodoHandler(c, mockStorage));

      const res = await app.request('/todos/invalid-id', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('deleteTodoHandler()', () => {
    let mockStorage: IStorage;

    beforeEach(() => {
      mockStorage = {
        create: vi.fn(),
        getAll: vi.fn(),
        getById: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };
    });

    it('should delete todo successfully', async () => {
      (mockStorage.delete as any).mockResolvedValue(true);

      const app = new Hono<{ Bindings: Env }>();
      app.delete('/todos/:id', (c) => deleteTodoHandler(c, mockStorage));

      const res = await app.request('/todos/550e8400-e29b-41d4-a716-446655440000', {
        method: 'DELETE',
      });

      expect(res.status).toBe(204);
    });

    it('should return 404 when todo not found', async () => {
      (mockStorage.delete as any).mockResolvedValue(false);

      const app = new Hono<{ Bindings: Env }>();
      app.delete('/todos/:id', (c) => deleteTodoHandler(c, mockStorage));

      const res = await app.request('/todos/550e8400-e29b-41d4-a716-446655440000', {
        method: 'DELETE',
      });

      expect(res.status).toBe(404);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe('NOT_FOUND');
    });

    it('should reject invalid UUID', async () => {
      const app = new Hono<{ Bindings: Env }>();
      app.delete('/todos/:id', (c) => deleteTodoHandler(c, mockStorage));

      const res = await app.request('/todos/invalid-id', {
        method: 'DELETE',
      });

      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: { code: string; message: string } };
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
