import { NextResponse } from "next/server";
import { SourceType } from "@prisma/client";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { runClustering } from "@/lib/ai/clustering";
import { computeTrendSnapshots } from "@/lib/ai/trends";
import { generateExecutiveSummary } from "@/lib/ai/executive-summary";

export const maxDuration = 120;

// Kept in code (not read from @/lib/domain/spotify's ACTIVE_SOURCES) so this
// one-off cleanup still targets the right rows even after ACTIVE_SOURCES
// changes in the future.
const RETIRED_SOURCES: SourceType[] = [
  SourceType.GOOGLE_PLAY,
  SourceType.TWITTER,
  SourceType.SPOTIFY_COMMUNITY,
  SourceType.REDDIT,
];

function isAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${env.CRON_SECRET}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get("secret") === env.CRON_SECRET;
}

/**
 * One-off cleanup for retired connectors (see ACTIVE_SOURCES in
 * @/lib/domain/spotify) - purges the synthetic reviews already generated for
 * them and refreshes trend snapshots + the executive summary so aggregate
 * numbers don't still reflect data that no longer exists. Safe to re-run:
 * deleting an already-empty source is a no-op.
 */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deleted = await prisma.review.deleteMany({ where: { source: { in: RETIRED_SOURCES } } });

  await runClustering();
  await computeTrendSnapshots(180);
  const summary = await generateExecutiveSummary(30);
  await generateExecutiveSummary(90);

  return NextResponse.json({ ok: true, deletedReviews: deleted.count, headline: summary.headline });
}
