# 環境変数セットアップガイド

このドキュメントでは、Cloudflare Workers Todoアプリケーションに必要な環境変数の設定方法をまとめています。

## 📋 概要

環境変数は以下の3つの場所で設定する必要があります：

1. **GitHub Secrets** - CI/CDパイプライン用
2. **Claude Code環境（ローカル開発）** - ローカルでの開発とテスト用
3. **Cloudflare Workers** - 本番環境とステージング環境用

---

## 1️⃣ GitHub Secrets（CI/CD用）

GitHub Actionsを使用してCI/CDパイプラインを構築する場合に必要です。

### 設定方法

GitHub リポジトリ → Settings → Secrets and variables → Actions → New repository secret

### 必要なシークレット

| シークレット名 | 説明 | 取得方法 |
|--------------|------|---------|
| **CLOUDFLARE_API_TOKEN** | Cloudflare APIトークン（デプロイ用） | Cloudflare Dashboard → My Profile → API Tokens → Create Token → "Edit Cloudflare Workers" テンプレート使用 |
| **CLOUDFLARE_ACCOUNT_ID** | CloudflareアカウントID | Cloudflare Dashboard → Workers & Pages → 右側のAccount IDをコピー |
| **VALID_API_KEYS_TEST** | テスト用API Keyリスト（カンマ区切り） | 任意の文字列を生成（例: `test-key-1,test-key-2`） |

### 使用例（GitHub Actions）

```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        env:
          VALID_API_KEYS: ${{ secrets.VALID_API_KEYS_TEST }}
        run: npm test

      - name: Deploy to Cloudflare Workers
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: npx wrangler deploy --env production
```

---

## 2️⃣ Claude Code環境（ローカル開発用）

⚠️ **重要**: Claude Code環境ではインタラクティブなブラウザ認証（`wrangler login`）は使用できません。代わりに環境変数 `CLOUDFLARE_API_TOKEN` を使用します。

### 設定方法1: Cloudflare API Token設定（必須）

Claude Code環境でWranglerを使用するには、環境変数でAPI Tokenを設定します。

**ステップ1: Cloudflare API Tokenの取得（ユーザーが手作業で実行）**

1. Cloudflare Dashboard → My Profile → API Tokens
2. "Create Token" をクリック
3. "Edit Cloudflare Workers" テンプレートを使用
4. 生成されたトークンをコピー

**ステップ2: Claude Code環境に環境変数を設定**

`.dev.vars` ファイルに追加:
```bash
CLOUDFLARE_API_TOKEN=your-api-token-here
CLOUDFLARE_ACCOUNT_ID=your-account-id-here
```

または、Claude Code起動時に環境変数として渡す:
```bash
export CLOUDFLARE_API_TOKEN=your-api-token-here
export CLOUDFLARE_ACCOUNT_ID=your-account-id-here
```

### 設定方法2: ローカル環境変数（.dev.vars）

ローカル開発用の環境変数を `.dev.vars` ファイルに記載します。

**`.dev.vars` ファイル作成**:

```bash
# プロジェクトルートに作成
cat > .dev.vars <<EOF
VALID_API_KEYS=local-test-key-1,local-test-key-2
ALLOWED_ORIGINS=*
EOF
```

**`.gitignore` に追加**:

```bash
# .dev.vars をgitignoreに追加（シークレット漏洩防止）
echo ".dev.vars" >> .gitignore
```

### 設定方法3: テスト用の環境変数（Vitest）

Vitestでテストを実行する場合、テスト用の環境変数を設定します。

