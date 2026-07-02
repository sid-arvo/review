"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { SOURCE_LABELS, SURFACE_LABELS, COUNTRY_NAMES, ACTIVE_SOURCES } from "@/lib/domain/spotify";
import { RecommendationSurface, SentimentLabel } from "@prisma/client";
import { LOOKBACK_OPTIONS } from "@/lib/filters";
import type { FilterOptions } from "@/lib/queries/filter-options";

const SENTIMENT_LABELS: Record<SentimentLabel, string> = {
  VERY_NEGATIVE: "Very Negative",
  NEGATIVE: "Negative",
  NEUTRAL: "Neutral",
  POSITIVE: "Positive",
  VERY_POSITIVE: "Very Positive",
};

interface FilterBarProps {
  options: FilterOptions;
  showTopic?: boolean;
  showSurface?: boolean;
}

export function FilterBar({ options, showTopic = true, showSurface = true }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const setParam = useCallback(
    (key: string, value: string | undefined) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [pathname, router, searchParams]
  );

  const activeCount = ["source", "country", "language", "sentiment", "surface", "persona", "topic"].filter((k) =>
    searchParams.get(k)
  ).length;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={searchParams.get("days") ?? "90"} onValueChange={(v) => setParam("days", v)}>
        <SelectTrigger size="sm" className="w-[150px]">
          <SelectValue placeholder="Time range" />
        </SelectTrigger>
        <SelectContent>
          {LOOKBACK_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={String(opt.value)}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("source") ?? "all"} onValueChange={(v) => setParam("source", v)}>
        <SelectTrigger size="sm" className="w-[150px]">
          <SelectValue placeholder="Source" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sources</SelectItem>
          {ACTIVE_SOURCES.map((s) => (
            <SelectItem key={s} value={s}>
              {SOURCE_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("sentiment") ?? "all"} onValueChange={(v) => setParam("sentiment", v)}>
        <SelectTrigger size="sm" className="w-[150px]">
          <SelectValue placeholder="Sentiment" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All sentiment</SelectItem>
          {Object.values(SentimentLabel).map((s) => (
            <SelectItem key={s} value={s}>
              {SENTIMENT_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showSurface && (
        <Select value={searchParams.get("surface") ?? "all"} onValueChange={(v) => setParam("surface", v)}>
          <SelectTrigger size="sm" className="w-[170px]">
            <SelectValue placeholder="Surface" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All surfaces</SelectItem>
            {Object.values(RecommendationSurface).map((s) => (
              <SelectItem key={s} value={s}>
                {SURFACE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {showTopic && (
        <Select value={searchParams.get("topic") ?? "all"} onValueChange={(v) => setParam("topic", v)}>
          <SelectTrigger size="sm" className="w-[160px]">
            <SelectValue placeholder="Topic" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All topics</SelectItem>
            {options.topics.map((t) => (
              <SelectItem key={t.slug} value={t.slug}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select value={searchParams.get("persona") ?? "all"} onValueChange={(v) => setParam("persona", v)}>
        <SelectTrigger size="sm" className="w-[160px]">
          <SelectValue placeholder="Persona" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All personas</SelectItem>
          {options.personas.map((p) => (
            <SelectItem key={p.slug} value={p.slug}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get("country") ?? "all"} onValueChange={(v) => setParam("country", v)}>
        <SelectTrigger size="sm" className="w-[150px]">
          <SelectValue placeholder="Country" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All countries</SelectItem>
          {options.countries.map((c) => (
            <SelectItem key={c} value={c}>
              {COUNTRY_NAMES[c] ?? c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {activeCount > 0 && (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)} className="text-muted-foreground">
          <X className="size-3.5" />
          Clear ({activeCount})
        </Button>
      )}
    </div>
  );
}
