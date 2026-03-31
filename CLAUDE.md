# CLAUDE.md - Claude Code Issue対応ルール

## プロジェクト概要

1人運営SaaSの顧客対応を全自動化するシステム。
GitHub Actionsからissue登録時にClaude Codeが起動し、自動で分類・修正・PR作成を行う。

## 技術スタック

- Runtime: Node.js (TypeScript, ESM)
- Framework: Express
- AI: Claude API (Sonnet 4.6) ※アプリ内チャットbot用
- CI/CD: GitHub Actions
- Email: SendGrid
- Issue処理: Claude Code（GitHub Actions経由）

## ビルド・テスト

```bash
npm install
npm run build    # tsc
npm test         # vitest run
npm run dev      # tsx watch（開発用）
```

## Issue対応ルール

GitHub Actionsからissue内容を渡されたら、以下のルールに従って処理すること。

### ステップ1: 分類

以下の条件でbug / feature / unknownを判定する。

**Bug判定条件（いずれかに該当）:**
- labelに `bug` が含まれる
- 本文に「動かない」「エラー」「できない」「表示されない」「落ちる」「クラッシュ」が含まれる

**Feature判定条件（いずれかに該当）:**
- labelに `enhancement` または `feature` が含まれる
- 本文に「ほしい」「追加」「要望」「改善」が含まれる

**判断不能:** 上記のいずれにも該当しない場合

### ステップ2: 対応

#### Bugの場合
1. コードベースを調査し、原因箇所を特定する
2. `fix/issue-{番号}` ブランチを作成する
3. 最小限の修正を行う（既存のコーディングスタイルに合わせる）
4. `npm test` でテストを実行し、通過を確認する
5. コミットしてプッシュする
6. PRを作成する（タイトル: `fix: {issueタイトル} (#{番号})`、本文に `Closes #{番号}` を含める）

#### Featureの場合
1. BACKLOG.mdのテーブルに以下を追記する:
   - タイトル（issueタイトル）
   - ユーザー（issueから取得できれば。不明なら `-`）
   - 日時（今日の日付 YYYY-MM-DD）
   - Issue番号（`#{番号}`）
2. mainブランチにコミット＆プッシュする
3. issueに `enhancement` ラベルを付与する

#### 判断不能の場合
1. issueに `needs-triage` ラベルを付与する
2. issueにコメントで「自動分類ができなかったため、手動トリアージをお願いします」と残す

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
src/
├── chatbot/          # ① AIチャットbot（Claude API）
│   ├── index.ts      #    チャットAPIエンドポイント
│   └── prompt.ts     #    システムプロンプト・FAQ
├── feedback/         # ② フィードバック → GitHub Issue登録
│   ├── routes.ts     #    フォーム送信APIエンドポイント
│   └── github-issue.ts #  Issue作成ロジック
├── webhook/          # ③ GitHub Webhook受信（ログ用）
│   ├── routes.ts     #    Webhook受信・署名検証
│   └── handler.ts    #    受信ログ記録
├── notifications/    # ⑤ 通知
│   ├── email.ts      #    SendGridメール送信
│   └── slack.ts      #    Slack Webhook通知
├── config.ts         #    環境変数バリデーション
└── server.ts         #    Expressサーバーエントリーポイント

.github/workflows/
├── auto-agent.yml    # issues.opened → Claude Code起動
└── notify-on-close.yml # issues.closed → ユーザーメール通知
```
