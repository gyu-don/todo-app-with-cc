/**
 * Storage Layer Interface
 *
 * このファイルはデータ永続化の抽象化インターフェースを定義します。
 * IStorageインターフェースを実装することで、異なるストレージバックエンド
 * （Workers KV、D1、Durable Objects等）を透過的に切り替えることができます。
 *
 * 参照:
 * - 要件5: データ永続化 (requirements.md)
 * - Storage Layer セクション (design.md)
 */

import type { Todo } from '../models/todo';

/**
 * Storage Interface
 *
 * Todo項目の永続化を抽象化するインターフェース。
 * このインターフェースを実装することで、ストレージバックエンドの
 * 実装を変更してもハンドラー層に影響を与えません。
 *
 * 実装例:
 * - KVStorage: Workers KVを使用した実装
 * - D1Storage: D1（SQLite）を使用した実装
 * - DurableStorage: Durable Objectsを使用した実装
 *
 * アーキテクチャ上の利点:
 * 1. **テスタビリティ**: モックストレージを簡単に作成できる
 * 2. **柔軟性**: ストレージ実装を変更しても、ハンドラー層のコードは不変
 * 3. **スケーラビリティ**: パフォーマンス要件に応じてストレージを切り替え可能
 *
 * @example
 * ```typescript
 * // KV implementation
 * const storage: IStorage = new KVStorage(env.TODO_KV);
 *
 * // Create a todo
 * const todo = await storage.create({
 *   id: crypto.randomUUID(),
 *   title: 'New task',
 *   completed: false,
 *   createdAt: new Date().toISOString(),
 * });
 * ```
 */
export interface IStorage {
  /**
   * Create a new Todo item
   *
   * Todo項目を新規作成し、ストレージに保存します。
   *
   * **事前条件**:
   * - todo.id が一意である
   * - todo が有効なTodo型に準拠している
   *
   * **事後条件**:
   * - Todoがストレージに保存される
   * - 作成されたTodoが返される
   *
   * **不変条件**:
   * - idは変更されない
   * - createdAtは変更されない
   *
   * @param todo - 作成するTodo項目
   * @returns 作成されたTodo項目
   * @throws ストレージエラーが発生した場合
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
  create(todo: Todo): Promise<Todo>;

  /**
   * Get all Todo items
   *
   * ストレージに保存されているすべてのTodo項目を取得します。
   *
   * **事前条件**:
   * - なし
   *
   * **事後条件**:
   * - すべてのTodo項目が配列として返される
   * - Todo項目が存在しない場合は空の配列が返される
   *
   * **不変条件**:
   * - 配列は空または有効なTodo項目を含む
   * - 各Todo項目は完全なスキーマ（id、title、completed、createdAt）を持つ
   *
   * @returns すべてのTodo項目の配列
   * @throws ストレージエラーが発生した場合
   *
   * @example
   * ```typescript
   * const todos = await storage.getAll();
   * console.log(`Total todos: ${todos.length}`);
   * ```
   */
  getAll(): Promise<Todo[]>;

  /**
   * Get a Todo item by ID
   *
   * 指定されたIDのTodo項目を取得します。
   *
   * **事前条件**:
   * - idがUUID v4形式である
   *
   * **事後条件**:
   * - 該当するTodoが返される、または存在しない場合はnull
   *
   * **不変条件**:
   * - 返されるTodoは完全なスキーマを持つ（null以外の場合）
   *
   * @param id - 取得するTodo項目のID（UUID v4形式）
   * @returns 該当するTodo項目、または存在しない場合はnull
   * @throws ストレージエラーが発生した場合
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
  getById(id: string): Promise<Todo | null>;

  /**
   * Update a Todo item
   *
   * 指定されたIDのTodo項目を更新します。
   * 部分更新をサポートし、指定されたフィールドのみが更新されます。
   *
   * **事前条件**:
   * - idが存在する
   * - updatesが有効なフィールドを含む
   *
   * **事後条件**:
   * - Todoが更新される、または存在しない場合はnull
   * - 更新されたTodoが返される
   *
   * **不変条件**:
   * - id、createdAtは変更されない
   * - 指定されていないフィールドは元の値を保持する
   *
   * @param id - 更新するTodo項目のID（UUID v4形式）
   * @param updates - 更新するフィールド（部分的なTodoオブジェクト）
   * @returns 更新されたTodo項目、または存在しない場合はnull
   * @throws ストレージエラーが発生した場合
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
  update(id: string, updates: Partial<Todo>): Promise<Todo | null>;

  /**
   * Delete a Todo item
   *
   * 指定されたIDのTodo項目を削除します。
   *
   * **事前条件**:
   * - idがUUID v4形式である
   *
   * **事後条件**:
   * - Todoが削除される（成功時true、存在しない場合false）
   *
   * **不変条件**:
   * - 削除後、該当idのTodoは取得不可（getByIdはnullを返す）
   *
   * @param id - 削除するTodo項目のID（UUID v4形式）
   * @returns 削除に成功した場合はtrue、該当IDが存在しない場合はfalse
   * @throws ストレージエラーが発生した場合
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
  delete(id: string): Promise<boolean>;
}

/**
 * Storage Factory
 *
 * ストレージ実装を生成するファクトリー関数の型定義。
 * 環境に応じて適切なストレージ実装を返します。
 *
 * @example
 * ```typescript
 * type StorageFactory = (env: Env) => IStorage;
 *
 * const createStorage: StorageFactory = (env) => {
 *   // In production, use Workers KV
 *   if (env.TODO_KV) {
 *     return new KVStorage(env.TODO_KV);
 *   }
 *   // In tests, use mock storage
 *   return new MockStorage();
 * };
 * ```
 */
export type StorageFactory = (kv: KVNamespace) => IStorage;
