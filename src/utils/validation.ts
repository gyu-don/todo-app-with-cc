/**
 * Validation Utilities
 *
 * このファイルは入力データのバリデーション機能を提供します。
 * すべてのユーザー入力は、ハンドラー層でこれらのユーティリティを使用して
 * 検証されます。
 *
 * 参照:
 * - 要件1.3: タイトル検証 (requirements.md)
 * - 要件3.6: 更新データ検証 (requirements.md)
 * - 要件12: データバリデーション (requirements.md)
 * - 要件13: ID生成とデータ構造 (requirements.md)
 * - Validation Utility セクション (design.md)
 */

import { TODO_CONSTRAINTS } from '../models/todo';

/**
 * Validation Result
 *
 * バリデーション結果を表す型。
 * 検証が成功した場合は `valid: true`、失敗した場合は `valid: false` と
 * エラーメッセージを含みます。
 *
 * @example
 * ```typescript
 * const result: ValidationResult = {
 *   valid: false,
 *   error: 'Title must be between 1 and 500 characters'
 * };
 * ```
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate Todo Input
 *
 * Todo作成・更新時の入力データをバリデーションします。
 *
 * **検証項目**:
 * - **title**: 必須、string型、1-500文字、制御文字(\x00-\x1F, \x7F)不可
 * - **completed**: 任意、boolean型のみ
 *
 * **要件**:
 * - 要件1.3: タイトルが空またはnullの場合、エラーを返す
 * - 要件12.1: Todoタイトルが500文字を超える場合、エラーを返す
 * - 要件12.2: Todoタイトルに制御文字が含まれる場合、エラーを返す
 * - 要件12.5: 完了状態に真偽値以外の値が指定された場合、エラーを返す
 *
 * @param input - 検証する入力データ
 * @returns バリデーション結果（valid: boolean, error?: string）
 *
 * @example
 * ```typescript
 * // Valid input
 * const result1 = validateTodoInput({ title: 'Buy groceries' });
 * console.log(result1); // { valid: true }
 *
 * // Invalid input (title too long)
 * const result2 = validateTodoInput({ title: 'a'.repeat(501) });
 * console.log(result2); // { valid: false, error: '...' }
 *
 * // Invalid input (control character)
 * const result3 = validateTodoInput({ title: 'Invalid\x00Title' });
 * console.log(result3); // { valid: false, error: '...' }
 * ```
 */
export function validateTodoInput(input: unknown): ValidationResult {
  // Check if input is an object
  if (!input || typeof input !== 'object') {
    return {
      valid: false,
      error: 'Input must be an object',
    };
  }

  const data = input as Record<string, unknown>;

  // Validate title (required)
  if (!('title' in data) || data['title'] === undefined) {
    return {
      valid: false,
      error: 'title is required',
    };
  }

  // Check title type
  if (typeof data['title'] !== 'string') {
    return {
      valid: false,
      error: 'Title must be a string',
    };
  }

  const title = data['title'] as string;

  // Check title length (minimum)
  if (title.length < TODO_CONSTRAINTS.MIN_TITLE_LENGTH) {
    return {
      valid: false,
      error: 'Title cannot be empty',
    };
  }

  // Check title length (maximum) - 要件12.1
  if (title.length > TODO_CONSTRAINTS.MAX_TITLE_LENGTH) {
    return {
      valid: false,
      error: `Title must be between ${TODO_CONSTRAINTS.MIN_TITLE_LENGTH} and ${TODO_CONSTRAINTS.MAX_TITLE_LENGTH} characters`,
    };
  }

  // Check for control characters - 要件12.2
  if (TODO_CONSTRAINTS.CONTROL_CHARACTERS_REGEX.test(title)) {
    return {
      valid: false,
      error: 'Title cannot contain control characters',
    };
  }

  // Validate completed (optional) - 要件12.5
  if ('completed' in data && data['completed'] !== undefined) {
    if (typeof data['completed'] !== 'boolean') {
      return {
        valid: false,
        error: 'Completed must be a boolean',
      };
    }
  }

  return { valid: true };
}

