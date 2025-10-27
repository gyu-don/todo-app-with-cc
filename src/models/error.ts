/**
 * Error Response Model
 *
 * このファイルはAPIエラーレスポンスの標準化された型定義を提供します。
 * すべてのエラーレスポンスは統一された形式に従い、クライアントが一貫性のある
 * エラーハンドリングを実装できるようにします。
 *
 * 参照:
 * - 要件7: エラーハンドリング (requirements.md)
 * - 要件14: エラーレスポンスの標準化 (requirements.md)
 * - Error Handling セクション (design.md)
 */

/**
 * Error Code
 *
 * APIで使用されるエラーコードの型定義。
 * 各エラーコードは特定のHTTPステータスコードにマッピングされます。
 *
 * エラーコードとHTTPステータスコードのマッピング:
 * - VALIDATION_ERROR: 400 Bad Request (要件14.3)
 * - UNAUTHORIZED: 401 Unauthorized (要件14.4)
 * - NOT_FOUND: 404 Not Found (要件14.5)
 * - METHOD_NOT_ALLOWED: 405 Method Not Allowed
 * - TODO_LIMIT_REACHED: 400 Bad Request
 * - INTERNAL_ERROR: 500 Internal Server Error (要件14.6)
 */
export type ErrorCode =
  | 'VALIDATION_ERROR' // バリデーションエラー (400)
  | 'UNAUTHORIZED' // 認証エラー (401)
  | 'NOT_FOUND' // リソース不存在 (404)
  | 'METHOD_NOT_ALLOWED' // メソッド不許可 (405)
  | 'TODO_LIMIT_REACHED' // Todo項目数上限到達 (400)
  | 'INTERNAL_ERROR'; // 内部エラー (500)

/**
 * Error Response
 *
 * すべてのAPIエラーレスポンスの標準形式。
 * クライアントは常にこの形式でエラーを受け取ります。
 *
 * 形式 (要件14.1):
 * ```json
 * {
 *   "error": {
 *     "code": "ERROR_CODE",
 *     "message": "人間が読めるエラーメッセージ"
 *   }
 * }
 * ```
 *
 * セキュリティ考慮事項 (要件14.6):
 * - 内部エラーの詳細（スタックトレース等）はクライアントに公開しない
 * - エラー詳細はサーバー側のログにのみ記録する
 * - クライアントには一般的なエラーメッセージのみを提供する
 *
 * @property {object} error - エラー詳細を含むオブジェクト
 * @property {ErrorCode} error.code - エラーコード
 * @property {string} error.message - 人間が読めるエラーメッセージ
 *
 * @example
 * ```typescript
 * // バリデーションエラーの例
 * const validationError: ErrorResponse = {
 *   error: {
 *     code: 'VALIDATION_ERROR',
 *     message: 'Title must be between 1 and 500 characters'
 *   }
 * };
 *
 * // 認証エラーの例
 * const authError: ErrorResponse = {
 *   error: {
 *     code: 'UNAUTHORIZED',
 *     message: 'Invalid API key'
 *   }
 * };
 *
 * // リソース不存在エラーの例
 * const notFoundError: ErrorResponse = {
 *   error: {
 *     code: 'NOT_FOUND',
 *     message: 'Todo item not found'
 *   }
 * };
 * ```
 */
export interface ErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
  };
}

/**
 * Error Codes Constant
 *
 * エラーコードの定数定義。
 * コード全体で一貫性のあるエラーコードを使用するために使用します。
 *
 * @example
 * ```typescript
 * import { ERROR_CODES } from './models/error';
 *
 * const error: ErrorResponse = {
 *   error: {
 *     code: ERROR_CODES.VALIDATION_ERROR,
 *     message: 'Invalid input'
 *   }
 * };
 * ```
 */
export const ERROR_CODES = {
  /**
   * バリデーションエラー
   * HTTPステータス: 400 Bad Request
   * 使用例: 入力データが検証ルールに違反している場合
   */
  VALIDATION_ERROR: 'VALIDATION_ERROR' as const,

  /**
   * 認証エラー
   * HTTPステータス: 401 Unauthorized
   * 使用例: API Keyが無効または欠落している場合 (要件10.1, 10.3, 10.5)
   */
  UNAUTHORIZED: 'UNAUTHORIZED' as const,

  /**
   * リソース不存在エラー
   * HTTPステータス: 404 Not Found
   * 使用例: 指定されたIDのTodoが存在しない場合 (要件2.3, 3.3, 4.3)
   */
  NOT_FOUND: 'NOT_FOUND' as const,

  /**
   * メソッド不許可エラー
   * HTTPステータス: 405 Method Not Allowed
   * 使用例: サポートされていないHTTPメソッドが使用された場合 (要件6.6)
   */
  METHOD_NOT_ALLOWED: 'METHOD_NOT_ALLOWED' as const,

  /**
   * Todo項目数上限到達エラー
   * HTTPステータス: 400 Bad Request
   * 使用例: Todo項目が500件に達している場合
   */
  TODO_LIMIT_REACHED: 'TODO_LIMIT_REACHED' as const,

  /**
   * 内部エラー
   * HTTPステータス: 500 Internal Server Error
   * 使用例: 予期しないエラーやストレージエラーが発生した場合 (要件5.4, 7.4)
   */
  INTERNAL_ERROR: 'INTERNAL_ERROR' as const,
} as const;

/**
 * HTTP Status Code Mapping
 *
 * エラーコードとHTTPステータスコードのマッピング。
 * ResponseUtilityで使用されます。
 */
export const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  TODO_LIMIT_REACHED: 400,
  INTERNAL_ERROR: 500,
} as const;
