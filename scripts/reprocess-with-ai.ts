import "dotenv/config";
import { PrismaClient, ProcessingStatus } from "@prisma/client";
import { runEnrichmentPipeline } from "../src/lib/ai/pipeline";
import { runClustering } from "../src/lib/ai/clustering";
import { computeTrendSnapshots } from "../src/lib/ai/trends";
import { generateExecutiveSummary } from "../src/lib/ai/executive-summary";

const prisma = new PrismaClient();

const BATCH_SIZE = Number(process.argv[2] ?? 120);
// Groq free tier is ~8000 tokens/min; each enrichment call runs ~1000-1500
// tokens with reasoning_effort=low, so pace one call roughly every 11s to
// stay safely under budget without silently falling back to heuristics.
const PACE_MS = 11_000;

async function main() {
  const targets = await prisma.review.findMany({
    where: { isDuplicate: false, processingStatus: ProcessingStatus.PROCESSED },
    orderBy: [{ sentimentLabel: "asc" }, { publishedAt: "desc" }],
    take: BATCH_SIZE,
    select: { id: true },
  });

  console.log(`Reprocessing ${targets.length} reviews with real AI (Groq), paced ~${PACE_MS / 1000}s apart...`);

  let done = 0;
  let failed = 0;
  const startedAt = Date.now();

  for (const { id } of targets) {
    const callStart = Date.now();
    try {
      await runEnrichmentPipeline(id);
      done++;
    } catch (err) {
      failed++;
      console.error(`  [${id}] failed:`, (err as Error).message);
    }
    const elapsedMin = ((Date.now() - startedAt) / 60000).toFixed(1);
    console.log(`  ${done + failed}/${targets.length} (ok=${done} failed=${failed}) - ${elapsedMin} min elapsed`);

    const callDuration = Date.now() - callStart;
    const remainingPace = PACE_MS - callDuration;
    if (remainingPace > 0) await new Promise((r) => setTimeout(r, remainingPace));
  }

  console.log("Recomputing clusters, trends, and executive summary with upgraded data...");
  await runClustering();
  await computeTrendSnapshots(180);
  await generateExecutiveSummary(30);
  await generateExecutiveSummary(90);

  console.log(`Done. ${done} reprocessed with real AI, ${failed} failed.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
