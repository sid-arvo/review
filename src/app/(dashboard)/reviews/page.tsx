import { PageShell } from "@/components/layout/page-shell";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { SearchInput } from "@/components/dashboard/search-input";
import { Pagination } from "@/components/dashboard/pagination";
import { ReviewCard } from "@/components/dashboard/review-card";
import { getFilterOptions } from "@/lib/queries/filter-options";
import { parseFilters, type SearchParams } from "@/lib/filters";
import { getReviewsPage } from "@/lib/queries/reviews";

export default async function ReviewsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const page = Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1;

  const [options, { items, total, totalPages }] = await Promise.all([
    getFilterOptions(),
    getReviewsPage(filters, page),
  ]);

  return (
    <PageShell
      title="Review Explorer"
      description={`${total.toLocaleString()} reviews match the current filters`}
      actions={
        <div className="flex items-center gap-2">
          <SearchInput />
          <FilterBar options={options} />
        </div>
      }
    >
      <div className="space-y-3">
        {items.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
        {items.length === 0 && (
          <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
            No reviews match the current filters.
          </div>
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} />
    </PageShell>
  );
}
