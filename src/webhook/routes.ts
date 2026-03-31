import { Router } from "express";
import crypto from "node:crypto";
import express from "express";
import { handleIssueOpened } from "./handler.js";
import type { Env } from "../config.js";

export function createWebhookRouter(config: Env): Router {
  const router = Router();

  // Webhook署名検証のためraw bodyが必要
  router.use(express.raw({ type: "application/json" }));

  /**
   * POST /api/webhook
   * GitHub Webhookイベントを受信して処理する
   */
  router.post("/", async (req, res) => {
    try {
      // 署名検証
      const signature = req.headers["x-hub-signature-256"] as string;
      if (!verifySignature(config.GITHUB_WEBHOOK_SECRET, req.body, signature)) {
        res.status(401).json({ error: "Invalid signature" });
        return;
      }

      const event = req.headers["x-github-event"] as string;
      const payload = JSON.parse(req.body.toString());

      // issues.opened イベントのみ処理
      if (event === "issues" && payload.action === "opened") {
        // 非同期で処理を開始（Webhookレスポンスは即返す）
        handleIssueOpened(payload.issue).catch((error) => {
          console.error("Issue handling error:", error);
        });

        res.status(200).json({ message: "Processing started" });
        return;
      }

      res.status(200).json({ message: "Event ignored" });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: "Webhook processing failed" });
    }
  });

  return router;
}

/**
 * GitHub Webhook署名を検証する
 */
function verifySignature(
  secret: string,
  payload: Buffer,
  signature: string
): boolean {
  if (!signature) return false;
  const expected =
    "sha256=" +
    crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
