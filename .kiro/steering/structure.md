# Project Structure

## ルートディレクトリ構成

### 現在の構成
```
todo-app-with-cc/
├── .claude/              # Claude Code設定
│   └── commands/         # カスタムスラッシュコマンド
├── .git/                 # Gitリポジトリ
├── .kiro/                # Kiro仕様駆動開発
│   ├── specs/            # 機能仕様
│   │   └── cloudflare-workers-todo/
│   │       ├── spec.json
│   │       └── requirements.md
│   └── steering/         # プロジェクトステアリング
│       ├── product.md
│       ├── tech.md
│       └── structure.md
└── CLAUDE.md             # プロジェクト指示書
```

### 予定される構成（実装フェーズ後）
```
todo-app-with-cc/
├── .claude/              # Claude Code設定
├── .git/                 # Gitリポジトリ
├── .kiro/                # Kiro仕様駆動開発
├── src/                  # ソースコード
│   ├── index.ts          # Workerエントリーポイント
│   ├── handlers/         # リクエストハンドラー
│   │   ├── todos.ts      # Todo CRUD操作
│   │   └── errors.ts     # エラーハンドリング
│   ├── models/           # データモデル
│   │   └── todo.ts       # Todo型定義
│   ├── storage/          # ストレージ抽象化
│   │   ├── interface.ts  # ストレージインターフェース
│   │   └── kv.ts         # KV実装 (またはd1.ts/durable.ts)
│   └── utils/            # ユーティリティ
│       ├── response.ts   # レスポンス生成ヘルパー
│       └── validation.ts # 入力検証
├── test/                 # テストコード
│   ├── unit/             # ユニットテスト
│   └── integration/      # 統合テスト
├── wrangler.toml         # Wrangler設定
├── package.json          # npm設定
├── tsconfig.json         # TypeScript設定
├── CLAUDE.md             # プロジェクト指示書
└── README.md             # プロジェクトドキュメント
```

## サブディレクトリ構造

### .kiro/ - 仕様駆動開発
```
.kiro/
├── specs/                # 機能仕様ディレクトリ
│   └── [feature-name]/   # 各機能ごとのディレクトリ
│       ├── spec.json     # メタデータと承認トラッキング
│       ├── requirements.md  # 要件定義（EARS形式）
│       ├── design.md     # 技術設計
│       └── tasks.md      # 実装タスク
└── steering/             # ステアリングドキュメント
    ├── product.md        # 製品概要
    ├── tech.md           # 技術スタック
    └── structure.md      # プロジェクト構造
```

### src/ - ソースコード（予定）
```
src/
├── index.ts              # Workerエントリーポイント
│                         # - fetch()イベントハンドラー
│                         # - ルーティング
│                         # - CORSハンドリング
├── handlers/             # ビジネスロジック
│   ├── todos.ts          # Todo CRUD操作
│   │                     # - createTodo()
│   │                     # - getTodos()
│   │                     # - getTodoById()
│   │                     # - updateTodo()
│   │                     # - deleteTodo()
│   └── errors.ts         # エラーハンドリング
│                         # - エラーレスポンス生成
│                         # - ロギング
├── models/               # データモデルと型定義
│   └── todo.ts           # Todo型、インターフェース
│                         # - Todo interface
│                         # - CreateTodoRequest
│                         # - UpdateTodoRequest
├── storage/              # ストレージ層抽象化
│   ├── interface.ts      # ストレージインターフェース
│   │                     # - IStorage interface
│   │                     # - CRUD操作の契約
│   └── kv.ts             # KV実装
│                         # (またはd1.ts/durable.ts)
│                         # - KVStorageクラス
│                         # - IStorageの実装
└── utils/                # ユーティリティ関数
    ├── response.ts       # HTTPレスポンスヘルパー
    │                     # - jsonResponse()
    │                     # - errorResponse()
    │                     # - corsHeaders()
    └── validation.ts     # 入力検証
                          # - validateTodoInput()
                          # - validateId()
```

