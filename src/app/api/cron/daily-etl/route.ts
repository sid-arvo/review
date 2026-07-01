import { NextResponse, after } from "next/server";
import { env } from "@/lib/env";
import { runDailyEtl } from "@/lib/etl/run-daily-etl";

export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${env.CRON_SECRET}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get("secret") === env.CRON_SECRET;
}

// Runs in after() so the pipeline isn't tied to the invoking client staying
// connected for the full duration - see the equivalent note in
// /api/admin/trigger-etl, which is where this was actually diagnosed.
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  after(async () => {
    try {
      await runDailyEtl();
    } catch (err) {
      console.error("[cron/daily-etl] fatal error:", err);
    }
  });

  return NextResponse.json({ ok: true, message: "ETL run started" });
}

export async function POST(request: Request) {
  return GET(request);
}
