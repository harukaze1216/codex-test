import { Octokit } from "@octokit/rest";
import Anthropic from "@anthropic-ai/sdk";
import type { Env } from "../config.js";
import type { ImpactReport } from "./impact-analyzer.js";
import type { IssueClassification } from "./orchestrator.js";

export interface PullRequestResult {
  prNumber: number;
  prUrl: string;
  branch: string;
}

interface IssueInput {
  number: number;
  title: string;
  body: string | null;
}

/**
 * 修正エージェント: 影響調査レポートをもとにコードを修正しPRを作成する
 */
export async function fixBug(
  config: Env,
  issue: IssueInput,
  impactReport: ImpactReport
): Promise<PullRequestResult> {
  const octokit = new Octokit({ auth: config.GITHUB_TOKEN });
  const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  const branch = `fix/issue-${issue.number}`;

  // mainブランチの最新コミットSHAを取得
  const { data: ref } = await octokit.git.getRef({
    owner: config.GITHUB_REPO_OWNER,
    repo: config.GITHUB_REPO_NAME,
    ref: "heads/main",
  });

  // 修正ブランチを作成
  await octokit.git.createRef({
    owner: config.GITHUB_REPO_OWNER,
    repo: config.GITHUB_REPO_NAME,
    ref: `refs/heads/${branch}`,
    sha: ref.object.sha,
  });

  // 影響ファイルの現在の内容を取得
  const fileContents = await Promise.all(
    impactReport.affectedFiles.map(async (filePath) => {
      try {
        const { data } = await octokit.repos.getContent({
          owner: config.GITHUB_REPO_OWNER,
          repo: config.GITHUB_REPO_NAME,
          path: filePath,
          ref: branch,
        });
        if ("content" in data) {
          return {
            path: filePath,
            content: Buffer.from(data.content, "base64").toString("utf-8"),
            sha: data.sha,
          };
        }
      } catch {
        // ファイルが見つからない場合はスキップ
      }
      return null;
    })
  );

  const existingFiles = fileContents.filter(Boolean) as Array<{
    path: string;
    content: string;
    sha: string;
  }>;

  // AIに修正コードを生成させる
  const fixResponse = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: `あなたはSaaSプロダクトのバグ修正エージェントです。
影響調査レポートと現在のコードをもとに、修正コードを生成してください。

各ファイルの修正を以下のJSON形式で回答してください:
{
  "fixes": [
    {"path": "ファイルパス", "content": "修正後の全内容"}
  ],
  "commitMessage": "コミットメッセージ",
  "prDescription": "PR説明文"
}

注意事項:
- 最小限の修正に留める
- 既存のコーディングスタイルに合わせる
- 副作用を起こさないよう注意する`,
    messages: [
      {
        role: "user",
        content: `Issue #${issue.number}: ${issue.title}
Body: ${issue.body ?? ""}

影響調査レポート:
${JSON.stringify(impactReport, null, 2)}

現在のコード:
${existingFiles.map((f) => `--- ${f.path} ---\n${f.content}`).join("\n\n")}`,
      },
    ],
  });

  const fixText =
    fixResponse.content[0].type === "text" ? fixResponse.content[0].text : "";
  const fixJsonMatch = fixText.match(/\{[\s\S]*\}/);

  let fixes: { fixes: Array<{ path: string; content: string }>; commitMessage: string; prDescription: string };
  try {
    if (!fixJsonMatch) throw new Error("No JSON");
    fixes = JSON.parse(fixJsonMatch[0]);
  } catch {
    fixes = {
      fixes: [],
      commitMessage: `fix: Issue #${issue.number} の修正`,
      prDescription: `Issue #${issue.number} の自動修正`,
    };
  }

  // 修正コードをコミット
  for (const fix of fixes.fixes) {
    const existing = existingFiles.find((f) => f.path === fix.path);
    await octokit.repos.createOrUpdateFileContents({
      owner: config.GITHUB_REPO_OWNER,
      repo: config.GITHUB_REPO_NAME,
      path: fix.path,
      message: fixes.commitMessage,
      content: Buffer.from(fix.content).toString("base64"),
      branch,
      ...(existing ? { sha: existing.sha } : {}),
    });
  }

  // PRを作成
  const { data: pr } = await octokit.pulls.create({
    owner: config.GITHUB_REPO_OWNER,
    repo: config.GITHUB_REPO_NAME,
    title: `fix: ${issue.title} (#${issue.number})`,
    body: `${fixes.prDescription}\n\nCloses #${issue.number}\n\n---\n_このPRはAIエージェントにより自動作成されました_`,
    head: branch,
    base: "main",
  });

  return {
    prNumber: pr.number,
    prUrl: pr.html_url,
    branch,
  };
}

/**
 * 機能要望をBACKLOG.mdに追記する
 */
export async function appendToBacklog(
  config: Env,
  issue: IssueInput,
  classification: IssueClassification
): Promise<void> {
  const octokit = new Octokit({ auth: config.GITHUB_TOKEN });
  const timestamp = new Date().toISOString().split("T")[0];

  // 現在のBACKLOG.mdを取得
  let currentContent = "";
  let sha: string | undefined;

  try {
    const { data } = await octokit.repos.getContent({
      owner: config.GITHUB_REPO_OWNER,
      repo: config.GITHUB_REPO_NAME,
      path: "BACKLOG.md",
    });
    if ("content" in data) {
      currentContent = Buffer.from(data.content, "base64").toString("utf-8");
      sha = data.sha;
    }
  } catch {
    currentContent = `# BACKLOG - 機能要望一覧\n\n| # | タイトル | ユーザー | 日時 | Issue |\n|---|---------|---------|------|-------|\n`;
  }

  // 新しい行を追加
  const newRow = `| - | ${issue.title} | - | ${timestamp} | #${issue.number} |`;
  const updatedContent = currentContent.trimEnd() + "\n" + newRow + "\n";

  await octokit.repos.createOrUpdateFileContents({
    owner: config.GITHUB_REPO_OWNER,
    repo: config.GITHUB_REPO_NAME,
    path: "BACKLOG.md",
    message: `docs: Issue #${issue.number} の要望をBACKLOGに追記`,
    content: Buffer.from(updatedContent).toString("base64"),
    ...(sha ? { sha } : {}),
  });

  // enhancementラベルを付与
  await octokit.issues.addLabels({
    owner: config.GITHUB_REPO_OWNER,
    repo: config.GITHUB_REPO_NAME,
    issue_number: issue.number,
    labels: ["enhancement"],
  });
}
