/**
 * Todo Handlers
 *
 * このファイルはTodo項目のCRUD操作ハンドラーを提供します。
 * 各ハンドラーはビジネスロジックを実装し、ストレージレイヤーと連携します。
 *
 * 参照:
 * - 要件1: Todo項目の作成 (requirements.md)
 * - 要件2: Todo項目の取得 (requirements.md)
 * - 要件3: Todo項目の更新 (requirements.md)
 * - 要件4: Todo項目の削除 (requirements.md)
 * - 要件13: ID生成とデータ構造 (requirements.md)
 * - Todo Handler セクション (design.md)
 */

import type { Context } from 'hono';
import { jsonResponse, errorResponse } from '../utils/response';
import { validateTodoInput, validateTodoCount, validateId } from '../utils/validation';
import { ERROR_CODES } from '../models/error';
import type { Todo, CreateTodoRequest, UpdateTodoRequest } from '../models/todo';
import type { IStorage } from '../storage/interface';
import type { Env } from '../models/env';

/**
 * Create Todo Handler
 *
 * 新しいTodo項目を作成します。
 *
 * ビジネスロジック:
 * 1. リクエストボディからタイトルを取得
 * 2. 入力バリデーションを実行（要件1.3）
 * 3. 現在のTodo件数を確認し、500件制限を検証
 * 4. UUID v4形式のIDを生成（要件13.1）
 * 5. デフォルト値を設定（completed: false、createdAt: 現在時刻）（要件1.4, 1.5）
 * 6. ストレージレイヤーにTodoを保存
 * 7. 201 Createdステータスで作成されたTodoを返す（要件1.2）
 *
 * @param {Context<{ Bindings: Env }>} c - Honoコンテキスト
 * @param {IStorage} storage - ストレージレイヤーインスタンス
 * @returns {Promise<Response>} 作成されたTodo（201 Created）またはエラーレスポンス
 *
 * エラーレスポンス:
 * - 400 Bad Request: バリデーションエラー（要件1.3）
 * - 400 Bad Request: Todo件数上限到達（500件）
 * - 500 Internal Server Error: ストレージエラー
 *
 * @example
 * ```typescript
 * // リクエスト
 * POST /todos
 * Content-Type: application/json
 * { "title": "買い物リストを作成する" }
 *
 * // レスポンス (201 Created)
 * {
 *   "id": "550e8400-e29b-41d4-a716-446655440000",
 *   "title": "買い物リストを作成する",
 *   "completed": false,
 *   "createdAt": "2025-10-27T15:00:00.000Z"
 * }
 * ```
 */
export async function createTodoHandler(
  c: Context<{ Bindings: Env }>,
  storage: IStorage
): Promise<Response> {
  try {
    // リクエストボディを取得
    const body = await c.req.json<CreateTodoRequest>();

    // 入力バリデーション（要件1.3, 12.1-12.5）
    const validationResult = validateTodoInput(body);
    if (!validationResult.valid) {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        validationResult.error || 'Invalid input',
        400
      );
    }

    // 現在のTodo件数を取得
    const existingTodos = await storage.getAll();

    // Todo件数制限を検証（最大500件）
    const countValidation = validateTodoCount(existingTodos.length);
    if (!countValidation.valid) {
      return errorResponse(
        ERROR_CODES.TODO_LIMIT_REACHED,
        countValidation.error ||
          'Maximum number of todos (500) has been reached',
        400
      );
    }

    // UUID v4形式のIDを生成（要件13.1, 13.2）
    const id = crypto.randomUUID();

    // デフォルト値を設定（要件1.4, 1.5, 13.4）
    const newTodo: Todo = {
      id,
      title: body.title,
      completed: false, // デフォルト: 未完了
      createdAt: new Date().toISOString(), // ISO 8601形式
    };

    // ストレージに保存
    const createdTodo = await storage.create(newTodo);

    // 201 Createdで作成されたTodoを返す（要件1.2）
    return jsonResponse(createdTodo, 201);
  } catch (error) {
    console.error('Error creating todo:', error);
    return errorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      'An unexpected error occurred while creating the todo',
      500
    );
  }
}

