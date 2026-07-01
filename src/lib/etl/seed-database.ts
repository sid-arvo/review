import { SourceType, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateSyntheticReviews } from "@/lib/ingestion/synthetic";
import { ensureTaxonomySeeded } from "@/lib/ai/persist";
import { runEnrichmentBatch } from "@/lib/ai/pipeline";
import { runClustering } from "@/lib/ai/clustering";
import { computeTrendSnapshots } from "@/lib/ai/trends";
import { generateExecutiveSummary } from "@/lib/ai/executive-summary";

const DEFAULT_SOURCE_VOLUMES: Record<SourceType, number> = {
  GOOGLE_PLAY: 220,
  APP_STORE: 180,
  REDDIT: 160,
  SPOTIFY_COMMUNITY: 120,
  TWITTER: 200,
  YOUTUBE: 110,
  GOOGLE_NEWS: 35,
  NEWSAPI: 25,
  MEDIUM: 30,
  BLOG: 25,
};

export interface SeedResult {
  generated: number;
  processed: number;
  failed: number;
  clusters: number;
}

/**
 * Populates taxonomy, a demo admin user, and a realistic synthetic review
 * dataset run through the full AI pipeline. Shared by the local CLI seed
 * script (prisma/seed.ts) and the protected /api/admin/seed route, since the
 * sandboxed dev environment this was built in cannot open raw Postgres
 * connections to a remote host - only the deployed app itself can seed a
 * hosted database.
 */
export async function seedDatabase(options?: { volumeScale?: number; enrichConcurrency?: number }): Promise<SeedResult> {
  const scale = options?.volumeScale ?? 1;
  const enrichConcurrency = options?.enrichConcurrency ?? 12;

  await ensureTaxonomySeeded();

  await prisma.user.upsert({
    where: { supabaseId: "demo-admin" },
    create: {
      supabaseId: "demo-admin",
      email: "demo.admin@spotify-voc.internal",
      name: "Demo Admin",
      role: UserRole.ADMIN,
    },
    update: {},
  });

  const allRawReviews = Object.entries(DEFAULT_SOURCE_VOLUMES).flatMap(([source, count]) =>
    generateSyntheticReviews({ source: source as SourceType, count: Math.round(count * scale), maxDaysAgo: 180, seed: 100 })
  );

  const createdIds: string[] = [];
  const BATCH = 50;
  for (let i = 0; i < allRawReviews.length; i += BATCH) {
    const batch = allRawReviews.slice(i, i + BATCH);
    const created = await prisma.$transaction(
      batch.map((r) =>
        prisma.review.create({
          data: {
            source: r.source,
            externalId: r.externalId,
            externalUrl: r.externalUrl,
            authorName: r.authorName,
            authorHandle: r.authorHandle,
            rating: r.rating,
            country: r.country,
            originalText: r.originalText,
            publishedAt: r.publishedAt,
            rawJson: r.rawJson as object | undefined,
          },
          select: { id: true },
        })
      )
    );
    createdIds.push(...created.map((c) => c.id));
  }

  const { processed, failed } = await runEnrichmentBatch(createdIds, enrichConcurrency);

  const clusterResult = await runClustering();
  await computeTrendSnapshots(180);
  await generateExecutiveSummary(30);
  await generateExecutiveSummary(90);

  await prisma.cronRun.create({
    data: {
      jobName: "seed-historical-backfill",
      status: "SUCCESS",
      finishedAt: new Date(),
      durationMs: 0,
      stats: { fetched: allRawReviews.length, processed, failed, deduped: allRawReviews.length - processed - failed },
    },
  });

  return { generated: allRawReviews.length, processed, failed, clusters: clusterResult.clusters };
}
