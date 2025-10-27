/**
 * CORS Middleware
 *
 * このファイルはCORS（Cross-Origin Resource Sharing）ミドルウェアを提供します。
 * クロスオリジンリクエストを適切に処理し、プリフライトリクエストに対応します。
 *
 * 参照:
 * - 要件9: CORSサポート (requirements.md)
 * - CORS Middleware セクション (design.md)
 */

import type { Context, Next } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from '../models/env';

/**
 * Get Allowed Origins from Environment
 *
 * 環境変数ALLOWED_ORIGINSから許可オリジンを取得します。
 * 未設定の場合は'*'（開発用）を返します。
 *
 * @param {Context<{ Bindings: Env }>} c - Honoコンテキスト
 * @returns {string | string[]} 許可オリジン（文字列または文字列配列）
 *
 * 環境変数の形式:
 * - `'*'`: すべてのオリジンを許可（開発環境用）
 * - `'https://app.example.com,https://todo.example.com'`: カンマ区切りのオリジンリスト
 * - 未設定または空文字: `'*'` として扱う
 *
 * セキュリティ上の注意 (design.md):
 * - 本番環境では必ず `ALLOWED_ORIGINS` を設定し、`'*'` を避けてください
 * - クレデンシャル（API Key）を含むリクエストで `origin: '*'` を使用すると、CSRFリスクが増大します
 *
 * @example
 * ```typescript
 * // 開発環境（デフォルト）
 * ALLOWED_ORIGINS = undefined → '*'
 *
 * // 本番環境
 * ALLOWED_ORIGINS = 'https://app.example.com,https://todo.example.com'
 * → ['https://app.example.com', 'https://todo.example.com']
 * ```
 */
function getAllowedOrigins(c: Context<{ Bindings: Env }>): string | string[] {
  const origins = c.env.ALLOWED_ORIGINS;

  // 環境変数が未設定または空文字の場合は'*'（開発用）
  if (!origins || origins.trim() === '') {
    return '*';
  }

  // ワイルドカードの場合
  if (origins.trim() === '*') {
    return '*';
  }

  // カンマ区切りのオリジンリストをパースし、各オリジンをトリム
  return origins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/**
 * Configure CORS Middleware
 *
 * Honoの組み込みCORSミドルウェアを使用してCORSを設定します。
 * 環境変数ALLOWED_ORIGINSから許可オリジンを動的に取得します。
 *
 * 機能:
 * - プリフライトリクエスト（OPTIONS）の処理 (要件9.1)
 * - Access-Control-Allow-Originヘッダーの付与 (要件9.2)
 * - 許可されたHTTPメソッドとヘッダーの指定 (要件9.3)
 *
 * 許可されるHTTPメソッド:
 * - GET: Todo取得
 * - POST: Todo作成
 * - PUT: Todo更新
 * - DELETE: Todo削除
 * - OPTIONS: プリフライトリクエスト
 *
 * 許可されるヘッダー:
 * - Content-Type: JSONリクエストボディ
 * - X-API-Key: API Key認証
 *
 * @param {Context<{ Bindings: Env }>} c - Honoコンテキスト
 * @param {Next} next - 次のミドルウェアを呼び出す関数
 * @returns {Promise<Response | void>} CORSヘッダーが付与されたレスポンス
 *
 * @example
 * ```typescript
 * import { Hono } from 'hono';
 * import { configureCors } from './middleware/cors';
 *
 * const app = new Hono<{ Bindings: Env }>();
 *
 * // すべてのルートにCORSを適用
 * app.use('/*', configureCors);
 * ```
 *
 * 環境別設定例:
 * ```bash
 * # 開発環境（ローカル）
 * ALLOWED_ORIGINS=*
 *
 * # 本番環境
 * ALLOWED_ORIGINS=https://todo.example.com,https://app.example.com
 * ```
 */
export async function configureCors(
  c: Context<{ Bindings: Env }>,
  next: Next
): Promise<Response | void> {
  const allowedOrigins = getAllowedOrigins(c);

  // Honoの組み込みCORSミドルウェアを使用
  return cors({
    origin: allowedOrigins,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'X-API-Key'],
  })(c, next);
}
