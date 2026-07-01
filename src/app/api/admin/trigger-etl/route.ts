import { NextResponse, after } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/rbac";
import { runDailyEtl } from "@/lib/etl/run-daily-etl";

export const maxDuration = 300;

/**
 * Lets an admin kick off the same pipeline the daily cron runs (fetch all
 * sources, enrich, cluster, recompute trends) on demand from the Admin page,
 * instead of waiting for the once-a-day Vercel Hobby cron schedule.
 *
 * The full pipeline can run for minutes. Returning immediately and doing the
 * work in `after()` means the run keeps going even if the browser tab is
 * closed or the request is otherwise interrupted - without it, the platform
 * is free to suspend the function the moment the client disconnects, which
 * leaves the run stuck at RUNNING with no way to tell it was abandoned
 * rather than still progressing. Track progress on the Cron page.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "view:admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  after(async () => {
    try {
      await runDailyEtl();
    } catch (err) {
      console.error("[admin/trigger-etl] failed:", err);
    }
  });

  return NextResponse.json({ ok: true, message: "ETL run started - track progress on the Cron page." });
}
