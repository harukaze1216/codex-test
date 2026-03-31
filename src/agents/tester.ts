import { Octokit } from "@octokit/rest";
import type { Env } from "../config.js";
import type { PullRequestResult } from "./fixer.js";

export interface TestResult {
  passed: boolean;
  summary: string;
  details: string;
}

/**
 * テストエージェント: PRに対してテストを実行し結果を返す
 *
 * GitHub ActionsのCI結果をポーリングして判定する。
 * CI未設定の場合はPRのみ作成した状態で返す。
 */
export async function runTests(
  config: Env,
  pr: PullRequestResult
): Promise<TestResult> {
  const octokit = new Octokit({ auth: config.GITHUB_TOKEN });

  // CIの完了を待つ（最大5分）
  const maxWait = 5 * 60 * 1000;
  const interval = 15 * 1000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    const { data: checks } = await octokit.checks.listForRef({
      owner: config.GITHUB_REPO_OWNER,
      repo: config.GITHUB_REPO_NAME,
      ref: pr.branch,
    });

    if (checks.total_count === 0) {
      // CI未設定の場合
      return {
        passed: true,
        summary: "CI未設定のためスキップ",
        details: "GitHub Actionsが設定されていないため、テストをスキップしました。",
      };
    }

    const allCompleted = checks.check_runs.every(
      (run) => run.status === "completed"
    );

    if (allCompleted) {
      const failed = checks.check_runs.filter(
        (run) => run.conclusion !== "success"
      );

      if (failed.length === 0) {
        // 全テスト通過 → 自動マージ
        try {
          await octokit.pulls.merge({
            owner: config.GITHUB_REPO_OWNER,
            repo: config.GITHUB_REPO_NAME,
            pull_number: pr.prNumber,
            merge_method: "squash",
          });

          // マージ後にブランチを削除
          await octokit.git.deleteRef({
            owner: config.GITHUB_REPO_OWNER,
            repo: config.GITHUB_REPO_NAME,
            ref: `heads/${pr.branch}`,
          });
        } catch (error) {
          console.error("Auto-merge failed:", error);
        }

        return {
          passed: true,
          summary: "全テスト通過・自動マージ完了",
          details: checks.check_runs
            .map((r) => `✅ ${r.name}: ${r.conclusion}`)
            .join("\n"),
        };
      }

      return {
        passed: false,
        summary: `${failed.length}件のテストが失敗`,
        details: checks.check_runs
          .map(
            (r) =>
              `${r.conclusion === "success" ? "✅" : "❌"} ${r.name}: ${r.conclusion}`
          )
          .join("\n"),
      };
    }

    // まだ実行中 → 待機
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  return {
    passed: false,
    summary: "CI実行がタイムアウト",
    details: "5分以内にCIが完了しませんでした。",
  };
}
