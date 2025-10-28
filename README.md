# Cloudflare Workers Todo API

Cloudflare Workers上で動作する高性能なTodo管理APIです。エッジコンピューティングを活用し、世界中どこからでも低レイテンシーでアクセス可能です。

## 特徴

- **⚡️ 高速**: Cloudflare Workersのエッジネットワークで世界中から低レイテンシーアクセス
- **🔒 セキュア**: API Key認証、CORS設定、入力バリデーション
- **📦 軽量**: Hono フレームワークを使用した最小限のバンドルサイズ（~12KB）
- **🧪 高品質**: 227のテストでカバー（ユニット・統合テスト）
- **📝 型安全**: TypeScriptによる完全な型安全性
- **🌐 RESTful**: 標準的なRESTful API設計

## 技術スタック

- **Runtime**: Cloudflare Workers (V8 Isolates)
- **Framework**: Hono (v4.6+)
- **Language**: TypeScript (v5.7+)
- **Storage**: Workers KV
- **Testing**: Vitest + @cloudflare/vitest-pool-workers
- **Dev Tools**: Wrangler (v3.96+)

## 前提条件

- Node.js 18.0.0以上
- npm または yarn
- Cloudflareアカウント（デプロイ時）

## セットアップ

### 1. プロジェクトのクローン

```bash
git clone <repository-url>
cd cloudflare-workers-todo
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 開発環境の設定

`.dev.vars`ファイルを作成（ローカル開発用）:

```env
# API Keys (comma-separated)
VALID_API_KEYS=dev-key-1,dev-key-2

# CORS Origins (comma-separated, or * for development)
ALLOWED_ORIGINS=*
```

### 4. ローカル開発サーバーの起動

```bash
npm run dev
```

デフォルトで`http://localhost:8787`でサーバーが起動します。

## API仕様

### 認証

全てのAPIエンドポイント（`/todos`配下）はAPI Key認証が必要です。

```http
X-API-Key: your-api-key-here
```

### エンドポイント

#### ヘルスチェック

```http
GET /
```

**レスポンス例**:
```json
{
  "name": "Cloudflare Workers Todo API",
  "version": "1.0.0",
  "status": "healthy"
}
```

#### Todo作成

```http
POST /todos
Content-Type: application/json
X-API-Key: your-api-key

{
  "title": "買い物に行く"
}
```

**レスポンス** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "買い物に行く",
  "completed": false,
  "createdAt": "2025-01-15T10:30:00.000Z"
}
```

#### 全Todo取得

```http
GET /todos
X-API-Key: your-api-key
```

**レスポンス** (200 OK):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "買い物に行く",
    "completed": false,
    "createdAt": "2025-01-15T10:30:00.000Z"
  }
]
```

#### 特定Todo取得

```http
GET /todos/:id
X-API-Key: your-api-key
```

**レスポンス** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "買い物に行く",
  "completed": false,
  "createdAt": "2025-01-15T10:30:00.000Z"
}
```

#### Todo更新

```http
PUT /todos/:id
Content-Type: application/json
X-API-Key: your-api-key

{
  "title": "買い物に行く（更新）",
  "completed": true
}
```

**レスポンス** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "買い物に行く（更新）",
  "completed": true,
  "createdAt": "2025-01-15T10:30:00.000Z"
}
```

#### Todo削除

```http
DELETE /todos/:id
X-API-Key: your-api-key
```

**レスポンス**: 204 No Content

### エラーレスポンス

全てのエラーは以下の形式で返されます:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title must be between 1 and 500 characters"
  }
}
```

#### エラーコード一覧

| コード | HTTPステータス | 説明 |
|--------|---------------|------|
| `VALIDATION_ERROR` | 400 | 入力値が不正 |
| `UNAUTHORIZED` | 401 | API Keyが無効または欠落 |
| `NOT_FOUND` | 404 | リソースが見つからない |
| `METHOD_NOT_ALLOWED` | 405 | HTTPメソッドが未サポート |
| `TODO_LIMIT_REACHED` | 400 | Todo数が上限（500件）に達している |
| `INTERNAL_ERROR` | 500 | 内部サーバーエラー |

### バリデーションルール

#### Todoタイトル
- **必須**: はい
- **型**: string
- **長さ**: 1-500文字
- **制限**: 制御文字（\x00-\x1F, \x7F）は使用不可

#### Completed
- **必須**: いいえ
- **型**: boolean
- **デフォルト**: false

## 開発

### テストの実行

```bash
# 全テストを実行
npm test

# カバレッジレポート生成
npm run test:coverage
```

### 型チェック

```bash
npm run typecheck
```

### リント

```bash
# リントチェック
npm run lint

# 自動修正
npm run lint:fix
```

### フォーマット

```bash
# フォーマットチェック
npm run format:check

# 自動フォーマット
npm run format
```

## デプロイ

### 1. KV Namespaceの作成

```bash
# 開発環境
wrangler kv:namespace create "TODO_KV"

