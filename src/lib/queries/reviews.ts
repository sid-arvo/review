import { prisma } from "@/lib/prisma";
import { filtersToWhere, type DashboardFilters } from "@/lib/filters";

export async function getReviewsPage(filters: DashboardFilters, page: number, pageSize = 20) {
  const where = filtersToWhere(filters);
  const [items, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        persona: true,
        topics: { include: { topic: true }, where: { isPrimary: true }, take: 1 },
        recommendationSurfaces: true,
      },
    }),
    prisma.review.count({ where }),
  ]);

  return { items, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}