/**
 * Get All Todos Handler
 *
 * すべてのTodo項目を取得します。
 *
 * ビジネスロジック:
 * 1. ストレージレイヤーからすべてのTodoを取得
 * 2. 200 OKステータスでTodo配列を返す（要件2.1）
 *
 * @param {Context<{ Bindings: Env }>} c - Honoコンテキスト
 * @param {IStorage} storage - ストレージレイヤーインスタンス
 * @returns {Promise<Response>} Todo配列（200 OK）またはエラーレスポンス
 *
 * @example
 * ```typescript
 * // レスポンス (200 OK)
 * [
 *   {
 *     "id": "550e8400-e29b-41d4-a716-446655440000",
 *     "title": "Todo 1",
 *     "completed": false,
 *     "createdAt": "2025-10-27T15:00:00.000Z"
 *   },
 *   {
 *     "id": "650e8400-e29b-41d4-a716-446655440001",
 *     "title": "Todo 2",
 *     "completed": true,
 *     "createdAt": "2025-10-27T15:01:00.000Z"
 *   }
 * ]
 * ```
 */
export async function getTodosHandler(
  _c: Context<{ Bindings: Env }>,
  storage: IStorage
): Promise<Response> {
  try {
    const todos = await storage.getAll();
    return jsonResponse(todos, 200);
  } catch (error) {
    console.error('Error fetching todos:', error);
    return errorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      'An unexpected error occurred while fetching todos',
      500
    );
  }
}

/**
 * Get Todo By ID Handler
 *
 * 指定されたIDのTodo項目を取得します。
 *
 * ビジネスロジック:
 * 1. パスパラメータからIDを取得
 * 2. UUID v4形式を検証
 * 3. ストレージレイヤーからTodoを取得
 * 4. 存在する場合は200 OK、存在しない場合は404 Not Found（要件2.3）
 *
 * @param {Context<{ Bindings: Env }>} c - Honoコンテキスト
 * @param {IStorage} storage - ストレージレイヤーインスタンス
 * @returns {Promise<Response>} Todo（200 OK）または404エラー
 *
 * エラーレスポンス:
 * - 400 Bad Request: 無効なUUID形式
 * - 404 Not Found: Todo項目が存在しない（要件2.3）
 * - 500 Internal Server Error: ストレージエラー
 */
export async function getTodoByIdHandler(
  c: Context<{ Bindings: Env }>,
  storage: IStorage
): Promise<Response> {
  try {
    const id = c.req.param('id');

    // UUID形式を検証
    if (!validateId(id)) {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid todo ID format. Must be a valid UUID v4.',
        400
      );
    }

    // ストレージからTodoを取得
    const todo = await storage.getById(id);

    // 存在しない場合は404（要件2.3）
    if (!todo) {
      return errorResponse(
        ERROR_CODES.NOT_FOUND,
        `Todo item with ID ${id} not found`,
        404
      );
    }

    return jsonResponse(todo, 200);
  } catch (error) {
    console.error('Error fetching todo by ID:', error);
    return errorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      'An unexpected error occurred while fetching the todo',
      500
    );
  }
}