**`vitest.config.ts` で設定**:

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'miniflare',
    environmentOptions: {
      bindings: {
        TODO_KV: 'TODO_KV',
        VALID_API_KEYS: 'test-key-1,test-key-2',
        ALLOWED_ORIGINS: '*',
      },
      kvNamespaces: ['TODO_KV'],
    },
  },
});
```

または、テスト実行時に環境変数を渡す：

```bash
VALID_API_KEYS=test-key-1,test-key-2 npm test
```

### 推奨: CI/CDに寄せる

Claude Code環境での繰り返し作業（デプロイ、テスト実行など）は、CI/CDパイプラインで自動化することを強く推奨します。これにより：

- 環境変数の設定が一元管理される
- 手作業によるミスが減少する
- デプロイプロセスが標準化される

詳細は「1️⃣ GitHub Secrets（CI/CD用）」セクションを参照してください。

---

## 3️⃣ Cloudflare Workers環境（本番・ステージング用）

Cloudflare Workersにデプロイする際に必要な環境変数です。

### 🔐 重要: シークレット管理

**絶対にやってはいけないこと**:
- `wrangler.toml` にAPI Keyやシークレットを平文で記載する
- GitリポジトリにAPI Keyをコミットする

**正しい方法**: `wrangler secret` コマンドを使用する

### 設定方法: wrangler secret コマンド

#### ステージング環境（開発環境）

```bash
# API Keyの設定
npx wrangler secret put VALID_API_KEYS
# プロンプト: dev-key-1,dev-key-2,dev-key-3 を入力

# CORS設定（開発時は省略可、デフォルトは'*'）
npx wrangler secret put ALLOWED_ORIGINS
# プロンプト: * を入力（または特定のオリジン）
```

#### 本番環境

```bash
# 本番環境のAPI Key設定
npx wrangler secret put VALID_API_KEYS --env production
# プロンプト: prod-key-1,prod-key-2,prod-key-3 を入力
# ⚠️ 強力なキーを使用（32文字以上のランダム文字列推奨）

# 本番環境のCORS設定（セキュリティのため特定のオリジンのみ許可）
npx wrangler secret put ALLOWED_ORIGINS --env production
# プロンプト: https://todo.example.com,https://app.example.com を入力
```

### シークレット一覧の確認

```bash
# ステージング環境
npx wrangler secret list

# 本番環境
npx wrangler secret list --env production
```

### シークレットの削除

```bash
# ステージング環境
npx wrangler secret delete VALID_API_KEYS

# 本番環境
npx wrangler secret delete VALID_API_KEYS --env production
```

---

## 🔑 API Key生成のベストプラクティス

### 強力なAPI Keyの生成方法

```bash
# 方法1: OpenSSLを使用（推奨）
openssl rand -base64 32

# 方法2: Node.jsを使用
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 方法3: Pythonを使用
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

生成例:
```
XyZ1234567890AbCdEfGhIjKlMnOpQrStUvWxYz==
```

### API Key管理のベストプラクティス

1. **環境ごとに異なるキーを使用**
   - 開発: `dev-*`
   - ステージング: `staging-*`
   - 本番: 強力なランダム文字列（32文字以上）

2. **定期的にローテーション**
   - 3ヶ月ごとに本番環境のAPI Keyを更新
   - 古いキーを無効化する前に、新しいキーをクライアントに配布

3. **最小権限の原則**
   - 必要最小限のキーのみ発行
   - 用途ごとに異なるキーを使用（例: モバイルアプリ用、Webアプリ用）

4. **シークレット漏洩時の対応**
   - すぐに `wrangler secret delete` でキーを削除
   - 新しいキーを生成して再設定
   - アクセスログを確認して不正利用をチェック

---

## 📝 環境変数一覧（まとめ）

| 変数名 | 必須 | 説明 | デフォルト | 設定場所 |
|--------|------|------|----------|---------|
| **VALID_API_KEYS** | ✅ はい | カンマ区切りのAPI Keyリスト | なし | Cloudflare Workers（wrangler secret）、ローカル（.dev.vars）、GitHub Secrets（テスト用） |
| **ALLOWED_ORIGINS** | ❌ いいえ | カンマ区切りの許可オリジンリスト | `*` | Cloudflare Workers（本番は必須）、ローカル（.dev.vars） |
| **CLOUDFLARE_API_TOKEN** | ✅ はい（CI/CD） | Cloudflare APIトークン | なし | GitHub Secrets |
| **CLOUDFLARE_ACCOUNT_ID** | ✅ はい（CI/CD） | CloudflareアカウントID | なし | GitHub Secrets |
| **TODO_KV** | ✅ はい | KV Namespace（Binding） | なし | wrangler.toml（IDを記載） |

