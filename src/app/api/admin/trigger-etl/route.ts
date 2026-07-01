import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { can } from "@/lib/auth/rbac";
import { runDailyEtl } from "@/lib/etl/run-daily-etl";

export const maxDuration = 300;

/**
 * Lets an admin kick off the same pipeline the daily cron runs (fetch all
 * sources, enrich, cluster, recompute trends) on demand from the Admin page,
 * instead of waiting for the once-a-day Vercel Hobby cron schedule.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user || !can(user.role, "view:admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const summary = await runDailyEtl();
    return NextResponse.json({ ok: true, summary });
  } catch (err) {
    console.error("[admin/trigger-etl] failed:", err);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
