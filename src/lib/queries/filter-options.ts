import { prisma } from "@/lib/prisma";

export interface FilterOptions {
  topics: { slug: string; name: string }[];
  personas: { slug: string; name: string }[];
  countries: string[];
  languages: string[];
}

export async function getFilterOptions(): Promise<FilterOptions> {
  const [topics, personas, countries, languages] = await Promise.all([
    prisma.topic.findMany({ select: { slug: true, name: true }, orderBy: { name: "asc" } }),
    prisma.persona.findMany({ select: { slug: true, name: true }, orderBy: { name: "asc" } }),
    prisma.review.findMany({
      where: { country: { not: null } },
      select: { country: true },
      distinct: ["country"],
    }),
    prisma.review.findMany({
      where: { language: { not: null } },
      select: { language: true },
      distinct: ["language"],
    }),
  ]);

  return {
    topics,
    personas,
    countries: countries.map((c) => c.country!).filter(Boolean).sort(),
    languages: languages.map((l) => l.language!).filter(Boolean).sort(),
  };
}
