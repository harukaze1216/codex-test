import { describe, it, expect } from "vitest";
import { z } from "zod";

// フィードバックのバリデーションスキーマのテスト
const feedbackSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  pageUrl: z.string().url().optional(),
  userId: z.string().optional(),
  facilityName: z.string().optional(),
  userAgent: z.string().optional(),
});

describe("feedbackSchema", () => {
  it("有効なフィードバックを受け付ける", () => {
    const result = feedbackSchema.safeParse({
      title: "ボタンが反応しない",
      body: "保存ボタンをクリックしても何も起きません",
      pageUrl: "https://app.example.com/settings",
      userId: "user-123",
    });
    expect(result.success).toBe(true);
  });

  it("タイトルなしを拒否する", () => {
    const result = feedbackSchema.safeParse({
      title: "",
      body: "テスト",
    });
    expect(result.success).toBe(false);
  });

  it("本文なしを拒否する", () => {
    const result = feedbackSchema.safeParse({
      title: "テスト",
      body: "",
    });
    expect(result.success).toBe(false);
  });

  it("不正なURLを拒否する", () => {
    const result = feedbackSchema.safeParse({
      title: "テスト",
      body: "テスト本文",
      pageUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("オプションフィールドなしでも受け付ける", () => {
    const result = feedbackSchema.safeParse({
      title: "テスト",
      body: "テスト本文",
    });
    expect(result.success).toBe(true);
  });
});
