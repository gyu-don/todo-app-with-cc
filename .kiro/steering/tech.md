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
以下のいずれかのCloudflareストレージサービスを使用（設計フェーズで決定）:

#### オプション1: Workers KV
- **特性**: グローバル分散型Key-Valueストレージ
- **適用場面**: 読み込み頻度が高く、書き込みが比較的少ない場合
- **レイテンシー**: 読み込みは極めて高速、書き込みは eventual consistency

#### オプション2: Durable Objects
- **特性**: 強い一貫性を持つステートフルオブジェクト
- **適用場面**: トランザクションが必要な場合、リアルタイム性が重要な場合
- **レイテンシー**: 強い一貫性保証

#### オプション3: D1
- **特性**: SQLiteベースのサーバーレスデータベース
- **適用場面**: リレーショナルデータ、複雑なクエリが必要な場合
- **レイテンシー**: エッジで動作するSQLデータベース

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
