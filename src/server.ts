import express from "express";
import { loadConfig } from "./config.js";
import { createChatbotRouter } from "./chatbot/index.js";
import { createFeedbackRouter } from "./feedback/routes.js";
import { createWebhookRouter } from "./webhook/routes.js";

const config = loadConfig();
const app = express();

// Webhook用にraw bodyが必要なので、webhookルートだけ先にマウント
app.use("/api/webhook", createWebhookRouter(config));

// その他のルートはJSONパース
app.use(express.json());

app.use("/api/chat", createChatbotRouter(config));
app.use("/api/feedback", createFeedbackRouter(config));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
});

export { app };
