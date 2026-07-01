import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { SOURCE_LABELS, SURFACE_LABELS } from "@/lib/domain/spotify";
import { SENTIMENT_LABELS } from "@/lib/domain/sentiment";
import type { Prisma } from "@prisma/client";

type ReviewWithRelations = Prisma.ReviewGetPayload<{
  include: {
    persona: true;
    topics: { include: { topic: true } };
    recommendationSurfaces: true;
  };
}>;

function sentimentVariant(label: string | null) {
  if (label === "NEGATIVE" || label === "VERY_NEGATIVE") return "destructive" as const;
  if (label === "POSITIVE" || label === "VERY_POSITIVE") return "default" as const;
  return "secondary" as const;
}

export function ReviewCard({ review }: { review: ReviewWithRelations }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">{SOURCE_LABELS[review.source] ?? review.source}</Badge>
        {review.country && <span>{review.country}</span>}
        {review.rating != null && (
          <span className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`size-3 ${i < review.rating! ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
            ))}
          </span>
        )}
        <span>{new Date(review.publishedAt).toLocaleDateString()}</span>
        {review.persona && (
          <Badge variant="secondary" style={{ backgroundColor: review.persona.color ?? undefined }}>
            {review.persona.name}
          </Badge>
        )}
        {review.sentimentLabel && (
          <Badge variant={sentimentVariant(review.sentimentLabel)} className="ml-auto">
            {SENTIMENT_LABELS[review.sentimentLabel]}
          </Badge>
        )}
      </div>
      <p className="text-sm">{review.originalText}</p>
      {review.intentSummary && <p className="mt-1 text-xs italic text-muted-foreground">{review.intentSummary}</p>}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {review.topics.map((t) => (
          <Badge key={t.id} variant="outline" className="text-[10px]">
            {t.topic.name}
          </Badge>
        ))}
        {review.recommendationSurfaces.map((s) => (
          <Badge key={s.id} variant="secondary" className="text-[10px]">
            {SURFACE_LABELS[s.surface]}
          </Badge>
        ))}
        {review.isFeatureRequest && (
          <Badge className="bg-blue-500/15 text-blue-400 text-[10px]" variant="outline">
            Feature request
          </Badge>
        )}
        {review.isPainPoint && (
          <Badge className="bg-orange-500/15 text-orange-400 text-[10px]" variant="outline">
            Pain point
          </Badge>
        )}
      </div>
    </div>
  );
}
