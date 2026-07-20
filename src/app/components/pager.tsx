import Link from "next/link";
import { T } from "@/lib/vi";

/**
 * Previous/next links for a LIMIT/OFFSET list. Plain links, no client JS: the
 * pages are server components and the page number lives in the query string,
 * so back/forward and bookmarking work for free.
 *
 * ponytail: "there is a next page" is inferred from the current page being
 * full, rather than a second COUNT(*) query. The ceiling is that a list whose
 * length is an exact multiple of the page size offers one empty next page.
 * Swap in a count if that ever matters more than the query it costs.
 */
export function Pager({
  page,
  pageSize,
  count,
  params,
}: {
  page: number;
  pageSize: number;
  /** How many rows this page actually returned. */
  count: number;
  /** The other query params to preserve across page moves. */
  params: Record<string, string | undefined>;
}) {
  const hasPrev = page > 1;
  const hasNext = count === pageSize;
  if (!hasPrev && !hasNext) return null;

  const href = (target: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    if (target > 1) qs.set("page", String(target));
    const s = qs.toString();
    return s ? `?${s}` : "?";
  };

  return (
    <nav className="pager" aria-label={T.pagination}>
      {hasPrev ? (
        <Link href={href(page - 1)} rel="prev">
          ← {T.previousPage}
        </Link>
      ) : (
        <span className="muted">← {T.previousPage}</span>
      )}
      <span className="muted">
        {T.pageLabel} {page}
      </span>
      {hasNext ? (
        <Link href={href(page + 1)} rel="next">
          {T.nextPage} →
        </Link>
      ) : (
        <span className="muted">{T.nextPage} →</span>
      )}
    </nav>
  );
}
