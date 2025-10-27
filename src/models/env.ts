/**
 * Environment Variables and Bindings
 *
 * このファイルはCloudflare Workersの環境変数とバインディングの型定義を提供します。
 * Honoコンテキストの`c.env`を通じてアクセスされます。
 *
 * 参照:
 * - 要件5: データ永続化 (Workers KVバインディング)
 * - 要件10: 認証・認可 (API Key管理)
 * - 要件9: CORSサポート (オリジン設定)
 * - Deployment & Configuration セクション (design.md)
 */

/**
 * Environment Interface
 *
 * Cloudflare Workers環境で利用可能な環境変数とバインディングを定義します。
 *
 * wrangler.toml設定例:
 * ```toml
 * [[kv_namespaces]]
 * binding = "TODO_KV"
 * id = "your-kv-namespace-id"
 * ```
 *
 * シークレット設定例:
 * ```bash
 * wrangler secret put VALID_API_KEYS --env production
 * wrangler secret put ALLOWED_ORIGINS --env production
 * ```
 *
 * @property {KVNamespace} TODO_KV - Todo項目を保存するKVストレージ
 * @property {string} VALID_API_KEYS - カンマ区切りの有効なAPI Keyリスト
 * @property {string} [ALLOWED_ORIGINS] - カンマ区切りの許可オリジンリスト (任意、デフォルト: '*')
 *
 * @example
 * ```typescript
 * import { Context } from 'hono';
 *
 * app.get('/todos', async (c: Context<{ Bindings: Env }>) => {
 *   const kv = c.env.TODO_KV;
 *   const apiKeys = c.env.VALID_API_KEYS.split(',');
 *   const origins = c.env.ALLOWED_ORIGINS || '*';
 *   // ...
 * });
 * ```
 */
export interface Env {
  /**
   * Workers KV Namespace Binding
   *
   * Todo項目を永続化するためのKey-Valueストレージ。
   * グローバルに分散され、エッジロケーションでキャッシュされます。
   *
   * 使用方法:
   * - `await kv.get('todos:${id}')` - Todo取得
   * - `await kv.put('todos:${id}', JSON.stringify(todo))` - Todo保存
   * - `await kv.delete('todos:${id}')` - Todo削除
   * - `await kv.list({ prefix: 'todos:' })` - すべてのTodoキーを取得
   *
   * 特性:
   * - Eventual Consistency (最終的整合性)
   * - 読み込み高速 (10-50ms、エッジキャッシュ時)
   * - 書き込み非同期 (グローバル反映まで最大60秒)
   *
   * 要件: 5.1-5.4 (データ永続化)
   */
  TODO_KV: KVNamespace;

  /**
   * Valid API Keys
   *
   * カンマ区切りの有効なAPI Keyリスト。
   * 認証ミドルウェアで使用され、X-API-Keyヘッダーと照合されます。
   *
   * 形式: "key1,key2,key3"
   *
   * セキュリティ考慮事項:
   * - 絶対にコードリポジトリにコミットしない
   * - wrangler secret putコマンドで設定する
   * - 定期的にローテーションする
   * - 強力なランダム文字列を使用する (例: UUIDv4)
   *
   * 使用例:
   * ```typescript
   * const validKeys = c.env.VALID_API_KEYS.split(',').map(k => k.trim());
   * const providedKey = c.req.header('X-API-Key');
   * if (!validKeys.includes(providedKey)) {
   *   return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } }, 401);
   * }
   * ```
   *
   * 要件: 10.1-10.5 (認証・認可)
   */
  VALID_API_KEYS: string;

  /**
   * Allowed Origins
   *
   * カンマ区切りの許可オリジンリスト。
   * CORSミドルウェアで使用され、クロスオリジンリクエストを制御します。
   *
   * 形式: "https://todo.example.com,https://app.example.com"
   *
   * 環境別設定:
   * - 開発環境: 未設定 (デフォルト: '*')
   * - 本番環境: 特定のオリジンのみ許可 (例: "https://todo.example.com")
   *
   * セキュリティ考慮事項:
   * - 本番環境では '*' を避ける (CSRF攻撃のリスク)
   * - HTTPSオリジンのみを許可する
   * - 必要最小限のオリジンのみを許可する
   *
   * 使用例:
   * ```typescript
   * const allowedOrigins = c.env.ALLOWED_ORIGINS?.split(',').map(o => o.trim()) || '*';
   * cors({
   *   origin: allowedOrigins,
   *   allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
   *   allowHeaders: ['Content-Type', 'X-API-Key'],
   * });
   * ```
   *
   * 要件: 9.1-9.3 (CORSサポート)
   */
  ALLOWED_ORIGINS?: string;
}

/**
 * Environment Variable Configuration
 *
 * 環境変数の設定方法と推奨値を文書化します。
 */
export const ENV_CONFIG = {
  /**
   * KVバインディング名
   * wrangler.tomlで設定
   */
  KV_BINDING_NAME: 'TODO_KV',

  /**
   * API Key環境変数名
   * wrangler secret put で設定
   */
  API_KEYS_VAR_NAME: 'VALID_API_KEYS',

  /**
   * 許可オリジン環境変数名
   * wrangler secret put で設定（本番環境推奨）
   */
  ALLOWED_ORIGINS_VAR_NAME: 'ALLOWED_ORIGINS',

  /**
   * デフォルトの許可オリジン（開発環境用）
   */
  DEFAULT_ALLOWED_ORIGINS: '*',
} as const;

/**
 * Security Best Practices
 *
 * 環境変数管理のセキュリティベストプラクティス
 */
export const SECURITY_BEST_PRACTICES = {
  /**
   * API Keyの推奨フォーマット
   * - 最小32文字
   * - UUIDv4推奨 (例: crypto.randomUUID())
   * - 英数字とハイフンのみ
   */
  API_KEY_FORMAT: /^[a-zA-Z0-9-]{32,}$/,

  /**
   * API Keyローテーション推奨間隔（日数）
   */
  API_KEY_ROTATION_DAYS: 90,

  /**
   * 本番環境でのALLOWED_ORIGINS設定の推奨パターン
   * - HTTPSのみ
   * - 特定のドメインのみ
   * - ワイルドカード禁止
   */
  ALLOWED_ORIGINS_PRODUCTION_PATTERN: /^https:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
} as const;
