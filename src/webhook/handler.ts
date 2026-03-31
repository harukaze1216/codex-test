import { classifyIssue, type IssueClassification } from "../agents/orchestrator.js";
import { analyzeImpact } from "../agents/impact-analyzer.js";
import { fixBug } from "../agents/fixer.js";
import { runTests } from "../agents/tester.js";
import { sendSlackNotification } from "../notifications/slack.js";
import type { Env } from "../config.js";

interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  labels: Array<{ name: string }>;
  html_url: string;
}

/**
 * issues.openedイベントのメインハンドラー
 * オーケストレーターとして各エージェントを順次呼び出す
 */
export async function handleIssueOpened(
  config: Env,
  issue: GitHubIssue
): Promise<void> {
  console.log(`[Issue #${issue.number}] Processing: ${issue.title}`);

  // ① 分類
  const classification = await classifyIssue(config, issue);
  console.log(
    `[Issue #${issue.number}] Classified as: ${classification.type}`
  );

  switch (classification.type) {
    case "bug":
      await handleBug(config, issue, classification);
      break;
    case "feature":
      await handleFeature(config, issue, classification);
      break;
    case "unknown":
      await handleUnknown(config, issue);
      break;
  }
}

async function handleBug(
  config: Env,
  issue: GitHubIssue,
  classification: IssueClassification
): Promise<void> {
  // ② 影響調査
  const impactReport = await analyzeImpact(config, issue, classification);
  console.log(`[Issue #${issue.number}] Impact analysis complete`);

  // ③ 修正 → PR作成
  const prResult = await fixBug(config, issue, impactReport);
  console.log(`[Issue #${issue.number}] Fix PR created: #${prResult.prNumber}`);

  // ④ テスト実行
  const testResult = await runTests(config, prResult);

  if (testResult.passed) {
    console.log(`[Issue #${issue.number}] Tests passed, merging PR`);
    // テスト通過 → 自動マージはCI/CDで実施
  } else {
    console.log(`[Issue #${issue.number}] Tests failed, notifying`);
    await sendSlackNotification(config, {
      text: `⚠️ Issue #${issue.number} の自動修正PRでテストが失敗しました\nPR: ${prResult.prUrl}\n失敗内容: ${testResult.summary}`,
    });
  }
}

async function handleFeature(
  config: Env,
  issue: GitHubIssue,
  classification: IssueClassification
): Promise<void> {
  // BACKLOG.mdに追記する処理はfixerエージェント経由で実施
  const { appendToBacklog } = await import("../agents/fixer.js");
  await appendToBacklog(config, issue, classification);
  console.log(`[Issue #${issue.number}] Added to BACKLOG.md`);
}

async function handleUnknown(config: Env, issue: GitHubIssue): Promise<void> {
  // needs-triageラベルを付与してSlack通知
  const { Octokit } = await import("@octokit/rest");
  const octokit = new Octokit({ auth: config.GITHUB_TOKEN });

  await octokit.issues.addLabels({
    owner: config.GITHUB_REPO_OWNER,
    repo: config.GITHUB_REPO_NAME,
    issue_number: issue.number,
    labels: ["needs-triage"],
  });

  await sendSlackNotification(config, {
    text: `🔍 Issue #${issue.number} の自動分類ができませんでした。手動トリアージをお願いします。\n${issue.html_url}`,
  });
}
