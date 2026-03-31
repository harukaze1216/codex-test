# CLAUDE.md - Claude Code Issue自動巡回ルール

## プロジェクト概要

1人運営SaaSの顧客対応を全自動化するシステム。
このリポジトリが **中央ハブ** として、複数リポジトリのissueを巡回・自動処理する。

## アーキテクチャ

```
このリポジトリ（codex-test）= 中央ハブ
├── repos.json           ← 管理対象リポジトリ一覧＋分類ルール
├── BACKLOG.md           ← 全リポジトリの機能要望を一元管理
├── .github/workflows/
│   ├── poll-issues.yml  ← cron 5分ごとに Claude Code が巡回
│   └── notify-on-close.yml
└── src/                 ← Webアプリ（チャットbot・フィードバック等）

管理対象リポジトリ（何も置かなくてOK）
├── product-a/  ← issueが立つとClaude Codeが取りに来る
├── product-b/
└── ...
```

## 技術スタック

- Runtime: Node.js (TypeScript, ESM)
- Framework: Express
- AI: Claude API (Sonnet 4.6) ※アプリ内チャットbot用
- CI/CD: GitHub Actions
- Email: SendGrid
- Issue巡回処理: Claude Code（GitHub Actions cron経由）

## ビルド・テスト

```bash
npm install
npm run build    # tsc
npm test         # vitest run
npm run dev      # tsx watch（開発用）
```

## リポジトリ管理

### 新規リポジトリの追加方法
repos.json の `repos` 配列にエントリを追加するだけ:

```json
{
  "owner": "harukaze1216",
  "name": "new-product",
  "description": "新しいプロダクト",
  "rules": {
    "bugLabels": ["bug"],
    "featureLabels": ["enhancement", "feature"],
    "bugKeywords": ["動かない", "エラー", "できない", "表示されない", "落ちる", "クラッシュ"],
    "featureKeywords": ["ほしい", "追加", "要望", "改善"]
  }
}
```

## Issue巡回処理ルール

5分ごとにClaude Codeが起動し、repos.json の全リポジトリを巡回する。

### 未処理判定
`agent-processed` ラベルが付いていない open な issue が対象。

### 分類ルール

**Bug判定条件（いずれかに該当）:**
- labelに repos.json の `bugLabels` のいずれかが含まれる
- タイトルまたは本文に `bugKeywords` のいずれかが含まれる

**Feature判定条件（いずれかに該当）:**
- labelに repos.json の `featureLabels` のいずれかが含まれる
- タイトルまたは本文に `featureKeywords` のいずれかが含まれる

**判断不能:** 上記のいずれにも該当しない場合

### 対応フロー

#### Bugの場合
1. 対象リポジトリをcloneする
2. `fix/issue-{番号}` ブランチを作成する
3. コードベースを調査し、原因箇所を特定する
4. 最小限の修正を行う（既存のコーディングスタイルに合わせる）
5. テストがあれば実行し、通過を確認する
6. コミットしてプッシュする
7. PRを作成する（タイトル: `fix: {issueタイトル} (#{番号})`、本文に `Closes #{番号}` を含める）
8. issueに `agent-processed` ラベルを付与する

#### Featureの場合
1. **このリポジトリ（codex-test）** の BACKLOG.md にテーブル行を追記する
   - タイトル、ユーザー、日時、リポジトリ名＋Issue番号
2. mainブランチにコミット＆プッシュする
3. 対象issueに `enhancement` ラベルを付与する
4. issueに `agent-processed` ラベルを付与する

#### 判断不能の場合
1. issueに `needs-triage` ラベルを付与する
2. issueにコメントで「自動分類ができなかったため、手動トリアージをお願いします」と残す
3. issueに `agent-processed` ラベルを付与する

### 二重処理防止
- 処理済みissueには必ず `agent-processed` ラベルを付与する
- 1回の実行で最大10件まで処理する

## コーディング規約

- TypeScript strict mode
- エラーハンドリングは必ず行う
- 環境変数は `.env` で管理し、絶対にコミットしない
- テストは `tests/` ディレクトリに配置
- ESM (`"type": "module"`) を使用。importには `.js` 拡張子を付ける

## ブランチ戦略

- `main` : 本番ブランチ
- `fix/issue-{番号}` : bug修正ブランチ（issue番号ごとに分離してコンフリクト回避）

## ディレクトリ構成

```
repos.json                ← 管理対象リポジトリ一覧
BACKLOG.md                ← 全リポジトリの機能要望一覧

src/
├── chatbot/              # ① AIチャットbot（Claude API）
│   ├── index.ts
│   └── prompt.ts
├── feedback/             # ② フィードバック → GitHub Issue登録
│   ├── routes.ts
│   └── github-issue.ts
├── webhook/              # ③ GitHub Webhook受信（ログ用）
│   ├── routes.ts
│   └── handler.ts
├── notifications/        # ⑤ 通知
│   ├── email.ts
│   └── slack.ts
├── config.ts
└── server.ts

.github/workflows/
├── poll-issues.yml       # cron → Claude Code巡回
├── auto-agent.yml        # issues.opened → このリポジトリ用
└── notify-on-close.yml   # issues.closed → ユーザーメール通知
```
