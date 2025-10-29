/**
 * Authentication Middleware
 *
 * このファイルはAPI認証ミドルウェアを提供します。
 * リクエストの認証・認可を行い、未認証リクエストをブロックします。
 *
 * 参照:
 * - 要件10: 認証・認可 (requirements.md)
 * - Authentication Middleware セクション (design.md)
 */

import type { Context, Next } from 'hono';
import { errorResponse } from '../utils/response';
import { ERROR_CODES } from '../models/error';
import type { Env } from '../models/env';

/**
 * API Key Authentication Middleware
 *
 * X-API-Keyヘッダーを検証し、有効なAPI Keyを持つリクエストのみを許可します。
 * 環境変数VALID_API_KEYSに登録されたキーと照合します。
 *
 * 認証フロー:
 * 1. X-API-Keyヘッダーの存在確認
 * 2. 環境変数VALID_API_KEYSからカンマ区切りのキーリストを取得
 * 3. 提供されたAPI Keyが有効なキーリストに含まれるか検証
 * 4. 認証成功時はnext()を呼び出して次のミドルウェアに制御を渡す
 * 5. 認証失敗時は401 Unauthorizedエラーを返す
 *
 * @param {Context<{ Bindings: Env }>} c - Honoコンテキスト
 * @param {Next} next - 次のミドルウェアを呼び出す関数
 * @returns {Promise<Response | void>} 認証失敗時は401エラー、成功時はvoid
 *
 * @example
 * ```typescript
 * import { Hono } from 'hono';
 * import { apiKeyAuth } from './middleware/auth';
 *
 * const app = new Hono<{ Bindings: Env }>();
 *
 * // すべてのルートに認証を適用
 * app.use('*', apiKeyAuth);
 *
 * // または特定のルートにのみ適用
 * app.use('/todos/*', apiKeyAuth);
 * ```
 *
 * セキュリティ考慮事項:
 * - API Keyは環境変数で管理し、コードにハードコードしない (要件10.2)
 * - HTTPS必須（Cloudflare WorkersはデフォルトでHTTPS）
 * - API Keyのローテーション推奨（定期的に更新）
 * - 空のAPI Keyは無効として扱う (要件10.5)
 * - 環境変数が未設定の場合はすべてのリクエストを拒否
 *
 * エラーレスポンス (要件10.1, 10.3, 10.5):
 * - 401 Unauthorized: API Key欠落または無効
 * - エラーコード: UNAUTHORIZED
 * - エラーメッセージ: 認証失敗の理由を説明
 */
export async function apiKeyAuth(
  c: Context<{ Bindings: Env }>,
  next: Next
): Promise<Response | void> {
  // X-API-Keyヘッダーを取得 (要件10.5)
  const apiKey = c.req.header('X-API-Key');

  // API Keyヘッダーが欠落している場合 (要件10.5)
  if (!apiKey) {
    return errorResponse(
      ERROR_CODES.UNAUTHORIZED,
      'Missing API key. Please provide a valid API key in the X-API-Key header.',
      401
    );
  }

  // 空のAPI Keyを拒否
  if (apiKey.trim() === '') {
    return errorResponse(
      ERROR_CODES.UNAUTHORIZED,
      'Invalid API key. The API key cannot be empty.',
      401
    );
  }

  // 環境変数から有効なAPI Keyリストを取得 (要件10.2)
  const validKeysString = c.env.VALID_API_KEYS;

  // 環境変数が未設定の場合、すべてのリクエストを拒否
  if (!validKeysString || validKeysString.trim() === '') {
    console.error('VALID_API_KEYS environment variable is not set. All requests will be rejected.');
    return errorResponse(
      ERROR_CODES.UNAUTHORIZED,
      'Authentication is not configured. Please contact the administrator.',
      401
    );
  }

  // カンマ区切りのキーリストをパースし、各キーをトリム
  const validKeys = validKeysString
    .split(',')
    .map((key) => key.trim())
    .filter((key) => key.length > 0);

  // 提供されたAPI Keyが有効なキーリストに含まれるか検証 (要件10.2, 10.3)
  if (!validKeys.includes(apiKey)) {
    return errorResponse(
      ERROR_CODES.UNAUTHORIZED,
      'Invalid API key. Please provide a valid API key.',
      401
    );
  }

  // 認証成功: 次のミドルウェアに制御を渡す (要件10.2)
  await next();
}
