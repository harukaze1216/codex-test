import sgMail from "@sendgrid/mail";
import type { Env } from "../config.js";

interface NotificationParams {
  to: string;
  issueNumber: number;
  issueTitle: string;
  version?: string;
}

/**
 * Issue解決完了メールをユーザーに送信する
 */
export async function sendResolutionEmail(
  config: Env,
  params: NotificationParams
): Promise<void> {
  if (!config.SENDGRID_API_KEY) {
    console.warn("SendGrid API key not configured, skipping email");
    return;
  }

  sgMail.setApiKey(config.SENDGRID_API_KEY);

  const versionText = params.version
    ? `${params.version}から反映されます。`
    : "次回リリースから反映されます。";

  await sgMail.send({
    to: params.to,
    from: config.NOTIFICATION_FROM_EMAIL,
    subject: `【ご報告いただいた件の対応完了】${params.issueTitle}`,
    text: `いつもご利用いただきありがとうございます。

ご報告いただいた件（#${params.issueNumber}: ${params.issueTitle}）について、
修正が完了いたしました。

${versionText}

引き続きお気づきの点がございましたら、アプリ内のフィードバックフォームよりお知らせください。

今後ともよろしくお願いいたします。`,
    html: `
<p>いつもご利用いただきありがとうございます。</p>
<p>ご報告いただいた件（<strong>#${params.issueNumber}: ${params.issueTitle}</strong>）について、修正が完了いたしました。</p>
<p>${versionText}</p>
<p>引き続きお気づきの点がございましたら、アプリ内のフィードバックフォームよりお知らせください。</p>
<p>今後ともよろしくお願いいたします。</p>`,
  });
}
