import type { Env } from "../config.js";

interface SlackMessage {
  text: string;
}

/**
 * Slack Webhookで通知を送信する
 */
export async function sendSlackNotification(
  config: Env,
  message: SlackMessage
): Promise<void> {
  if (!config.SLACK_WEBHOOK_URL) {
    console.warn("Slack webhook URL not configured, logging instead:", message.text);
    return;
  }

  const response = await fetch(config.SLACK_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    console.error(`Slack notification failed: ${response.status} ${response.statusText}`);
  }
}
