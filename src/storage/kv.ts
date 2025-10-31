/**
 * Workers KV Storage Implementation
 *
 * このファイルはCloudflare Workers KVを使用したストレージ実装を提供します。
 * IStorageインターフェースを実装し、Key-Value形式でTodo項目を永続化します。
 *
 * 参照:
 * - 要件5: データ永続化 (requirements.md)
 * - Storage Layer セクション (design.md)
 * - Workers KV実装詳細 (design.md)
 */

import type { IStorage } from './interface';
import type { Todo } from '../models/todo';

/**
 * Workers KV Storage
 *
 * Cloudflare Workers KVを使用したストレージ実装。
 * Key-Value形式でTodo項目を保存し、グローバルに分散されたエッジネットワークで
 * 高速な読み込みを実現します。
 *
 * **キー設計**:
 * - `todos:{uuid}` - 個別のTodo項目
 * - KV List APIで `todos:` プレフィックスを持つすべてのキーを取得
 *
 * **Eventual Consistency考慮事項**:
 * - Workers KVは最終的整合性（eventual consistency）を提供
 * - 書き込み後、グローバルに反映されるまで最大60秒かかる可能性がある
 * - 同一エッジロケーションでは通常、数秒以内に反映される
 * - Todoアプリケーションでは許容可能（ユーザー体験への影響は最小限）
 *
 * **パフォーマンス特性**:
 * - 読み込み: 10-50ms（エッジキャッシュヒット時）
 * - 書き込み: 非同期、即座に返却（グローバル反映は別途）
 * - 削除: 非同期、即座に返却
 *
 * **制限事項**:
 * - KV List APIは最大1000件まで取得可能
 * - 本アプリケーションは最大500件に制限するため、この制限内に収まる
 *
 * @example
 * ```typescript
 * const storage = new KVStorage(env.TODO_KV);
 *
 * // Create a todo
 * const todo = await storage.create({
 *   id: crypto.randomUUID(),
 *   title: 'Buy groceries',
 *   completed: false,
 *   createdAt: new Date().toISOString(),
 * });
 *
 * // Get all todos
 * const todos = await storage.getAll();
 *
 * // Update a todo
 * const updated = await storage.update(todo.id, { completed: true });
 *
 * // Delete a todo
 * const deleted = await storage.delete(todo.id);
 * ```
 */
export class KVStorage implements IStorage {
  /**
   * Workers KV Namespace instance
   * @private
   */
  private kv: KVNamespace;

  /**
   * Key prefix for all Todo items
   * @private
   */
  private readonly KEY_PREFIX = 'todos:';

  /**
   * Constructor
   *
   * @param kv - Workers KV Namespace binding
   *
   * @example
   * ```typescript
   * // In Hono handler
   * const storage = new KVStorage(c.env.TODO_KV);
   * ```
   */
  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  /**
   * Generate KV key for a Todo item
   *
   * @param id - Todo item ID
   * @returns KV key in format `todos:{id}`
   * @private
   */
  private getKey(id: string): string {
    return `${this.KEY_PREFIX}${id}`;
  }

  /**
   * Create a new Todo item
   *
   * Todo項目を作成し、Workers KVに保存します。
   * キー形式は `todos:{uuid}` で、値はJSONシリアライズされたTodoオブジェクトです。
   *
   * @param todo - 作成するTodo項目
   * @returns 作成されたTodo項目
   *
   * @example
   * ```typescript
   * const newTodo = await storage.create({
   *   id: '550e8400-e29b-41d4-a716-446655440000',
   *   title: '買い物リストを作成する',
   *   completed: false,
   *   createdAt: '2025-10-27T10:30:00.000Z',
   * });
   * ```
   */
  async create(todo: Todo): Promise<Todo> {
    const key = this.getKey(todo.id);
    await this.kv.put(key, JSON.stringify(todo));
    return todo;
  }