/**
 * Validate ID
 *
 * IDがUUID v4形式であることを検証します。
 *
 * **検証ルール**:
 * - UUID v4形式の正規表現にマッチすること
 * - 形式: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
 *   - x: 16進数（0-9, a-f）
 *   - y: 8, 9, a, または b（UUIDバリアント）
 *
 * **要件**:
 * - 要件13.1: UUID v4形式の検証
 *
 * @param id - 検証するID
 * @returns IDが有効な場合はtrue、無効な場合はfalse
 *
 * @example
 * ```typescript
 * // Valid UUID v4
 * validateId('550e8400-e29b-41d4-a716-446655440000'); // true
 *
 * // Invalid (not UUID v4)
 * validateId('not-a-uuid'); // false
 * validateId('550e8400-e29b-11d4-a716-446655440000'); // false (UUID v1)
 * ```
 */
export function validateId(id: unknown): boolean {
  // Check if id is a string
  if (typeof id !== 'string') {
    return false;
  }

  // Validate UUID v4 format using regex from TODO_CONSTRAINTS
  return TODO_CONSTRAINTS.UUID_V4_REGEX.test(id);
}

/**
 * Validate Todo Count
 *
 * 現在のTodo件数が上限（500件）未満であることを検証します。
 *
 * **制限の理由**:
 * - Workers KV List APIは最大1000件まで取得可能
 * - 余裕を持って500件に制限することで、安全性を確保
 * - 将来的にページネーション等でスケーラビリティを向上可能
 *
 * **要件**:
 * - KV List API制限（1000件）に対する余裕確保
 *
 * @param currentCount - 現在のTodo件数
 * @returns バリデーション結果（valid: boolean, error?: string）
 *
 * @example
 * ```typescript
 * // Below limit
 * validateTodoCount(499); // { valid: true }
 *
 * // At or above limit
 * validateTodoCount(500); // { valid: false, error: '...' }
 * validateTodoCount(501); // { valid: false, error: '...' }
 * ```
 */
export function validateTodoCount(currentCount: number): ValidationResult {
  // Check if count has reached or exceeded the limit
  if (currentCount >= TODO_CONSTRAINTS.MAX_TODO_COUNT) {
    return {
      valid: false,
      error: `Maximum todo limit (${TODO_CONSTRAINTS.MAX_TODO_COUNT}) has been reached. Please delete some todos before creating new ones.`,
    };
  }

  return { valid: true };
}

/**
 * Validation Error Messages
 *
 * 標準化されたバリデーションエラーメッセージ。
 * エラーレスポンス生成時に使用されます。
 */
export const VALIDATION_ERRORS = {
  /**
   * タイトル関連のエラー
   */
  TITLE_REQUIRED: 'title is required',
  TITLE_INVALID_TYPE: 'Title must be a string',
  TITLE_EMPTY: 'Title cannot be empty',
  TITLE_TOO_LONG: `Title must be between ${TODO_CONSTRAINTS.MIN_TITLE_LENGTH} and ${TODO_CONSTRAINTS.MAX_TITLE_LENGTH} characters`,
  TITLE_CONTROL_CHARS: 'Title cannot contain control characters',

  /**
   * 完了状態関連のエラー
   */
  COMPLETED_INVALID_TYPE: 'Completed must be a boolean',

  /**
   * ID関連のエラー
   */
  ID_INVALID_FORMAT: 'ID must be a valid UUID v4',

  /**
   * Todo件数関連のエラー
   */
  TODO_LIMIT_REACHED: `Maximum todo limit (${TODO_CONSTRAINTS.MAX_TODO_COUNT}) has been reached`,
} as const;

/**
 * Check if the given ID is a valid UUID v4.
 *
 * @param id - The ID to validate
 * @returns True if the ID is a valid UUID v4, false otherwise
 */
export function isValidUUIDv4(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}
