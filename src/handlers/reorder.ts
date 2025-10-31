// src/handlers/reorder.ts
import type { Context } from 'hono';
import type { Todo } from '../models/todo';
import type { IStorage } from '../storage/interface';
import { KVStorage } from '../storage/kv';
import { isValidUUIDv4 } from '../utils/validation';

export async function reorderHandler(c: Context) {
  const storage: IStorage = new KVStorage(c.env.TODO_KV);
  const id = c.req.param('id');
  const { newPosition } = await c.req.json();

  // バリデーション
  if (!isValidUUIDv4(id)) {
    return c.json({ error: 'Invalid todoId format' }, 400);
  }
  if (typeof newPosition !== 'number' || newPosition < 0) {
    return c.json({ error: 'Invalid newPosition' }, 400);
  }

  // 全タスク取得
  const todos = await storage.getAll();
  const target = todos.find(t => t.id === id);
  if (!target) {
    return c.json({ error: 'Todo not found' }, 404);
  }
  if (newPosition >= todos.length) {
    return c.json({ error: 'newPosition out of range' }, 400);
  }

  // 並び替えロジック
  const reordered = KVStorage.reorderPositions(todos, id, newPosition);
  await storage.updatePositions(reordered);

  // レスポンス
  return c.json({ todos: reordered }, 200);
}
