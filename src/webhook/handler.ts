/**
 * Webhook handlerのログ・記録用
 *
 * 実際のissue処理はGitHub Actions経由でClaude Codeが実行するため、
 * このhandlerは受信ログとバリデーションのみ担当する。
 */

interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  labels: Array<{ name: string }>;
  html_url: string;
}

/**
 * issues.openedイベントの受信ログを記録する
 * 実際の処理はGitHub Actionsのauto-agent.ymlでClaude Codeが実行
 */
export async function handleIssueOpened(issue: GitHubIssue): Promise<void> {
  console.log(`[Webhook] Issue #${issue.number} received: ${issue.title}`);
  console.log(`[Webhook] Labels: ${issue.labels.map((l) => l.name).join(", ") || "none"}`);
  console.log(`[Webhook] Processing delegated to GitHub Actions → Claude Code`);
}
