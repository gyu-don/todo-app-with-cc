/**
 * Response Utility
 *
 * このファイルは標準化されたHTTPレスポンス生成ユーティリティを提供します。
 * すべてのAPIレスポンスは一貫性のある形式で生成され、クライアントが
 * 統一されたレスポンス処理を実装できるようにします。
 *
 * 参照:
 * - 要件6: RESTful APIインターフェース (requirements.md)
 * - 要件7: エラーハンドリング (requirements.md)
 * - 要件14: エラーレスポンスの標準化 (requirements.md)
 * - Response Utility セクション (design.md)
 */

import { ErrorResponse, ErrorCode } from '../models/error';

/**
 * JSON Response Generator
 *
 * 任意のデータをJSON形式のHTTPレスポンスに変換します。
 * すべての成功レスポンスはこの関数を通じて生成されます。
 *
 * 機能:
 * - データをJSON形式にシリアライズ
 * - Content-Typeヘッダーを application/json に設定
 * - 指定されたHTTPステータスコードを設定
 *
 * @template T - レスポンスデータの型
 * @param {T} data - レスポンスに含めるデータ（オブジェクト、配列、プリミティブ）
 * @param {number} status - HTTPステータスコード（例: 200, 201, 204）
 * @returns {Response} JSON形式のHTTPレスポンス
 *
 * @example
 * ```typescript
 * // 単一Todoのレスポンス
 * const todo = { id: '123', title: 'Test', completed: false, createdAt: '2025-10-27T10:00:00.000Z' };
 * return jsonResponse(todo, 200);
 *
 * // Todo配列のレスポンス
 * const todos = [todo1, todo2, todo3];
 * return jsonResponse(todos, 200);
 *
 * // 作成成功レスポンス
 * return jsonResponse(newTodo, 201);
 * ```
 *
 * セキュリティ考慮事項:
 * - センシティブデータ（API Key、内部エラー詳細等）を含めないこと
 * - データは適切にサニタイズされていることを前提とする
 */
export function jsonResponse<T>(data: T, status: number): Response {
  // 204 No Content の場合はボディを持たない
  // RFC 7231: 204レスポンスはメッセージボディを含んではならない
  if (status === 204) {
    return new Response(null, {
      status,
    });
  }

  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Error Response Generator
 *
 * 標準化されたエラーレスポンスを生成します。
 * すべてのエラーレスポンスは統一された形式に従い、クライアントが
 * 一貫性のあるエラーハンドリングを実装できるようにします。
 *
 * エラーレスポンス形式 (要件14.1):
 * ```json
 * {
 *   "error": {
 *     "code": "ERROR_CODE",
 *     "message": "人間が読めるエラーメッセージ"
 *   }
 * }
 * ```
 *
 * @param {ErrorCode} code - エラーコード（VALIDATION_ERROR、UNAUTHORIZED、NOT_FOUND等）
 * @param {string} message - 人間が読めるエラーメッセージ
 * @param {number} status - HTTPステータスコード（400, 401, 404, 500等）
 * @returns {Response} 標準化されたエラーレスポンス
 *
 * @example
 * ```typescript
 * // バリデーションエラー (要件14.3)
 * return errorResponse(
 *   ERROR_CODES.VALIDATION_ERROR,
 *   'Title must be between 1 and 500 characters',
 *   400
 * );
 *
 * // 認証エラー (要件14.4)
 * return errorResponse(
 *   ERROR_CODES.UNAUTHORIZED,
 *   'Invalid API key',
 *   401
 * );
 *
 * // リソース不存在エラー (要件14.5)
 * return errorResponse(
 *   ERROR_CODES.NOT_FOUND,
 *   'Todo item not found',
 *   404
 * );
 *
 * // 内部エラー (要件14.6)
 * return errorResponse(
 *   ERROR_CODES.INTERNAL_ERROR,
 *   'An unexpected error occurred',
 *   500
 * );
 * ```
 *
 * セキュリティ考慮事項 (要件14.6):
 * - 内部エラーの詳細（スタックトレース、技術的な詳細）をクライアントに公開しない
 * - エラー詳細はサーバー側のログにのみ記録する
 * - クライアントには一般的なエラーメッセージのみを提供する
 * - メッセージには以下を含めないこと:
 *   - スタックトレース（"at function...", "Error: ..."）
 *   - ファイルパス（".ts:", ".js:"）
 *   - 内部変数名や実装詳細
 */
export function errorResponse(
  code: ErrorCode,
  message: string,
  status: number
): Response {
  const errorBody: ErrorResponse = {
    error: {
      code,
      message,
    },
  };

  return jsonResponse(errorBody, status);
}
