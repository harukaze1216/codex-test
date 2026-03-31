# SaaS 顧客対応 全自動化システム

1人運営SaaSの顧客対応ボトルネックをゼロにするための自動化システム。

## アーキテクチャ

```
ユーザーが困る
  ↓
① アプリ内AIチャットが一次対応（Claude API）
  ↓ 解決しない場合
② フィードバックフォームからissue登録（GitHub API）
  ↓
③ GitHub Webhookでissue登録を即検知
  ↓
④ AIエージェントチームが自動分類・対応
  ├─ bug → 自動修正 → PR作成 → テスト通過でマージ
  └─ feature → BACKLOG.mdに蓄積
  ↓
⑤ issue closeでユーザーへ自動通知（メール）
```

## セットアップ

```bash
npm install
cp .env.example .env
# .env に各種APIキーを設定
npm run build
npm start
```

## 開発

```bash
npm run dev    # 開発サーバー起動
npm test       # テスト実行
```

## 環境変数

| 変数名 | 説明 |
|-------|------|
| `ANTHROPIC_API_KEY` | Claude API キー |
| `GITHUB_TOKEN` | GitHub Personal Access Token |
| `GITHUB_REPO_OWNER` | リポジトリオーナー |
| `GITHUB_REPO_NAME` | リポジトリ名 |
| `GITHUB_WEBHOOK_SECRET` | Webhook署名検証用シークレット |
| `SENDGRID_API_KEY` | SendGrid APIキー |
| `NOTIFICATION_FROM_EMAIL` | 通知メール送信元 |
| `SLACK_WEBHOOK_URL` | Slack通知用Webhook URL |
| `PORT` | サーバーポート（デフォルト: 3000） |

## コンポーネント

- **① チャットbot** (`src/chatbot/`) - Claude APIによる一次対応
- **② フィードバック** (`src/feedback/`) - フォーム → GitHub Issue登録
- **③ Webhook** (`src/webhook/`) - Issue作成イベント駆動
- **④ エージェント** (`src/agents/`) - 自動分類・修正・テスト
- **⑤ 通知** (`src/notifications/`) - メール自動送信 + GitHub Actions
