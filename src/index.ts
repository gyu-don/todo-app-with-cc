/**
 * Cloudflare Workers Todo Application
 *
 * エントリーポイント: Honoアプリケーションの初期化とルーティング定義
 *
 * アーキテクチャ:
 * - Cloudflare Workers上でHonoフレームワークを使用
 * - Workers KVによるデータ永続化
 * - レイヤードアーキテクチャ（エントリーポイント → ミドルウェア → ハンドラー → ストレージ）
 *
 * 参照:
 * - 要件6: RESTful APIインターフェース (requirements.md)
 * - 要件7: エラーハンドリング (requirements.md)
 * - 要件9: CORSサポート (requirements.md)
 * - 要件10: 認証・認可 (requirements.md)
 * - Hono Application セクション (design.md)
 */

import { Hono } from 'hono';
import type { Env } from './models/env';
import { configureCors } from './middleware/cors';
import { apiKeyAuth } from './middleware/auth';
import { KVStorage } from './storage/kv';
import {
  createTodoHandler,
  getTodosHandler,
  getTodoByIdHandler,
  updateTodoHandler,
  deleteTodoHandler,
} from './handlers/todos';
import { reorderHandler } from './handlers/reorder';
import { errorResponse } from './utils/response';
import { ERROR_CODES } from './models/error';
import { FRONTEND_HTML } from './frontend';

/**
 * Hono Application
 *
 * Cloudflare Workers向けのHonoアプリケーション。
 * 型パラメータでCloudflare Workers Bindingsを定義。
 */
const app = new Hono<{ Bindings: Env }>();

/**
 * Global Error Handler (Task 9.1)
 *
 * 予期しないエラーをキャッチし、標準化されたエラーレスポンスを返します。
 *
 * 機能:
 * - すべての未処理エラーをキャッチ（要件7.4）
 * - エラー詳細をconsole.error()でログに記録（要件7.5）
 * - スタックトレースをクライアントに公開しない（要件14.6）
 * - 500 Internal Server Errorを返す
 *
 * セキュリティ考慮事項:
 * - エラー詳細（スタックトレース、内部変数等）はログにのみ記録
 * - クライアントには一般的なエラーメッセージのみ提供
 */
app.onError((err, _c) => {
  console.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString(),
  });

  return errorResponse(
    ERROR_CODES.INTERNAL_ERROR,
    'An unexpected error occurred. Please try again later.',
    500
  );
});

/**
 * Middleware Chain (Task 10.1)
 *
 * ミドルウェアチェーンの順序:
 * 1. CORS: クロスオリジンリクエストを許可（要件9.1-9.3）
 * 2. Authentication: API Key認証（要件10.1-10.5）
 * 3. Handler: ビジネスロジック実行
 * 4. Error Handler: グローバルエラーハンドリング（app.onError）
 */

// CORS: すべてのルートに適用（要件9.1-9.3）
app.use('/*', configureCors);

// Authentication: すべてのTodo APIルートに適用（要件10.1-10.5）
app.use('/todos/*', apiKeyAuth);
app.use('/todos', apiKeyAuth);

/**
 * RESTful API Routes (Task 10.2)
 *
 * すべてのルートはRESTful APIの原則に従います（要件6.1-6.6）
 *
 * エンドポイント:
 * - POST   /todos       - Todo作成（要件1）
 * - GET    /todos       - 全Todo取得（要件2.1）
 * - GET    /todos/:id   - 特定Todo取得（要件2.2）
 * - PUT    /todos/:id   - Todo更新（要件3）
 * - DELETE /todos/:id   - Todo削除（要件4）
 */

// POST /todos - Todo作成（要件1.1-1.5）
app.post('/todos', async (c) => {
  const storage = new KVStorage(c.env.TODO_KV);
  return createTodoHandler(c, storage);
});

// GET /todos - 全Todo取得（要件2.1, 2.4-2.5）
app.get('/todos', async (c) => {
  const storage = new KVStorage(c.env.TODO_KV);
  return getTodosHandler(c, storage);
});

// GET /todos/:id - 特定Todo取得（要件2.2-2.3）
app.get('/todos/:id', async (c) => {
  const storage = new KVStorage(c.env.TODO_KV);
  return getTodoByIdHandler(c, storage);
});

// PUT /todos/:id - Todo更新（要件3.1-3.6）
app.put('/todos/:id', async (c) => {
  const storage = new KVStorage(c.env.TODO_KV);
  return updateTodoHandler(c, storage);
});

// PUT /todos/:id/reorder - 並び替えAPIエンドポイント追加
app.put('/todos/:id/reorder', async (c) => {
  return reorderHandler(c);
});

// DELETE /todos/:id - Todo削除（要件4.1-4.4）
app.delete('/todos/:id', async (c) => {
  const storage = new KVStorage(c.env.TODO_KV);
  return deleteTodoHandler(c, storage);
});

/**
 * Frontend & Health Check Endpoint
 *
 * ルートパスへのGETリクエストでは、Reactフロントエンドを返します。
 * JSONリクエスト（Accept: application/json）の場合は、APIステータスを返します。
 */
app.get('/', (c) => {
  // JSONリクエストの場合はAPIステータスを返す
  const acceptHeader = c.req.header('Accept') || '';
  if (acceptHeader.includes('application/json')) {
    return c.json({
      name: 'Cloudflare Workers Todo API',
      version: '1.0.0',
      status: 'healthy',
    });
  }

  // それ以外（ブラウザアクセス）はフロントエンドを返す
  return c.html(FRONTEND_HTML);
});

/**
 * 404 Not Found Handler
 *
 * 定義されていないルートへのアクセスに対して404エラーを返します。
 */
app.notFound((_c) => {
  return errorResponse(ERROR_CODES.NOT_FOUND, 'The requested endpoint does not exist', 404);
});

/**
 * Export Hono Application (Task 10.3)
 *
 * Cloudflare Workersのデフォルトエクスポート。
 * Workers環境でfetch()イベントハンドラーとして使用されます。
 *
 * @example
 * ```typescript
 * // Cloudflare Workersでの使用
 * export default app;
 * ```
 */
export default app;
