import { describe, it, expect, vi } from "vitest";

// classifyIssueのキーワードベース判定をテスト（AI呼び出しなし）
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn(),
}));

import { classifyIssue } from "../src/agents/orchestrator.js";

const dummyConfig = {
  ANTHROPIC_API_KEY: "test",
  GITHUB_TOKEN: "test",
  GITHUB_REPO_OWNER: "test",
  GITHUB_REPO_NAME: "test",
  GITHUB_WEBHOOK_SECRET: "test",
  SENDGRID_API_KEY: "",
  NOTIFICATION_FROM_EMAIL: "",
  SLACK_WEBHOOK_URL: "",
  PORT: 3000,
};

describe("classifyIssue", () => {
  it("bugラベル付きissueをbugと判定する", async () => {
    const result = await classifyIssue(dummyConfig, {
      number: 1,
      title: "テスト",
      body: "テスト本文",
      labels: [{ name: "bug" }],
    });
    expect(result.type).toBe("bug");
    expect(result.confidence).toBe(1.0);
  });

  it("enhancementラベル付きissueをfeatureと判定する", async () => {
    const result = await classifyIssue(dummyConfig, {
      number: 2,
      title: "新機能",
      body: "新機能の要望",
      labels: [{ name: "enhancement" }],
    });
    expect(result.type).toBe("feature");
    expect(result.confidence).toBe(1.0);
  });

  it("バグキーワードを含むissueをbugと判定する", async () => {
    const result = await classifyIssue(dummyConfig, {
      number: 3,
      title: "ボタンが動かない",
      body: "クリックしても反応しない",
      labels: [],
    });
    expect(result.type).toBe("bug");
    expect(result.confidence).toBe(0.8);
  });

  it("要望キーワードを含むissueをfeatureと判定する", async () => {
    const result = await classifyIssue(dummyConfig, {
      number: 4,
      title: "ダークモードがほしい",
      body: "目が疲れるので追加してほしい",
      labels: [],
    });
    expect(result.type).toBe("feature");
    expect(result.confidence).toBe(0.8);
  });
});
