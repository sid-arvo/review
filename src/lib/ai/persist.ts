import { ProcessingStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { EnrichmentResult } from "@/lib/ai/types";
import { TOPIC_TAXONOMY, PERSONA_TAXONOMY } from "@/lib/domain/spotify";
import { slugify } from "@/lib/ai/slugify";

export async function persistEnrichment(reviewId: string, e: EnrichmentResult): Promise<void> {
  const persona = e.personaSlug
    ? await prisma.persona.findUnique({ where: { slug: e.personaSlug } })
    : null;

  await prisma.review.update({
    where: { id: reviewId },
    data: {
      cleanText: e.cleanText,
      translatedText: e.translatedText,
      sentimentLabel: e.sentimentLabel,
      sentimentScore: e.sentimentScore,
      emotions: e.emotions,
      jtbd: e.jtbd ?? undefined,
      intentSummary: e.intentSummary,
      qualityScore: e.qualityScore,
      isFeatureRequest: e.isFeatureRequest,
      isPainPoint: e.isPainPoint,
      isBugReport: e.isBugReport,
      isPraise: e.isPraise,
      personaId: persona?.id,
      processingStatus: ProcessingStatus.PROCESSED,
      processedAt: new Date(),
      processingError: null,
    },
  });

  await prisma.reviewRecommendationSurface.deleteMany({ where: { reviewId } });
  if (e.surfaces.length > 0) {
    await prisma.reviewRecommendationSurface.createMany({
      data: e.surfaces.map((surface) => ({ reviewId, surface })),
      skipDuplicates: true,
    });
  }

  await prisma.reviewTopic.deleteMany({ where: { reviewId } });
  for (const [idx, slug] of e.topicSlugs.entries()) {
    const topic = await prisma.topic.findUnique({ where: { slug } });
    if (!topic) continue;
    await prisma.reviewTopic.create({
      data: { reviewId, topicId: topic.id, isPrimary: idx === 0, confidence: idx === 0 ? 1 : 0.6 },
    });
  }

  if (e.isFeatureRequest && e.featureRequestTitle) {
    const slug = slugify(e.featureRequestTitle);
    const surface = e.surfaces[0];
    const featureRequest = await prisma.featureRequest.upsert({
      where: { slug },
      create: { title: e.featureRequestTitle, slug, surface },
      update: {},
    });
    await prisma.featureRequestMention.upsert({
      where: { reviewId_featureRequestId: { reviewId, featureRequestId: featureRequest.id } },
      create: { reviewId, featureRequestId: featureRequest.id },
      update: {},
    });
  }

  if (e.isPainPoint && e.painPointTitle) {
    const slug = slugify(e.painPointTitle);
    const surface = e.surfaces[0];
    const painPoint = await prisma.painPoint.upsert({
      where: { slug },
      create: { title: e.painPointTitle, slug, surface },
      update: {},
    });
    await prisma.painPointMention.upsert({
      where: { reviewId_painPointId: { reviewId, painPointId: painPoint.id } },
      create: { reviewId, painPointId: painPoint.id },
      update: {},
    });
  }
}

export async function ensureTaxonomySeeded(): Promise<void> {
  for (const topic of TOPIC_TAXONOMY) {
    await prisma.topic.upsert({
      where: { slug: topic.slug },
      create: topic,
      update: { name: topic.name, description: topic.description, color: topic.color },
    });
  }
  for (const persona of PERSONA_TAXONOMY) {
    await prisma.persona.upsert({
      where: { slug: persona.slug },
      create: { name: persona.name, slug: persona.slug, description: persona.description, color: persona.color },
      update: { name: persona.name, description: persona.description, color: persona.color },
    });
  }
}