## コード編成パターン

### レイヤードアーキテクチャ
1. **エントリーポイント層** (`index.ts`)
   - HTTPリクエストの受信
   - ルーティング
   - CORS処理

2. **ハンドラー層** (`handlers/`)
   - ビジネスロジック
   - リクエスト/レスポンス処理
   - バリデーション

3. **ストレージ層** (`storage/`)
   - データ永続化の抽象化
   - ストレージ実装の切り替え可能性

4. **モデル層** (`models/`)
   - 型定義
   - データ構造

### 依存性の方向
```
index.ts → handlers/ → storage/ → models/
                    ↓
                  utils/
```

## ファイル命名規則

### TypeScript/JavaScript
- **ファイル名**: kebab-case （例: `todo-handler.ts`）
- **クラス名**: PascalCase （例: `TodoHandler`）
- **関数名**: camelCase （例: `createTodo`）
- **定数**: UPPER_SNAKE_CASE （例: `MAX_TITLE_LENGTH`）
- **インターフェース**: PascalCase、`I`プレフィックス（例: `IStorage`）
- **型エイリアス**: PascalCase （例: `TodoResponse`）

### テストファイル
- **パターン**: `[name].test.ts` または `[name].spec.ts`
- **場所**: `test/`ディレクトリまたは`src/`と並行配置

### 設定ファイル
- **Wrangler**: `wrangler.toml`
- **TypeScript**: `tsconfig.json`
- **パッケージ**: `package.json`
- **Git無視**: `.gitignore`

## インポート編成

### インポート順序
```typescript
// 1. 外部ライブラリ
import { Router } from 'itty-router';

// 2. 内部モジュール（絶対パス）
import { Todo } from './models/todo';
import { IStorage } from './storage/interface';

// 3. ユーティリティ
import { jsonResponse, errorResponse } from './utils/response';

// 4. 型インポート
import type { Env } from './types';
```

### パスエイリアス（予定）
```typescript
// tsconfig.jsonで設定
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@models/*": ["./src/models/*"],
      "@handlers/*": ["./src/handlers/*"],
      "@utils/*": ["./src/utils/*"]
    }
  }
}
```

## 主要なアーキテクチャ原則

### 1. レイヤー分離
- 各レイヤーは明確な責任を持つ
- 上位レイヤーは下位レイヤーに依存、逆は避ける
- ストレージ層は抽象化されており、実装を容易に切り替え可能

### 2. 型安全性
- TypeScriptを活用した型安全なコード
- すべてのAPI入出力に型定義
- `any`型の使用を最小限に

### 3. テスタビリティ
- 各関数は単一責任原則に従う
- 依存性注入を活用し、テスト容易性を確保
- モック可能なインターフェース設計

### 4. スケーラビリティ
- 機能追加時に既存コードへの影響を最小化
- ストレージ抽象化により、将来的な移行を容易に
- ハンドラーの独立性を保ち、機能追加を簡素化

### 5. Cloudflare Workers最適化
- エッジでの軽量な処理
- 最小限の依存関係
- 高速な起動時間を維持

## Kiro仕様駆動開発の統合

### 仕様ファイルの役割
- **requirements.md**: 実装の「何を」定義（EARS形式）
- **design.md**: 実装の「どのように」定義
- **tasks.md**: 実装の「ステップ」定義
- **spec.json**: 進捗とメタデータ管理

### コードと仕様の対応
各実装ファイルは対応する要件・設計に紐づく:
```
requirements.md (要件6: RESTful API)
    ↓
design.md (エンドポイント設計)
    ↓
src/index.ts (ルーティング実装)
src/handlers/todos.ts (ハンドラー実装)
```

### ステアリングドキュメントの活用
- **常時参照**: すべての開発フェーズで参照される
- **意思決定の基準**: アーキテクチャ決定の拠り所
- **プロジェクト知識の共有**: チーム全体での認識統一
