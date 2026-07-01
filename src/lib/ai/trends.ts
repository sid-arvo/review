import { prisma } from "@/lib/prisma";

/**
 * Recomputes daily TrendSnapshot rows for the last `days` days across
 * GLOBAL, per-topic, per-surface, per-persona, and per-country scopes using
 * set-based SQL (one statement per scope type) rather than looping in JS.
 */
export async function computeTrendSnapshots(days = 180): Promise<void> {
  const since = `now() - interval '${days} days'`;

  // GLOBAL
  await prisma.$executeRawUnsafe(`
    INSERT INTO "TrendSnapshot" (id, date, scope, volume, "avgSentiment", "positiveCount", "negativeCount", "neutralCount", "featureRequestCount", "painPointCount", "createdAt")
    SELECT gen_random_uuid(), date_trunc('day', "publishedAt"), 'GLOBAL', count(*), avg("sentimentScore"),
      count(*) filter (where "sentimentLabel" in ('POSITIVE','VERY_POSITIVE')),
      count(*) filter (where "sentimentLabel" in ('NEGATIVE','VERY_NEGATIVE')),
      count(*) filter (where "sentimentLabel" = 'NEUTRAL'),
      count(*) filter (where "isFeatureRequest"),
      count(*) filter (where "isPainPoint"),
      now()
    FROM "Review"
    WHERE "isDuplicate" = false AND "processingStatus" = 'PROCESSED' AND "publishedAt" >= ${since}
    GROUP BY 2
    ON CONFLICT (date, scope) DO UPDATE SET
      volume = EXCLUDED.volume, "avgSentiment" = EXCLUDED."avgSentiment",
      "positiveCount" = EXCLUDED."positiveCount", "negativeCount" = EXCLUDED."negativeCount",
      "neutralCount" = EXCLUDED."neutralCount", "featureRequestCount" = EXCLUDED."featureRequestCount",
      "painPointCount" = EXCLUDED."painPointCount"
  `);

  // TOPIC
  await prisma.$executeRawUnsafe(`
    INSERT INTO "TrendSnapshot" (id, date, scope, volume, "avgSentiment", "positiveCount", "negativeCount", "neutralCount", "featureRequestCount", "painPointCount", "createdAt")
    SELECT gen_random_uuid(), date_trunc('day', r."publishedAt"), 'TOPIC:' || t.slug, count(*), avg(r."sentimentScore"),
      count(*) filter (where r."sentimentLabel" in ('POSITIVE','VERY_POSITIVE')),
      count(*) filter (where r."sentimentLabel" in ('NEGATIVE','VERY_NEGATIVE')),
      count(*) filter (where r."sentimentLabel" = 'NEUTRAL'),
      count(*) filter (where r."isFeatureRequest"),
      count(*) filter (where r."isPainPoint"),
      now()
    FROM "Review" r
    JOIN "ReviewTopic" rt ON rt."reviewId" = r.id AND rt."isPrimary" = true
    JOIN "Topic" t ON t.id = rt."topicId"
    WHERE r."isDuplicate" = false AND r."processingStatus" = 'PROCESSED' AND r."publishedAt" >= ${since}
    GROUP BY 2, 3
    ON CONFLICT (date, scope) DO UPDATE SET
      volume = EXCLUDED.volume, "avgSentiment" = EXCLUDED."avgSentiment",
      "positiveCount" = EXCLUDED."positiveCount", "negativeCount" = EXCLUDED."negativeCount",
      "neutralCount" = EXCLUDED."neutralCount", "featureRequestCount" = EXCLUDED."featureRequestCount",
      "painPointCount" = EXCLUDED."painPointCount"
  `);

  // SURFACE
  await prisma.$executeRawUnsafe(`
    INSERT INTO "TrendSnapshot" (id, date, scope, volume, "avgSentiment", "positiveCount", "negativeCount", "neutralCount", "featureRequestCount", "painPointCount", "createdAt")
    SELECT gen_random_uuid(), date_trunc('day', r."publishedAt"), 'SURFACE:' || rrs.surface::text, count(*), avg(r."sentimentScore"),
      count(*) filter (where r."sentimentLabel" in ('POSITIVE','VERY_POSITIVE')),
      count(*) filter (where r."sentimentLabel" in ('NEGATIVE','VERY_NEGATIVE')),
      count(*) filter (where r."sentimentLabel" = 'NEUTRAL'),
      count(*) filter (where r."isFeatureRequest"),
      count(*) filter (where r."isPainPoint"),
      now()
    FROM "Review" r
    JOIN "ReviewRecommendationSurface" rrs ON rrs."reviewId" = r.id
    WHERE r."isDuplicate" = false AND r."processingStatus" = 'PROCESSED' AND r."publishedAt" >= ${since}
    GROUP BY 2, 3
    ON CONFLICT (date, scope) DO UPDATE SET
      volume = EXCLUDED.volume, "avgSentiment" = EXCLUDED."avgSentiment",
      "positiveCount" = EXCLUDED."positiveCount", "negativeCount" = EXCLUDED."negativeCount",
      "neutralCount" = EXCLUDED."neutralCount", "featureRequestCount" = EXCLUDED."featureRequestCount",
      "painPointCount" = EXCLUDED."painPointCount"
  `);

  // PERSONA
  await prisma.$executeRawUnsafe(`
    INSERT INTO "TrendSnapshot" (id, date, scope, volume, "avgSentiment", "positiveCount", "negativeCount", "neutralCount", "featureRequestCount", "painPointCount", "createdAt")
    SELECT gen_random_uuid(), date_trunc('day', r."publishedAt"), 'PERSONA:' || p.slug, count(*), avg(r."sentimentScore"),
      count(*) filter (where r."sentimentLabel" in ('POSITIVE','VERY_POSITIVE')),
      count(*) filter (where r."sentimentLabel" in ('NEGATIVE','VERY_NEGATIVE')),
      count(*) filter (where r."sentimentLabel" = 'NEUTRAL'),
      count(*) filter (where r."isFeatureRequest"),
      count(*) filter (where r."isPainPoint"),
      now()
    FROM "Review" r
    JOIN "Persona" p ON p.id = r."personaId"
    WHERE r."isDuplicate" = false AND r."processingStatus" = 'PROCESSED' AND r."publishedAt" >= ${since}
    GROUP BY 2, 3
    ON CONFLICT (date, scope) DO UPDATE SET
      volume = EXCLUDED.volume, "avgSentiment" = EXCLUDED."avgSentiment",
      "positiveCount" = EXCLUDED."positiveCount", "negativeCount" = EXCLUDED."negativeCount",
      "neutralCount" = EXCLUDED."neutralCount", "featureRequestCount" = EXCLUDED."featureRequestCount",
      "painPointCount" = EXCLUDED."painPointCount"
  `);

  // COUNTRY
  await prisma.$executeRawUnsafe(`
    INSERT INTO "TrendSnapshot" (id, date, scope, volume, "avgSentiment", "positiveCount", "negativeCount", "neutralCount", "featureRequestCount", "painPointCount", "createdAt")
    SELECT gen_random_uuid(), date_trunc('day', "publishedAt"), 'COUNTRY:' || country, count(*), avg("sentimentScore"),
      count(*) filter (where "sentimentLabel" in ('POSITIVE','VERY_POSITIVE')),
      count(*) filter (where "sentimentLabel" in ('NEGATIVE','VERY_NEGATIVE')),
      count(*) filter (where "sentimentLabel" = 'NEUTRAL'),
      count(*) filter (where "isFeatureRequest"),
      count(*) filter (where "isPainPoint"),
      now()
    FROM "Review"
    WHERE "isDuplicate" = false AND "processingStatus" = 'PROCESSED' AND "publishedAt" >= ${since} AND country IS NOT NULL
    GROUP BY 2, 3
    ON CONFLICT (date, scope) DO UPDATE SET
      volume = EXCLUDED.volume, "avgSentiment" = EXCLUDED."avgSentiment",
      "positiveCount" = EXCLUDED."positiveCount", "negativeCount" = EXCLUDED."negativeCount",
      "neutralCount" = EXCLUDED."neutralCount", "featureRequestCount" = EXCLUDED."featureRequestCount",
      "painPointCount" = EXCLUDED."painPointCount"
  `);
}
