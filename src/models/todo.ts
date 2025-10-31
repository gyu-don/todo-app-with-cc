/**
 * Todo Domain Model
 *
 * このファイルはTodoアプリケーションのコアドメインモデルを定義します。
 * すべての型とインターフェースは要件定義書と技術設計書に基づいています。
 *
 * 参照:
 * - 要件1: Todo項目の作成 (requirements.md)
 * - 要件2: Todo項目の取得 (requirements.md)
 * - 要件13: ID生成とデータ構造 (requirements.md)
 * - Data Models セクション (design.md)
 */

/**
 * Todo Entity
 *
 * Todoアプリケーションの中心的なエンティティ。
 * 各Todoは一意のIDと完了状態を持ちます。
 *
 * ビジネスルール:
 * - idはUUID v4形式でなければならない (要件13.1)
 * - titleは1-500文字の範囲内でなければならない (要件12.1)
 * - titleに制御文字(\x00-\x1F, \x7F)が含まれてはならない (要件12.2)
 * - completedは真偽値でなければならない (要件12.5)
 * - createdAtは作成時に設定され、以降変更されない
 * - idとcreatedAtは更新操作で変更してはならない
 * - positionは0から始まる連続した整数でなければならない (task-reordering要件1.1)
 * - 新規作成時、positionは現在のタスク総数（最後の位置）に設定される (task-reordering要件1.2)
 *
 * @property {string} id - UUID v4形式の一意な識別子
 * @property {string} title - Todoのタイトル (1-500文字)
 * @property {boolean} completed - 完了状態 (デフォルト: false)
 * @property {string} createdAt - 作成日時 (ISO 8601形式)
 * @property {number} position - 表示順序 (0から始まる連続した整数)
 *
 * @example
 * ```typescript
 * const todo: Todo = {
 *   id: '550e8400-e29b-41d4-a716-446655440000',
 *   title: '買い物リストを作成する',
 *   completed: false,
 *   createdAt: '2025-10-27T10:30:00.000Z',
 *   position: 0
 * };
 * ```
 */
export interface Todo {
  id: string; // UUID v4形式 (例: "550e8400-e29b-41d4-a716-446655440000")
  title: string; // 1-500文字、制御文字不可
  completed: boolean; // 完了状態
  createdAt: string; // ISO 8601形式 (例: "2025-10-27T10:30:00.000Z")
  position: number; // 0から始まる連続した整数、タスクの表示順序
}

/**
 * Create Todo Request
 *
 * Todo作成時のリクエストボディ。
 * タイトルのみが必須で、他のフィールドはサーバー側で自動生成されます。
 *
 * バリデーションルール:
 * - title: 必須、1-500文字、制御文字不可 (要件1.3, 12.1, 12.2)
 *
 * @property {string} title - Todoのタイトル
 *
 * @example
 * ```typescript
 * const request: CreateTodoRequest = {
 *   title: '新しいタスク'
 * };
 * ```
 */
export interface CreateTodoRequest {
  title: string; // 必須、1-500文字、制御文字不可
}

/**
 * Update Todo Request
 *
 * Todo更新時のリクエストボディ。
 * すべてのフィールドは任意で、指定されたフィールドのみが更新されます。
 *
 * バリデーションルール:
 * - title: 任意、1-500文字、制御文字不可 (要件3.4, 12.1, 12.2)
 * - completed: 任意、boolean型のみ (要件3.5, 12.5)
 *
 * 不変条件:
 * - idとcreatedAtは更新できない
 *
 * @property {string} [title] - 更新するタイトル (任意)
 * @property {boolean} [completed] - 更新する完了状態 (任意)
 *
 * @example
 * ```typescript
 * // タイトルのみ更新
 * const request1: UpdateTodoRequest = {
 *   title: '更新されたタイトル'
 * };
 *
 * // 完了状態のみ更新
 * const request2: UpdateTodoRequest = {
 *   completed: true
 * };
 *
 * // 両方を更新
 * const request3: UpdateTodoRequest = {
 *   title: '完了タスク',
 *   completed: true
 * };
 * ```
 */
export interface UpdateTodoRequest {
  title?: string; // 任意、1-500文字、制御文字不可
  completed?: boolean; // 任意、boolean型のみ
}

/**
 * Todo Response
 *
 * APIレスポンスで返されるTodoデータ。
 * Todo型と同一の構造を持ちます。
 *
 * @property {string} id - UUID v4形式の一意な識別子
 * @property {string} title - Todoのタイトル
 * @property {boolean} completed - 完了状態
 * @property {string} createdAt - 作成日時 (ISO 8601形式)
 *
 * @example
 * ```typescript
 * const response: TodoResponse = {
 *   id: '550e8400-e29b-41d4-a716-446655440000',
 *   title: 'レスポンステスト',
 *   completed: false,
 *   createdAt: '2025-10-27T10:30:00.000Z'
 * };
 * ```
 */
export type TodoResponse = Todo;

/**
 * ビジネスルール定数
 *
 * Todoドメインモデルに関連する制約を定義します。
 */
export const TODO_CONSTRAINTS = {
  /**
   * タイトルの最小文字数
   */
  MIN_TITLE_LENGTH: 1,

  /**
   * タイトルの最大文字数 (要件12.1)
   */
  MAX_TITLE_LENGTH: 500,

  /**
   * 最大Todo項目数 (KV List API制限1000件に対して余裕を確保)
   */
  MAX_TODO_COUNT: 500,

  /**
   * 制御文字の正規表現パターン (要件12.2)
   * \x00-\x1F: C0制御文字 (NULL, タブ、改行等)
   * \x7F: DEL文字
   */
  // eslint-disable-next-line no-control-regex
  CONTROL_CHARACTERS_REGEX: /[\x00-\x1F\x7F]/,

  /**
   * UUID v4形式の正規表現パターン (要件13.1)
   */
  UUID_V4_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
} as const;
