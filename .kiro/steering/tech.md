# Technology Stack

## アーキテクチャ

### システムアーキテクチャ
- **デプロイメント**: Cloudflare Workers (サーバーレス・エッジコンピューティング)
- **アーキテクチャパターン**: RESTful API、サーバーレスアーキテクチャ
- **実行環境**: V8 JavaScript/TypeScript ランタイム

### データフロー
```
クライアント → Cloudflare Workers (エッジ) → ストレージ (KV/D1/Durable Objects)
```

## バックエンド技術

### ランタイム環境
- **Cloudflare Workers**: V8 isolates上で動作するサーバーレス実行環境
- **言語**: TypeScript/JavaScript
- **HTTP処理**: Fetch API標準に準拠

### Webフレームワーク
- **Hono**: Cloudflare Workers向けの軽量・高速Webフレームワーク
  - **特徴**:
    - エッジ環境に最適化された軽量設計（~12KB）
    - TypeScript完全サポート
    - 直感的なルーティングAPI
    - ミドルウェアサポート（CORS、ロギング、エラーハンドリング）
    - Fetch API準拠
  - **選定理由**:
    - Cloudflare Workersでのパフォーマンスが実証済み
    - 最小限の依存関係で起動時間を短縮
    - Express風のシンプルなAPI設計
    - 型安全なルーティングとバリデーション
  - **主な機能**:
    - ルーティング（パスパラメータ、クエリパラメータ）
    - ミドルウェアチェーン
    - 組み込みCORSサポート
    - JSONレスポンスヘルパー
    - エラーハンドリング

### データ永続化

#### 選定: Workers KV ⭐

**選定理由**:
- **シンプルな実装**: Key-Value形式でTodoリストを保存、実装が最も容易
- **高速な読み込み**: 10-50ms、パフォーマンス要件（< 50ms P95）を達成可能
- **無料枠が大きい**: 100,000 read/日、1,000 write/日、利用者が少ない想定に適合
- **エッジ最適化**: グローバル分散により、どの地域からも低レイテンシー
- **MVPに最適**: Todoアプリケーションに必要な一貫性レベル（eventual consistency）で十分

**特性**:
- グローバル分散型Key-Valueストレージ
- 読み込み: 極めて高速（10-50ms）
- 書き込み: eventual consistency（数秒の遅延）
- データ構造: JSON形式でTodo配列を保存

**制約と対応**:
- eventual consistency → Todoアプリでは許容可能（数秒の遅延は問題なし）
- 1,000 write/日の制限 → 利用者少数の想定では十分

**参考：他のオプション（今回不採用）**:
- **Durable Objects**: 強い一貫性が必要な場合（今回は不要）
- **D1**: 複雑なクエリやリレーショナルデータが必要な場合（今回は不要）

### 認証・セキュリティ

#### 認証方式（2段階）

**1. Cloudflare Access（ブラウザアクセス用）** ⭐推奨
- **対象**: 開発者やエンドユーザーのブラウザアクセス
- **方式**: Email OTP、Google Login等
- **設定**: Cloudflare Dashboard（コード変更不要）
- **無料枠**: 最大5ユーザー
- **メリット**:
  - 実装コストゼロ
  - OAuth2/OIDCへの将来的な移行が容易
  - DoS対策も含まれる

**2. 固定API Key（プログラマティックアクセス用）**
- **対象**: CI/CD、スクリプト、自動化ツール
- **方式**: HTTPヘッダー `X-API-Key` で認証
- **設定**: 環境変数 `VALID_API_KEYS` で管理
- **実装**:
  ```typescript
  // middleware/auth.ts
  export const apiKeyAuth = async (c: Context, next: Next) => {
    const apiKey = c.req.header('X-API-Key');
    const validKeys = c.env.VALID_API_KEYS?.split(',') || [];

    if (!apiKey || !validKeys.includes(apiKey)) {
      return c.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid API key' } }, 401);
    }

    await next();
  };
  ```

**将来の拡張**: OAuth2/OIDC対応時も同じヘッダーベース認証パターンを継承可能

#### DoS保護

