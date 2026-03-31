import { describe, it, expect, vi } from "vitest";
import { handleIssueOpened } from "../src/webhook/handler.js";

describe("handleIssueOpened", () => {
  it("issueの受信ログを出力する", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    await handleIssueOpened({
      number: 1,
      title: "テストissue",
      body: "テスト本文",
      labels: [{ name: "bug" }],
      html_url: "https://github.com/test/test/issues/1",
    });

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("Issue #1 received")
    );
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("Claude Code")
    );

    spy.mockRestore();
  });

  it("ラベルなしでも処理できる", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});

    await handleIssueOpened({
      number: 2,
      title: "ラベルなし",
      body: null,
      labels: [],
      html_url: "https://github.com/test/test/issues/2",
    });

    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("Labels: none")
    );

    spy.mockRestore();
  });
});
