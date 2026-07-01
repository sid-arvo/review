import { env } from "@/lib/env";

interface EtlNotificationPayload {
  status: "SUCCESS" | "FAILED" | "PARTIAL";
  fetched: number;
  processed: number;
  failed: number;
  durationMs: number;
  headline?: string;
}

export async function notifySlack(payload: EtlNotificationPayload): Promise<void> {
  if (!env.SLACK_WEBHOOK_URL) return;
  try {
    await fetch(env.SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `*Spotify VoC daily ETL - ${payload.status}*\nFetched: ${payload.fetched} | Processed: ${payload.processed} | Failed: ${payload.failed} | Duration: ${(payload.durationMs / 1000).toFixed(1)}s${payload.headline ? `\n${payload.headline}` : ""}`,
      }),
    });
  } catch (err) {
    console.error("[notify] Slack webhook failed:", (err as Error).message);
  }
}

export async function notifyEmail(payload: EtlNotificationPayload): Promise<void> {
  if (!env.RESEND_API_KEY || !env.NOTIFICATION_EMAIL_TO) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "voc-intelligence@notifications.internal",
        to: env.NOTIFICATION_EMAIL_TO,
        subject: `Spotify VoC daily ETL - ${payload.status}`,
        html: `<p>Fetched: ${payload.fetched}<br/>Processed: ${payload.processed}<br/>Failed: ${payload.failed}<br/>Duration: ${(payload.durationMs / 1000).toFixed(1)}s</p><p>${payload.headline ?? ""}</p>`,
      }),
    });
  } catch (err) {
    console.error("[notify] Email notification failed:", (err as Error).message);
  }
}

export async function notifyAll(payload: EtlNotificationPayload): Promise<void> {
  await Promise.all([notifySlack(payload), notifyEmail(payload)]);
}
