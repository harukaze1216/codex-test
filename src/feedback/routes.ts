import { Router } from "express";
import { z } from "zod";
import { createIssueFromFeedback } from "./github-issue.js";
import type { Env } from "../config.js";

const feedbackSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  pageUrl: z.string().url().optional(),
  userId: z.string().optional(),
  facilityName: z.string().optional(),
  userAgent: z.string().optional(),
});

export function createFeedbackRouter(config: Env): Router {
  const router = Router();

  /**
   * POST /api/feedback
   * フィードバックフォームの送信を受け付け、GitHub Issueを作成する
   */
  router.post("/", async (req, res) => {
    try {
      const parsed = feedbackSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          error: "入力内容に不備があります",
          details: parsed.error.flatten().fieldErrors,
        });
        return;
      }

      const issue = await createIssueFromFeedback(config, parsed.data);

      res.json({
        success: true,
        message: "フィードバックを受け付けました。ご報告ありがとうございます。",
        issueNumber: issue.number,
        issueUrl: issue.htmlUrl,
      });
    } catch (error) {
      console.error("Feedback submission error:", error);
      res
        .status(500)
        .json({ error: "フィードバックの送信中にエラーが発生しました" });
    }
  });

  return router;
}
