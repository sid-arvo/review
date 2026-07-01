import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { env, hasChatAI, hasEmbeddingAI } from "@/lib/env";
import { CHAT_MODEL, CHAT_PROVIDER } from "@/lib/ai/openai-client";
import { CheckCircle2, XCircle } from "lucide-react";

const INTEGRATIONS = [
  {
    label: "Chat / AI enrichment",
    configured: hasChatAI(),
    note: hasChatAI()
      ? `Using ${CHAT_PROVIDER === "groq" ? "Groq (free)" : "OpenAI"} - model: ${CHAT_MODEL}`
      : "Falls back to deterministic heuristics when unset",
  },
  {
    label: "Embeddings (semantic search)",
    configured: hasEmbeddingAI(),
    note: hasEmbeddingAI()
      ? "Using OpenAI text-embedding-3-large - if this key has no quota, calls fail and fall back automatically"
      : "Falls back to a deterministic hash-based vector (works, but not semantically meaningful) - only OpenAI provides embeddings among configured providers",
  },
  { label: "Supabase Auth", configured: Boolean(env.NEXT_PUBLIC_SUPABASE_URL), note: "Falls back to a local demo admin session" },
  { label: "Google Play Developer API", configured: Boolean(env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON), note: "Falls back to synthetic reviews" },
  { label: "X (Twitter) API", configured: Boolean(env.TWITTER_BEARER_TOKEN), note: "Falls back to synthetic reviews" },
  { label: "YouTube Data API", configured: Boolean(env.YOUTUBE_API_KEY), note: "Falls back to synthetic reviews" },
  { label: "NewsAPI", configured: Boolean(env.NEWSAPI_API_KEY), note: "Falls back to synthetic articles" },
  { label: "Slack notifications", configured: Boolean(env.SLACK_WEBHOOK_URL), note: "Cron completion pings" },
  { label: "Email notifications (Resend)", configured: Boolean(env.RESEND_API_KEY), note: "Cron completion emails" },
  { label: "PostHog analytics", configured: Boolean(env.NEXT_PUBLIC_POSTHOG_KEY), note: "Product usage analytics" },
  { label: "Sentry error monitoring", configured: Boolean(env.NEXT_PUBLIC_SENTRY_DSN), note: "Client + server error tracking" },
];

export default async function SettingsPage() {
  return (
    <PageShell title="Settings" description="Integration status and platform configuration">
      <Card>
        <CardHeader>
          <CardTitle>Integration status</CardTitle>
          <CardDescription>
            Configured via environment variables. Every integration has a graceful fallback so the platform stays fully
            functional in demo mode.
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {INTEGRATIONS.map((i) => (
            <div key={i.label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-medium">{i.label}</p>
                <p className="text-xs text-muted-foreground">{i.note}</p>
              </div>
              {i.configured ? (
                <Badge className="gap-1">
                  <CheckCircle2 className="size-3" /> Configured
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1 text-muted-foreground">
                  <XCircle className="size-3" /> Not configured
                </Badge>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data pipeline</CardTitle>
          <CardDescription>Daily ETL schedule</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The daily ETL job runs at <span className="font-mono text-foreground">00:00 UTC</span> via Vercel Cron, hitting{" "}
          <span className="font-mono text-foreground">/api/cron/daily-etl</span>. See the Cron Monitoring page for run
          history.
        </CardContent>
      </Card>
    </PageShell>
  );
}
