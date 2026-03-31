import { Octokit } from "@octokit/rest";
import type { Env } from "../config.js";

export interface FeedbackData {
  title: string;
  body: string;
  pageUrl?: string;
  userId?: string;
  facilityName?: string;
  userAgent?: string;
}

interface CreatedIssue {
  number: number;
  htmlUrl: string;
}

/**
 * フィードバック内容をGitHub Issueとして登録する
 */
export async function createIssueFromFeedback(
  config: Env,
  feedback: FeedbackData
): Promise<CreatedIssue> {
  const octokit = new Octokit({ auth: config.GITHUB_TOKEN });

  const issueBody = buildIssueBody(feedback);

  const { data } = await octokit.issues.create({
    owner: config.GITHUB_REPO_OWNER,
    repo: config.GITHUB_REPO_NAME,
    title: feedback.title,
    body: issueBody,
    labels: ["user-feedback"],
  });

  return {
    number: data.number,
    htmlUrl: data.html_url,
  };
}

function buildIssueBody(feedback: FeedbackData): string {
  const timestamp = new Date().toISOString();
  const sections = [
    `## ユーザー報告内容\n\n${feedback.body}`,
    `## メタ情報`,
    `- **報告日時**: ${timestamp}`,
  ];

  if (feedback.pageUrl) {
    sections.push(`- **操作ページ**: ${feedback.pageUrl}`);
  }
  if (feedback.userId) {
    sections.push(`- **ユーザーID**: ${feedback.userId}`);
  }
  if (feedback.facilityName) {
    sections.push(`- **施設名**: ${feedback.facilityName}`);
  }
  if (feedback.userAgent) {
    sections.push(`- **ブラウザ**: ${feedback.userAgent}`);
  }

  sections.push(
    "",
    "---",
    "_このissueはフィードバックフォームから自動作成されました_"
  );

  return sections.join("\n");
}
