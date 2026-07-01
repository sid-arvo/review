import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { seedDatabase } from "../src/lib/etl/seed-database";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database (taxonomy, demo user, synthetic reviews, AI pipeline, clustering, trends, summaries)...");
  const result = await seedDatabase();
  console.log(
    `Seed complete: ${result.generated} reviews generated, ${result.processed} processed, ${result.failed} failed, ${result.clusters} clusters.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