/**
 * Update Todo Handler
 *
 * 指定されたIDのTodo項目を更新します。
 *
 * ビジネスロジック:
 * 1. パスパラメータからIDを取得し、UUID v4形式を検証
 * 2. リクエストボディから更新データを取得し、バリデーションを実行（要件3.6）
 * 3. ストレージレイヤーでTodoを更新
 * 4. 存在する場合は200 OK、存在しない場合は404 Not Found（要件3.3）
 *
 * @param {Context<{ Bindings: Env }>} c - Honoコンテキスト
 * @param {IStorage} storage - ストレージレイヤーインスタンス
 * @returns {Promise<Response>} 更新されたTodo（200 OK）または404エラー
 *
 * エラーレスポンス:
 * - 400 Bad Request: バリデーションエラー、無効なUUID、空の更新データ（要件3.6）
 * - 404 Not Found: Todo項目が存在しない（要件3.3）
 * - 500 Internal Server Error: ストレージエラー
 *
 * 不変条件:
 * - id、createdAtは変更されない
 */
export async function updateTodoHandler(
  c: Context<{ Bindings: Env }>,
  storage: IStorage
): Promise<Response> {
  try {
    const id = c.req.param('id');

    // UUID形式を検証
    if (!validateId(id)) {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid todo ID format. Must be a valid UUID v4.',
        400
      );
    }

    // リクエストボディを取得
    const body = await c.req.json<UpdateTodoRequest>();

    // 更新データが空の場合はエラー（要件3.6）
    if (!body.title && body.completed === undefined) {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Update data cannot be empty. Provide at least title or completed field.',
        400
      );
    }

    // titleが提供されている場合はバリデーション
    if (body.title !== undefined) {
      const validationResult = validateTodoInput({ title: body.title });
      if (!validationResult.valid) {
        return errorResponse(
          ERROR_CODES.VALIDATION_ERROR,
          validationResult.error || 'Invalid title',
          400
        );
      }
    }

    // completedが提供されている場合は型チェック
    if (body.completed !== undefined && typeof body.completed !== 'boolean') {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Completed field must be a boolean value',
        400
      );
    }

    // ストレージでTodoを更新
    const updatedTodo = await storage.update(id, body);

    // 存在しない場合は404（要件3.3）
    if (!updatedTodo) {
      return errorResponse(
        ERROR_CODES.NOT_FOUND,
        `Todo item with ID ${id} not found`,
        404
      );
    }

    return jsonResponse(updatedTodo, 200);
  } catch (error) {
    console.error('Error updating todo:', error);
    return errorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      'An unexpected error occurred while updating the todo',
      500
    );
  }
}

/**
 * Delete Todo Handler
 *
 * 指定されたIDのTodo項目を削除します。
 *
 * ビジネスロジック:
 * 1. パスパラメータからIDを取得し、UUID v4形式を検証
 * 2. ストレージレイヤーでTodoを削除
 * 3. 成功時は204 No Content、存在しない場合は404 Not Found（要件4.3）
 *
 * @param {Context<{ Bindings: Env }>} c - Honoコンテキスト
 * @param {IStorage} storage - ストレージレイヤーインスタンス
 * @returns {Promise<Response>} 204 No Contentまたは404エラー
 *
 * エラーレスポンス:
 * - 400 Bad Request: 無効なUUID形式
 * - 404 Not Found: Todo項目が存在しない（要件4.3）
 * - 500 Internal Server Error: ストレージエラー
 */
export async function deleteTodoHandler(
  c: Context<{ Bindings: Env }>,
  storage: IStorage
): Promise<Response> {
  try {
    const id = c.req.param('id');

    // UUID形式を検証
    if (!validateId(id)) {
      return errorResponse(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid todo ID format. Must be a valid UUID v4.',
        400
      );
    }

    // ストレージからTodoを削除
    const deleted = await storage.delete(id);

    // 存在しない場合は404（要件4.3）
    if (!deleted) {
      return errorResponse(
        ERROR_CODES.NOT_FOUND,
        `Todo item with ID ${id} not found`,
        404
      );
    }

    // 204 No Contentを返す（要件4.2）
    return jsonResponse(null, 204);
  } catch (error) {
    console.error('Error deleting todo:', error);
    return errorResponse(
      ERROR_CODES.INTERNAL_ERROR,
      'An unexpected error occurred while deleting the todo',
      500
    );
  }
}
