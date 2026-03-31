import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { SYSTEM_PROMPT } from "./prompt.js";
import type { Env } from "../config.js";

export function createChatbotRouter(config: Env): Router {
  const router = Router();
  const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

  /**
   * POST /api/chat
   * Body: { message: string, conversationHistory?: Array<{ role: string, content: string }> }
   * AIチャットbotによる一次対応
   */
  router.post("/", async (req, res) => {
    try {
      const { message, conversationHistory = [] } = req.body;

      if (!message || typeof message !== "string") {
        res.status(400).json({ error: "message is required" });
        return;
      }

      const messages: Anthropic.MessageParam[] = [
        ...conversationHistory.map(
          (msg: { role: string; content: string }) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          })
        ),
        { role: "user", content: message },
      ];

      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages,
      });

      const assistantMessage =
        response.content[0].type === "text" ? response.content[0].text : "";

      // フィードバックフォームへの誘導が含まれているかチェック
      const needsEscalation =
        assistantMessage.includes("フィードバックフォーム") ||
        assistantMessage.includes("ご報告");

      res.json({
        message: assistantMessage,
        needsEscalation,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      });
    } catch (error) {
      console.error("Chatbot error:", error);
      res.status(500).json({ error: "チャットの処理中にエラーが発生しました" });
    }
  });

  return router;
}
