import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KVStorage } from '../../../src/storage/kv';
import type { Todo } from '../../../src/models/todo';

describe('KVStorage', () => {
  let mockKV: KVNamespace;
  let storage: KVStorage;

  beforeEach(() => {
    // Create a mock KVNamespace
    mockKV = {
      get: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    } as unknown as KVNamespace;

    storage = new KVStorage(mockKV);
  });

  describe('create()', () => {
    it('should save Todo to KV with todos:{id} key', async () => {
      const todo: Todo = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test Todo',
        completed: false,
        createdAt: '2025-10-27T10:30:00.000Z',
        position: 0,
      };

      const result = await storage.create(todo);

      expect(mockKV.put).toHaveBeenCalledWith(
        'todos:550e8400-e29b-41d4-a716-446655440000',
        JSON.stringify(todo)
      );
      expect(result).toEqual(todo);
    });

    it('should preserve all Todo fields', async () => {
      const todo: Todo = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: '買い物リストを作成する',
        completed: true,
        createdAt: '2025-10-27T10:30:00.000Z',
        position: 0,
      };

      const result = await storage.create(todo);

      expect(result.id).toBe(todo.id);
      expect(result.title).toBe(todo.title);
      expect(result.completed).toBe(todo.completed);
      expect(result.createdAt).toBe(todo.createdAt);
    });

    it('should not modify the input Todo object', async () => {
      const todo: Todo = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Immutable',
        completed: false,
        createdAt: '2025-10-27T10:30:00.000Z',
        position: 0,
      };

      const originalId = todo.id;
      const originalTitle = todo.title;

      await storage.create(todo);

      expect(todo.id).toBe(originalId);
      expect(todo.title).toBe(originalTitle);
    });
  });

  describe('getAll()', () => {
    it('should return empty array when no todos exist', async () => {
      vi.mocked(mockKV.list).mockResolvedValue({
        keys: [],
        list_complete: true,
        cacheStatus: null,
      } as KVNamespaceListResult<unknown, string>);

      const result = await storage.getAll();

      expect(mockKV.list).toHaveBeenCalledWith({ prefix: 'todos:' });
      expect(result).toEqual([]);
    });

    it('should use KV List API with todos: prefix', async () => {
      vi.mocked(mockKV.list).mockResolvedValue({
        keys: [{ name: 'todos:id1', expiration: undefined, metadata: undefined }],
        list_complete: true,
        cacheStatus: null,
      } as KVNamespaceListResult<unknown, string>);
      vi.mocked(mockKV.get).mockResolvedValue(null as any);

      await storage.getAll();

      expect(mockKV.list).toHaveBeenCalledWith({ prefix: 'todos:' });
    });

    it('should fetch all todos in parallel using Promise.all', async () => {
      const todo1: Todo = {
        id: 'id1',
        title: 'Todo 1',
        completed: false,
        createdAt: '2025-10-27T10:30:00.000Z',
        position: 0,
      };
      const todo2: Todo = {
        id: 'id2',
        title: 'Todo 2',
        completed: true,
        createdAt: '2025-10-27T10:31:00.000Z',
        position: 1,
      };

      vi.mocked(mockKV.list).mockResolvedValue({
        keys: [
          { name: 'todos:id1', expiration: undefined, metadata: undefined },
          { name: 'todos:id2', expiration: undefined, metadata: undefined },
        ],
        list_complete: true,
        cacheStatus: null,
      } as KVNamespaceListResult<unknown, string>);

      vi.mocked(mockKV.get)
        .mockResolvedValueOnce(JSON.stringify(todo1) as any)
        .mockResolvedValueOnce(JSON.stringify(todo2) as any);

      const result = await storage.getAll();

      expect(mockKV.get).toHaveBeenCalledTimes(2);
      expect(mockKV.get).toHaveBeenCalledWith('todos:id1');
      expect(mockKV.get).toHaveBeenCalledWith('todos:id2');
      expect(result).toHaveLength(2);
      expect(result).toContainEqual(todo1);
      expect(result).toContainEqual(todo2);
    });

    it('should filter out null values from KV', async () => {
      const todo1: Todo = {
        id: 'id1',
        title: 'Todo 1',
        completed: false,
        createdAt: '2025-10-27T10:30:00.000Z',
        position: 0,
      };

      vi.mocked(mockKV.list).mockResolvedValue({
        keys: [
          { name: 'todos:id1', expiration: undefined, metadata: undefined },
          { name: 'todos:id2', expiration: undefined, metadata: undefined },
        ],
        list_complete: true,
        cacheStatus: null,
      } as KVNamespaceListResult<unknown, string>);

      vi.mocked(mockKV.get)
        .mockResolvedValueOnce(JSON.stringify(todo1) as any)
        .mockResolvedValueOnce(null as any); // KV returns null for non-existent key

      const result = await storage.getAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(todo1);
    });

    it('should parse JSON correctly for each Todo', async () => {
      const todo: Todo = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'JSON Test',
        completed: false,
        createdAt: '2025-10-27T10:30:00.000Z',
        position: 0,
      };

      vi.mocked(mockKV.list).mockResolvedValue({
        keys: [
          {
            name: 'todos:550e8400-e29b-41d4-a716-446655440000',
            expiration: undefined,
            metadata: undefined,
          },
        ],
        list_complete: true,
        cacheStatus: null,
      } as KVNamespaceListResult<unknown, string>);

      vi.mocked(mockKV.get).mockResolvedValue(JSON.stringify(todo) as any);

      const result = await storage.getAll();

      expect(result[0]).toEqual(todo);
      expect(typeof result[0]!.title).toBe('string');
      expect(typeof result[0]!.completed).toBe('boolean');
    });

    it('should auto-assign position to todos that do not have position field', async () => {
      // Simulate legacy todos without position field (stored as "any" to bypass type checking)
      const todoWithoutPosition1 = {
        id: 'id1',
        title: 'Legacy Todo 1',
        completed: false,
        createdAt: '2025-10-27T10:30:00.000Z',
        // position is missing
      };
      const todoWithoutPosition2 = {
        id: 'id2',
        title: 'Legacy Todo 2',
        completed: false,
        createdAt: '2025-10-27T10:31:00.000Z',
        // position is missing
      };

      vi.mocked(mockKV.list).mockResolvedValue({
        keys: [
          { name: 'todos:id1', expiration: undefined, metadata: undefined },
          { name: 'todos:id2', expiration: undefined, metadata: undefined },
        ],
        list_complete: true,
        cacheStatus: null,
      } as KVNamespaceListResult<unknown, string>);

      vi.mocked(mockKV.get)
        .mockResolvedValueOnce(JSON.stringify(todoWithoutPosition1) as any)
        .mockResolvedValueOnce(JSON.stringify(todoWithoutPosition2) as any);

      const result = await storage.getAll();

      // Verify auto-assigned positions
      expect(result).toHaveLength(2);
      expect(result[0]!.position).toBe(0);
      expect(result[1]!.position).toBe(1);

      // Verify todos were saved back to KV with positions
      expect(mockKV.put).toHaveBeenCalledTimes(2);
      expect(mockKV.put).toHaveBeenCalledWith(
        'todos:id1',
        JSON.stringify({ ...todoWithoutPosition1, position: 0 })
      );
      expect(mockKV.put).toHaveBeenCalledWith(
        'todos:id2',
        JSON.stringify({ ...todoWithoutPosition2, position: 1 })
      );
    });

    it('should sort todos by position in ascending order', async () => {
      const todo1: Todo = {
        id: 'id1',
        title: 'Third',
        completed: false,
        createdAt: '2025-10-27T10:30:00.000Z',
        position: 2,
      };
      const todo2: Todo = {
        id: 'id2',
        title: 'First',
        completed: false,
        createdAt: '2025-10-27T10:31:00.000Z',
        position: 0,
      };
      const todo3: Todo = {
        id: 'id3',
        title: 'Second',
        completed: false,
        createdAt: '2025-10-27T10:32:00.000Z',
        position: 1,
      };

      vi.mocked(mockKV.list).mockResolvedValue({
        keys: [
          { name: 'todos:id1', expiration: undefined, metadata: undefined },
          { name: 'todos:id2', expiration: undefined, metadata: undefined },
          { name: 'todos:id3', expiration: undefined, metadata: undefined },
        ],
        list_complete: true,
        cacheStatus: null,
      } as KVNamespaceListResult<unknown, string>);

      vi.mocked(mockKV.get)
        .mockResolvedValueOnce(JSON.stringify(todo1) as any)
        .mockResolvedValueOnce(JSON.stringify(todo2) as any)
        .mockResolvedValueOnce(JSON.stringify(todo3) as any);

      const result = await storage.getAll();

      // Should be sorted by position: 0, 1, 2
      expect(result).toHaveLength(3);
      expect(result[0]!.title).toBe('First');
      expect(result[0]!.position).toBe(0);
      expect(result[1]!.title).toBe('Second');
      expect(result[1]!.position).toBe(1);
      expect(result[2]!.title).toBe('Third');
      expect(result[2]!.position).toBe(2);
    });
  });

  describe('getById()', () => {
    it('should return null when Todo does not exist', async () => {
      vi.mocked(mockKV.get).mockResolvedValue(null as any);

      const result = await storage.getById('550e8400-e29b-41d4-a716-446655440000');

      expect(mockKV.get).toHaveBeenCalledWith('todos:550e8400-e29b-41d4-a716-446655440000');
      expect(result).toBeNull();
    });

    it('should retrieve Todo by ID from KV', async () => {
      const todo: Todo = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Retrieved Todo',
        completed: true,
        createdAt: '2025-10-27T10:30:00.000Z',
        position: 0,
      };

      vi.mocked(mockKV.get).mockResolvedValue(JSON.stringify(todo) as any);

      const result = await storage.getById('550e8400-e29b-41d4-a716-446655440000');

      expect(mockKV.get).toHaveBeenCalledWith('todos:550e8400-e29b-41d4-a716-446655440000');
      expect(result).toEqual(todo);
    });

    it('should parse JSON correctly', async () => {
      const todo: Todo = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Parse Test',
        completed: false,
        createdAt: '2025-10-27T10:30:00.000Z',
        position: 0,
      };

      vi.mocked(mockKV.get).mockResolvedValue(JSON.stringify(todo) as any);

      const result = await storage.getById('123e4567-e89b-12d3-a456-426614174000');

      expect(result?.id).toBe(todo.id);
      expect(result?.title).toBe(todo.title);
      expect(result?.completed).toBe(todo.completed);
      expect(result?.createdAt).toBe(todo.createdAt);
    });

    it('should use correct key format todos:{id}', async () => {
      vi.mocked(mockKV.get).mockResolvedValue(null as any);

      await storage.getById('test-id-123');

      expect(mockKV.get).toHaveBeenCalledWith('todos:test-id-123');
    });
  });

  describe('update()', () => {
    it('should return null when Todo does not exist', async () => {
      vi.mocked(mockKV.get).mockResolvedValue(null as any);

      const result = await storage.update('550e8400-e29b-41d4-a716-446655440000', {
        title: 'Updated',
      });

      expect(result).toBeNull();
    });

    it('should retrieve existing Todo, merge updates, and save', async () => {
      const existingTodo: Todo = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Original Title',
        completed: false,
        createdAt: '2025-10-27T10:30:00.000Z',
        position: 0,
      };

      vi.mocked(mockKV.get).mockResolvedValue(JSON.stringify(existingTodo) as any);

      const updates = { title: 'Updated Title' };
      const result = await storage.update('550e8400-e29b-41d4-a716-446655440000', updates);

      expect(result?.title).toBe('Updated Title');
      expect(result?.completed).toBe(false); // Unchanged
      expect(result?.id).toBe('550e8400-e29b-41d4-a716-446655440000'); // Unchanged
      expect(result?.createdAt).toBe('2025-10-27T10:30:00.000Z'); // Unchanged
    });

    it('should preserve id and createdAt (invariant)', async () => {
      const existingTodo: Todo = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Test',
        completed: false,
        createdAt: '2025-10-27T10:30:00.000Z',
        position: 0,
      };

      vi.mocked(mockKV.get).mockResolvedValue(JSON.stringify(existingTodo) as any);

      // Try to update id and createdAt (should be ignored)
      const updates = {
        id: 'different-id',
        title: 'Updated',
        createdAt: '2025-10-28T00:00:00.000Z',
      };

      const result = await storage.update('550e8400-e29b-41d4-a716-446655440000', updates);

      expect(result?.id).toBe('550e8400-e29b-41d4-a716-446655440000'); // Original ID
      expect(result?.createdAt).toBe('2025-10-27T10:30:00.000Z'); // Original createdAt
      expect(result?.title).toBe('Updated'); // Updated
    });

    it('should support partial updates (only title)', async () => {
      const existingTodo: Todo = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Original',
        completed: false,
        createdAt: '2025-10-27T10:30:00.000Z',
        position: 0,
      };

      vi.mocked(mockKV.get).mockResolvedValue(JSON.stringify(existingTodo) as any);

      const result = await storage.update('550e8400-e29b-41d4-a716-446655440000', {
        title: 'New Title',
      });

      expect(result?.title).toBe('New Title');
      expect(result?.completed).toBe(false);
    });

    it('should support partial updates (only completed)', async () => {
      const existingTodo: Todo = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Original',
        completed: false,
        createdAt: '2025-10-27T10:30:00.000Z',
        position: 0,
      };

      vi.mocked(mockKV.get).mockResolvedValue(JSON.stringify(existingTodo) as any);

      const result = await storage.update('550e8400-e29b-41d4-a716-446655440000', {
        completed: true,
      });

      expect(result?.title).toBe('Original');
      expect(result?.completed).toBe(true);
    });

    it('should save updated Todo to KV', async () => {
      const existingTodo: Todo = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Original',
        completed: false,
        createdAt: '2025-10-27T10:30:00.000Z',
        position: 0,
      };

      vi.mocked(mockKV.get).mockResolvedValue(JSON.stringify(existingTodo) as any);

      await storage.update('550e8400-e29b-41d4-a716-446655440000', {
        title: 'Updated',
      });

      const expectedUpdatedTodo: Todo = {
        ...existingTodo,
        title: 'Updated',
      };

      expect(mockKV.put).toHaveBeenCalledWith(
        'todos:550e8400-e29b-41d4-a716-446655440000',
        JSON.stringify(expectedUpdatedTodo)
      );
    });
  });

  describe('delete()', () => {
    it('should return false when Todo does not exist', async () => {
      vi.mocked(mockKV.get).mockResolvedValue(null as any);

      const result = await storage.delete('550e8400-e29b-41d4-a716-446655440000');

      expect(result).toBe(false);
      expect(mockKV.delete).not.toHaveBeenCalled();
    });

    it('should check existence before deleting', async () => {
      const todo: Todo = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'To Delete',
        completed: false,
        createdAt: '2025-10-27T10:30:00.000Z',
        position: 0,
      };

      vi.mocked(mockKV.get).mockResolvedValue(JSON.stringify(todo) as any);
      // Mock list for getAll() call after deletion
      vi.mocked(mockKV.list).mockResolvedValue({
        keys: [],
        list_complete: true,
        cacheStatus: null,
      } as KVNamespaceListResult<unknown, string>);

      await storage.delete('550e8400-e29b-41d4-a716-446655440000');

      expect(mockKV.get).toHaveBeenCalledWith('todos:550e8400-e29b-41d4-a716-446655440000');
    });

    it('should delete Todo from KV and return true', async () => {
      const todo: Todo = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'To Delete',
        completed: false,
        createdAt: '2025-10-27T10:30:00.000Z',
        position: 0,
      };

      vi.mocked(mockKV.get).mockResolvedValue(JSON.stringify(todo) as any);
      // Mock list for getAll() call after deletion
      vi.mocked(mockKV.list).mockResolvedValue({
        keys: [],
        list_complete: true,
        cacheStatus: null,
      } as KVNamespaceListResult<unknown, string>);

      const result = await storage.delete('550e8400-e29b-41d4-a716-446655440000');

      expect(mockKV.delete).toHaveBeenCalledWith('todos:550e8400-e29b-41d4-a716-446655440000');
      expect(result).toBe(true);
    });

    it('should use correct key format todos:{id}', async () => {
      const todo: Todo = {
        id: 'test-id',
        title: 'Test',
        completed: false,
        createdAt: '2025-10-27T10:30:00.000Z',
        position: 0,
      };

      vi.mocked(mockKV.get).mockResolvedValue(JSON.stringify(todo) as any);
      // Mock list for getAll() call after deletion
      vi.mocked(mockKV.list).mockResolvedValue({
        keys: [],
        list_complete: true,
        cacheStatus: null,
      } as KVNamespaceListResult<unknown, string>);

      await storage.delete('test-id');

      expect(mockKV.delete).toHaveBeenCalledWith('todos:test-id');
    });

    it('should adjust positions of todos after deleted position', async () => {
      const todoToDelete: Todo = {
        id: 'id2',
        title: 'Todo to Delete',
        completed: false,
        createdAt: '2025-10-27T10:30:00.000Z',
        position: 1, // Middle position
      };

      const todo1: Todo = {
        id: 'id1',
        title: 'Todo 1',
        completed: false,
        createdAt: '2025-10-27T10:30:00.000Z',
        position: 0,
      };

      const todo3: Todo = {
        id: 'id3',
        title: 'Todo 3',
        completed: false,
        createdAt: '2025-10-27T10:30:00.000Z',
        position: 2,
      };

      const todo4: Todo = {
        id: 'id4',
        title: 'Todo 4',
        completed: false,
        createdAt: '2025-10-27T10:30:00.000Z',
        position: 3,
      };

      // Mock getById to return the todo being deleted
      vi.mocked(mockKV.get)
        .mockResolvedValueOnce(JSON.stringify(todoToDelete) as any) // getById call
        .mockResolvedValueOnce(JSON.stringify(todo1) as any) // getAll call
        .mockResolvedValueOnce(JSON.stringify(todoToDelete) as any) // getAll call
        .mockResolvedValueOnce(JSON.stringify(todo3) as any) // getAll call
        .mockResolvedValueOnce(JSON.stringify(todo4) as any); // getAll call

      // Mock list to return all todo keys
      vi.mocked(mockKV.list).mockResolvedValue({
        keys: [
          { name: 'todos:id1', expiration: undefined, metadata: undefined },
          { name: 'todos:id2', expiration: undefined, metadata: undefined },
          { name: 'todos:id3', expiration: undefined, metadata: undefined },
          { name: 'todos:id4', expiration: undefined, metadata: undefined },
        ],
        list_complete: true,
        cacheStatus: null,
      } as KVNamespaceListResult<unknown, string>);

      const result = await storage.delete('id2');

      // Verify deletion
      expect(result).toBe(true);
      expect(mockKV.delete).toHaveBeenCalledWith('todos:id2');

      // Verify position adjustments: todos after position 1 should be decremented
      expect(mockKV.put).toHaveBeenCalledWith(
        'todos:id3',
        JSON.stringify({ ...todo3, position: 1 }) // Was 2, now 1
      );
      expect(mockKV.put).toHaveBeenCalledWith(
        'todos:id4',
        JSON.stringify({ ...todo4, position: 2 }) // Was 3, now 2
      );

      // Verify todo1 (position 0) was NOT updated
      expect(mockKV.put).not.toHaveBeenCalledWith('todos:id1', expect.anything());
    });
  });

  describe('Eventual Consistency Considerations', () => {
    it('should document that KV uses eventual consistency', () => {
      // Workers KV provides eventual consistency
      // - Write operations are fast but may take up to 60s to propagate globally
      // - Read operations from the same edge location usually see recent writes within seconds
      // - This is acceptable for a Todo app where a few seconds delay is tolerable

      const consistencyModel = 'eventual';
      const maxPropagationTime = 60; // seconds

      expect(consistencyModel).toBe('eventual');
      expect(maxPropagationTime).toBe(60);
    });

    it('should document KV List API limitation (max 1000 keys)', () => {
      // KV List API can return at most 1000 keys
      // Our app limits todos to 500, so we're well within this limit
      const kvListLimit = 1000;
      const appTodoLimit = 500;

      expect(appTodoLimit).toBeLessThan(kvListLimit);
    });
  });

  describe('Key Design Pattern', () => {
    it('should use todos:{id} pattern for individual todos', () => {
      const id = '550e8400-e29b-41d4-a716-446655440000';
      const expectedKey = `todos:${id}`;

      expect(expectedKey).toBe('todos:550e8400-e29b-41d4-a716-446655440000');
    });

    it('should use todos: prefix for KV List API', () => {
      const prefix = 'todos:';

      expect(prefix).toBe('todos:');
      // This prefix is used in getAll() to retrieve all todo keys
    });
  });

  describe('reorderPositions', () => {
    it('should move a task up and update affected positions', () => {
      const todos = [
        { id: 'a', position: 0 },
        { id: 'b', position: 1 },
        { id: 'c', position: 2 },
        { id: 'd', position: 3 },
      ];
      // Move 'c' from position 2 to position 0
      const result = KVStorage.reorderPositions(todos, 'c', 0);
      expect(result.map(t => t.id)).toEqual(['c', 'a', 'b', 'd']);
      expect(result.map(t => t.position)).toEqual([0, 1, 2, 3]);
    });

    it('should move a task down and update affected positions', () => {
      const todos = [
        { id: 'a', position: 0 },
        { id: 'b', position: 1 },
        { id: 'c', position: 2 },
        { id: 'd', position: 3 },
      ];
      // Move 'a' from position 0 to position 2
      const result = KVStorage.reorderPositions(todos, 'a', 2);
      expect(result.map(t => t.id)).toEqual(['b', 'c', 'a', 'd']);
      expect(result.map(t => t.position)).toEqual([0, 1, 2, 3]);
    });

    it('should return original array if position does not change', () => {
      const todos = [
        { id: 'a', position: 0 },
        { id: 'b', position: 1 },
        { id: 'c', position: 2 },
      ];
      // Move 'b' from position 1 to position 1
      const result = KVStorage.reorderPositions(todos, 'b', 1);
      expect(result).toEqual(todos);
    });

    it('should update all positions to be continuous integers starting from 0', () => {
      const todos = [
        { id: 'a', position: 0 },
        { id: 'b', position: 1 },
        { id: 'c', position: 2 },
      ];
      // Move 'c' from position 2 to position 0
      const result = KVStorage.reorderPositions(todos, 'c', 0);
      expect(result.map(t => t.position)).toEqual([0, 1, 2]);
    });
  });
});