  /**
   * Get all Todo items
   *
   * Workers KV List APIを使用してすべてのTodoキーを取得し、
   * Promise.allで並行してすべてのTodo項目を読み込みます。
   *
   * **パフォーマンス最適化**:
   * - KV List APIでキー一覧を取得（50-100ms）
   * - Promise.allで全Todoを並行取得（エッジキャッシュで高速化）
   *
   * **自動position割り当て（マイグレーション対応）**:
   * - positionフィールドがないTodoを検出
   * - 連続した整数（0, 1, 2, ...）を自動割り当て
   * - 更新されたTodoをWorkers KVに保存
   * - task-reordering要件1.2に準拠
   *
   * @returns すべてのTodo項目の配列（position順にソート済み）
   *
   * @example
   * ```typescript
   * const todos = await storage.getAll();
   * console.log(`Total todos: ${todos.length}`);
   * // Todosはposition順にソートされている
   * ```
   */
  async getAll(): Promise<Todo[]> {
    // KV List APIで todos: プレフィックスを持つすべてのキーを取得
    const list = await this.kv.list({ prefix: this.KEY_PREFIX });
    const keys = list.keys.map((key) => key.name);

    // 並行してすべてのTodoを取得（パフォーマンス最適化）
    const todosJson = await Promise.all(keys.map((key) => this.kv.get(key)));

    // nullをフィルタリングし、JSONをパース（anyキャストで型チェックを回避、後でTodoに変換）
    let todos = todosJson
      .filter((json): json is string => json !== null)
      .map((json) => JSON.parse(json) as any);

    // positionフィールドがないTodoを検出し、自動割り当て
    let needsUpdate = false;
    todos = todos.map((todo: any, index: number) => {
      if (todo.position === undefined) {
        needsUpdate = true;
        return { ...todo, position: index } as Todo;
      }
      return todo as Todo;
    });

    // 自動割り当てが発生した場合、Workers KVに保存
    if (needsUpdate) {
      await Promise.all(
        todos.map((todo: Todo) =>
          this.kv.put(this.getKey(todo.id), JSON.stringify(todo))
        )
      );
    }

    // position順にソート（task-reordering要件1.4）
    return todos.sort((a: Todo, b: Todo) => a.position - b.position);
  }

  /**
   * Get a Todo item by ID
   *
   * 指定されたIDのTodo項目をWorkers KVから取得します。
   *
   * @param id - Todo項目のID（UUID v4形式）
   * @returns 該当するTodo項目、または存在しない場合はnull
   *
   * @example
   * ```typescript
   * const todo = await storage.getById('550e8400-e29b-41d4-a716-446655440000');
   * if (todo) {
   *   console.log(`Found: ${todo.title}`);
   * } else {
   *   console.log('Todo not found');
   * }
   * ```
   */
  async getById(id: string): Promise<Todo | null> {
    const key = this.getKey(id);
    const json = await this.kv.get(key);

    if (json === null) {
      return null;
    }

    return JSON.parse(json) as Todo;
  }

  /**
   * Update a Todo item
   *
   * 指定されたIDのTodo項目を更新します。
   * 既存のTodoを取得し、指定されたフィールドのみをマージして保存します。
   *
   * **不変条件**:
   * - `id` と `createdAt` は変更されません
   * - 指定されていないフィールドは元の値を保持します
   *
   * @param id - Todo項目のID（UUID v4形式）
   * @param updates - 更新するフィールド（部分的なTodoオブジェクト）
   * @returns 更新されたTodo項目、または存在しない場合はnull
   *
   * @example
   * ```typescript
   * // タイトルのみ更新
   * const updated = await storage.update('550e8400-...', {
   *   title: '更新されたタイトル',
   * });
   *
   * // 完了状態のみ更新
   * const completed = await storage.update('550e8400-...', {
   *   completed: true,
   * });
   * ```
   */
  async update(id: string, updates: Partial<Todo>): Promise<Todo | null> {
    // 既存のTodoを取得
    const existing = await this.getById(id);
    if (existing === null) {
      return null;
    }

    // 不変条件: id と createdAt は変更されない
    const updated: Todo = {
      ...existing,
      ...updates,
      id: existing.id, // id は変更されない
      createdAt: existing.createdAt, // createdAt は変更されない
    };

    // 更新されたTodoを保存
    const key = this.getKey(id);
    await this.kv.put(key, JSON.stringify(updated));

    return updated;
  }

  /**
   * Delete a Todo item
   *
   * 指定されたIDのTodo項目を削除します。
   * 存在確認を行ってから削除するため、存在しないIDの場合はfalseを返します。
   *
   * @param id - Todo項目のID（UUID v4形式）
   * @returns 削除に成功した場合はtrue、該当IDが存在しない場合はfalse
   *
   * @example
   * ```typescript
   * const deleted = await storage.delete('550e8400-e29b-41d4-a716-446655440000');
   * if (deleted) {
   *   console.log('Todo deleted successfully');
   * } else {
   *   console.log('Todo not found');
   * }
   * ```
   */
  async delete(id: string): Promise<boolean> {
    // 存在確認
    const existing = await this.getById(id);
    if (existing === null) {
      return false;
    }

    // Todoを削除
    const key = this.getKey(id);
    await this.kv.delete(key);

    return true;
  }
}