---

## 🚀 セットアップチェックリスト

### ユーザーが手作業で行う初回セットアップ（一度だけ）

以下の作業は、ユーザーのローカル環境で一度だけ実行してください：

- [ ] Cloudflare Dashboard → My Profile → API Tokens で `CLOUDFLARE_API_TOKEN` を生成
- [ ] Cloudflare Dashboard → Workers & Pages で `CLOUDFLARE_ACCOUNT_ID` を取得
- [ ] GitHub Secretsに上記2つの値を設定
- [ ] 本番用の強力なAPI Key（32文字以上）を生成し、安全な場所に保管
- [ ] `wrangler kv:namespace create "TODO_KV"` でKV Namespaceを作成（開発環境用）
- [ ] `wrangler kv:namespace create "TODO_KV" --env production` でKV Namespaceを作成（本番環境用）
- [ ] `wrangler secret put VALID_API_KEYS` でステージングAPI Keyを設定
- [ ] `wrangler secret put VALID_API_KEYS --env production` で本番API Keyを設定
- [ ] `wrangler secret put ALLOWED_ORIGINS --env production` で本番CORSオリジンを設定

### Claude Code環境でのセットアップ

- [ ] `.dev.vars` ファイルを作成
- [ ] `.dev.vars` に `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` を設定
- [ ] `.dev.vars` に `VALID_API_KEYS` を設定
- [ ] `.dev.vars` を `.gitignore` に追加
- [ ] `wrangler.toml` にKV Namespace IDを記載（開発環境と本番環境）

### CI/CD環境（推奨：繰り返し作業を自動化）

- [ ] GitHub Secretsに `CLOUDFLARE_API_TOKEN` を設定
- [ ] GitHub Secretsに `CLOUDFLARE_ACCOUNT_ID` を設定
- [ ] GitHub Secretsに `VALID_API_KEYS_TEST` を設定
- [ ] `.github/workflows/deploy.yml` を作成
- [ ] mainブランチへのプッシュでデプロイが自動実行されることを確認


---

## ❓ トラブルシューティング

### エラー: "Authentication error"

**原因**: Cloudflare認証が設定されていない

**解決方法（Claude Code環境）**:
```bash
# .dev.vars ファイルに追加
echo 'CLOUDFLARE_API_TOKEN=your-api-token-here' >> .dev.vars
echo 'CLOUDFLARE_ACCOUNT_ID=your-account-id-here' >> .dev.vars
```

**解決方法（ユーザーのローカル環境）**:
```bash
npx wrangler login
```

### エラー: "Missing binding: TODO_KV"

**原因**: KV Namespaceが作成されていない、またはwrangler.tomlに記載されていない

**解決方法**:
```bash
# KV Namespace作成
npx wrangler kv:namespace create "TODO_KV"

# 出力されたIDをwrangler.tomlに追加
```

### エラー: "VALID_API_KEYS is not defined"

**原因**: 環境変数が設定されていない

**解決方法**:
```bash
# ローカル開発の場合
echo 'VALID_API_KEYS=test-key-1,test-key-2' > .dev.vars

# Cloudflare Workersの場合
npx wrangler secret put VALID_API_KEYS
```

### エラー: "401 Unauthorized" when testing API

**原因**: リクエストに `X-API-Key` ヘッダーが含まれていない、またはAPI Keyが無効

**解決方法**:
```bash
# 正しいリクエスト例
curl -H "X-API-Key: your-api-key-here" \
  https://your-worker.workers.dev/todos
```

---

## 📚 参考リンク

- [Cloudflare Workers - Environment Variables](https://developers.cloudflare.com/workers/configuration/environment-variables/)
- [Cloudflare Workers - Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Wrangler CLI - Commands](https://developers.cloudflare.com/workers/wrangler/commands/)
- [GitHub Actions - Encrypted secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