# 本番環境
wrangler kv:namespace create "TODO_KV" --env production
```

作成されたNamespace IDを`wrangler.toml`に設定してください。

### 2. シークレットの設定

```bash
# API Keysを設定（カンマ区切りで複数指定可能）
wrangler secret put VALID_API_KEYS
# 入力: key1,key2,key3

# CORS Originsを設定（本番環境）
wrangler secret put ALLOWED_ORIGINS --env production
# 入力: https://example.com,https://app.example.com
```

### 3. デプロイ

```bash
# 開発環境へデプロイ
npm run deploy

# 本番環境へデプロイ
npm run deploy:production
```

### 4. デプロイ確認

```bash
# デプロイ後のURLにリクエスト
curl https://cloudflare-workers-todo.<your-subdomain>.workers.dev/

# API動作確認
curl -X POST https://cloudflare-workers-todo.<your-subdomain>.workers.dev/todos \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"title": "Test Todo"}'
```

## 環境変数

| 変数名 | 必須 | 説明 | 例 |
|--------|------|------|-----|
| `VALID_API_KEYS` | はい | 有効なAPI Key（カンマ区切り） | `key1,key2,key3` |
| `ALLOWED_ORIGINS` | いいえ | 許可するCORSオリジン（カンマ区切り） | `https://example.com,*` |
| `TODO_KV` | はい（バインディング） | Workers KV Namespace | - |

**注意**: 本番環境では`ALLOWED_ORIGINS`を特定のドメインに制限することを推奨します。

## プロジェクト構造

```
cloudflare-workers-todo/
├── src/
│   ├── index.ts              # アプリケーションエントリーポイント
│   ├── handlers/
│   │   └── todos.ts          # Todoハンドラー（CRUD操作）
│   ├── middleware/
│   │   ├── auth.ts           # API Key認証ミドルウェア
│   │   └── cors.ts           # CORSミドルウェア
│   ├── models/
│   │   ├── todo.ts           # Todoドメインモデル
│   │   ├── error.ts          # エラー型定義
│   │   └── env.ts            # 環境変数型定義
│   ├── storage/
│   │   ├── interface.ts      # ストレージインターフェース
│   │   └── kv.ts             # Workers KV実装
│   └── utils/
│       ├── validation.ts     # 入力バリデーション
│       └── response.ts       # レスポンス生成ユーティリティ
├── test/
│   ├── unit/                 # ユニットテスト
│   └── integration/          # 統合テスト
├── wrangler.toml             # Cloudflare Workers設定
├── tsconfig.json             # TypeScript設定
├── tsconfig.build.json       # 本番ビルド用TypeScript設定
├── vitest.config.ts          # テスト設定
└── package.json
```

## アーキテクチャ

本プロジェクトは以下のレイヤー構造を採用しています:

1. **Entry Point** (`src/index.ts`)
   - Honoアプリケーション初期化
   - ルーティング定義
   - グローバルエラーハンドリング

2. **Middleware** (`src/middleware/`)
   - CORS設定
   - API Key認証

3. **Handlers** (`src/handlers/`)
   - ビジネスロジック
   - リクエスト/レスポンス処理

4. **Storage** (`src/storage/`)
   - データ永続化の抽象化
   - Workers KV実装

5. **Utils** (`src/utils/`)
   - バリデーション
   - レスポンス生成
   - 共通ユーティリティ

## パフォーマンス

- **Cold Start**: < 50ms（Cloudflare Workers V8 Isolates）
- **Response Time**: < 200ms P95（エッジロケーションでの処理）
- **Bundle Size**: ~12KB（Hono + application code）
- **Concurrent Requests**: 無制限（Cloudflare Workersの特性）

## 制限事項

- **Todo数**: 最大500件（KV List API制限考慮）
- **タイトル長**: 1-500文字
- **Workers KV**: Eventual Consistency（結果整合性）
- **CPU Time**: 50ms/リクエスト（Cloudflare Workers制限）

## トラブルシューティング

### ローカル開発でKVが動作しない

`.dev.vars`ファイルが正しく設定されているか確認してください。

### デプロイ後に401エラーが返る

`VALID_API_KEYS`シークレットが正しく設定されているか確認:

```bash
wrangler secret list
```

### CORSエラーが発生する

`ALLOWED_ORIGINS`環境変数が正しく設定されているか確認してください。開発環境では`*`、本番環境では特定のドメインを指定してください。

## ライセンス

MIT

## サポート

問題が発生した場合は、GitHubのIssuesで報告してください。

## 貢献

プルリクエストは歓迎します！大きな変更の場合は、まずIssueで議論してください。

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 謝辞

- [Hono](https://hono.dev/) - 軽量で高速なWebフレームワーク
- [Cloudflare Workers](https://workers.cloudflare.com/) - エッジコンピューティングプラットフォーム
- [Vitest](https://vitest.dev/) - 高速なテストフレームワーク