**レイヤー1: Cloudflare Bot Management（無料）**
- 自動ボット検出・ブロック
- 設定: Dashboard → Security → Bots

**レイヤー2: Cloudflare Access（無料、最大5ユーザー）**
- 認証済みユーザーのみアクセス許可
- 不正アクセスを根本的に防止

**レイヤー3: Workers無料枠制限（自動）**
- 100,000 req/日の上限
- 超過時に自動停止（予期しないコスト発生を防止）

**将来の拡張（Phase 2）**:
- Rate Limiting Rules: 100 req/分/IP等の詳細な制限
- 有料プランでより柔軟な設定

## 開発環境

### 必須ツール
- **Node.js**: v18以上（推奨: LTS版）
- **npm/yarn/pnpm**: パッケージ管理
- **Wrangler CLI**: Cloudflare Workers開発・デプロイツール
- **Git**: バージョン管理
- **Claude Code**: Kiro方式のスペック駆動開発

### 必須パッケージ
- **hono**: Webフレームワーク
- **TypeScript**: 型安全性の向上

### 推奨ツール
- **ESLint/Prettier**: コード品質・フォーマット
- **Vitest**: ユニットテスト（Workers環境対応）
- **Miniflare**: ローカル開発環境

## 一般的なコマンド

### 開発サイクル（予定）
```bash
# 依存関係のインストール
npm install

# ローカル開発サーバーの起動
npm run dev
# または
wrangler dev

# テストの実行
npm test

# ビルド
npm run build

# デプロイ（プロダクション）
npm run deploy
# または
wrangler deploy

# デプロイ（ステージング）
wrangler deploy --env staging
```

### Kiroワークフロー
```bash
# 仕様の初期化
/kiro:spec-init [description]

# 要件生成
/kiro:spec-requirements [feature-name]

# 設計生成
/kiro:spec-design [feature-name]

# タスク生成
/kiro:spec-tasks [feature-name]

# 実装
/kiro:spec-impl [feature-name]

# ステータス確認
/kiro:spec-status [feature-name]

# ステアリング更新
/kiro:steering
```

## 環境変数

### 開発環境
```bash
# 現時点では環境変数なし
# 将来的に追加される可能性:
# - API認証キー
# - CORS許可オリジン設定
# - ログレベル設定
```

### Wrangler設定
設定は `wrangler.toml` ファイルで管理（まだ作成されていません）:
```toml
# 予定される設定項目:
# - name: Worker名
# - compatibility_date: 互換性日付
# - binding: KV/D1/Durable Objectsバインディング
```

## ポート設定

### ローカル開発
- **8787**: Wrangler dev デフォルトポート（予定）
- カスタマイズ可能: `wrangler dev --port [PORT]`

### プロダクション
- Cloudflare Workers は標準のHTTP/HTTPS (80/443) で動作
- カスタムドメイン設定可能

## API設計原則

### RESTful設計
- **エンドポイント**: リソースベースのURL設計
- **HTTPメソッド**: GET, POST, PUT/PATCH, DELETE
- **ステータスコード**: 適切なHTTPステータスコードの使用
- **レスポンス形式**: JSON

### エンドポイント構造（予定）
```
GET    /todos      - すべてのTodo取得
POST   /todos      - Todo作成
GET    /todos/:id  - 特定のTodo取得
PUT    /todos/:id  - Todo更新
DELETE /todos/:id  - Todo削除
```

## パフォーマンス要件

### レスポンスタイム目標
- **エッジ処理**: < 50ms (P95)
- **ストレージアクセス込み**: < 200ms (P95)

### スケーラビリティ
- Cloudflare Workersの自動スケーリングを活用
- リクエスト数の制限なし（Cloudflareプランに依存）

## セキュリティ考慮事項

### 現在の範囲
- **CORS設定**: 適切なオリジン制限
- **入力検証**: すべてのユーザー入力を検証
- **エラーハンドリング**: 詳細すぎるエラー情報の露出を避ける

### 将来的な追加
- 認証・認可（JWT、API Key等）
- レート制限
- 入力サニタイゼーション強化
