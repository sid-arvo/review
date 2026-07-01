import "dotenv/config";
import { PrismaClient, SourceType, UserRole } from "@prisma/client";
import { generateSyntheticReviews } from "../src/lib/ingestion/synthetic";
import { ensureTaxonomySeeded } from "../src/lib/ai/persist";
import { runEnrichmentBatch } from "../src/lib/ai/pipeline";
import { runClustering } from "../src/lib/ai/clustering";
import { computeTrendSnapshots } from "../src/lib/ai/trends";
import { generateExecutiveSummary } from "../src/lib/ai/executive-summary";

const prisma = new PrismaClient();

const SOURCE_VOLUMES: Record<SourceType, number> = {
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

async function main() {
  console.log("Seeding taxonomy (topics & personas)...");
  await ensureTaxonomySeeded();

  console.log("Ensuring demo admin user exists...");
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

  console.log("Generating synthetic reviews across all 10 sources...");
  const allRawReviews = Object.entries(SOURCE_VOLUMES).flatMap(([source, count]) =>
    generateSyntheticReviews({ source: source as SourceType, count, maxDaysAgo: 180, seed: 100 })
  );
  console.log(`Generated ${allRawReviews.length} raw reviews.`);

  console.log("Inserting raw reviews...");
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
    process.stdout.write(`\r  inserted ${createdIds.length}/${allRawReviews.length}`);
  }
  console.log("\nInsert complete.");

  console.log("Running AI enrichment pipeline (heuristic mode if OPENAI_API_KEY unset)...");
  const { processed, failed } = await runEnrichmentBatch(createdIds, 12);
  console.log(`Enrichment complete: ${processed} processed, ${failed} failed.`);

  console.log("Running semantic clustering...");
  const clusterResult = await runClustering();
  console.log(`Clustering complete: ${clusterResult.clusters} clusters, ${clusterResult.assigned} reviews assigned.`);

  console.log("Computing trend snapshots...");
  await computeTrendSnapshots(180);
  console.log("Trend snapshots computed.");

  console.log("Generating executive summary...");
  await generateExecutiveSummary(30);
  await generateExecutiveSummary(90);
  console.log("Executive summaries generated.");

  console.log("Recording seed run in CronRun log...");
  await prisma.cronRun.create({
    data: {
      jobName: "seed-historical-backfill",
      status: "SUCCESS",
      finishedAt: new Date(),
      durationMs: 0,
      stats: { fetched: allRawReviews.length, processed, failed, deduped: allRawReviews.length - processed - failed },
    },
  });

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
