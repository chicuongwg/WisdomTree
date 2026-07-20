import Link from "next/link";
import { requireUser, toPrincipal } from "@/lib/page";
import { LIBRARY_PAGE_SIZE, listLibrary, listMemberSpaces } from "@/modules/storage/service";
import { badgeClass, extractionLabel, extractionStateLabel, T } from "@/lib/vi";
import { Pager } from "@/app/components/pager";

// Screen: Library (`/library`) — space-scoped, store-first: items appear at
// `stored`, before extraction finishes.
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; spaceId?: string; page?: string }>;
}) {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const { q, spaceId, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const [items, spaces] = await Promise.all([
    listLibrary(actor, { q, spaceId: spaceId || undefined, page }),
    listMemberSpaces(actor),
  ]);

  return (
    <main className="page">
      <h1>{T.library}</h1>
      <form className="inline" method="get">
        <input type="search" name="q" defaultValue={q ?? ""} placeholder={`${T.search}…`} />
        <select name="spaceId" defaultValue={spaceId ?? ""}>
          <option value="">{T.space}: tất cả</option>
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button type="submit">{T.search}</button>
      </form>
      {items.length === 0 ? (
        // An empty list is the most common first screen a new team sees, so it
        // carries the next action rather than only reporting emptiness.
        <div className="panel empty-state">
          {q || spaceId ? (
            <>
              <p>{T.noMatches}</p>
              <Link href="/library">{T.clearFilters}</Link>
            </>
          ) : (
            <>
              <p>{T.libraryEmptyTitle}</p>
              <p className="muted">{T.libraryEmptyHint}</p>
              <Link className="button" href="/source/intake">
                {T.uploadCta}
              </Link>
            </>
          )}
        </div>
      ) : (
        <table className="list">
          <thead>
            <tr>
              <th>{T.title}</th>
              <th>{T.space}</th>
              <th>{T.storedAtLabel}</th>
              <th>Trạng thái xử lý</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.sourceId}>
                <td>
                  <Link href={`/library/${item.sourceId}`}>{item.title}</Link>
                </td>
                <td>{item.spaceName}</td>
                <td>{item.storedAt?.toLocaleString("vi-VN")}</td>
                <td>
                  <span className={badgeClass(extractionLabel, item.extractionStatus)}>
                    {extractionStateLabel(item.extractionStatus)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Pager page={page} pageSize={LIBRARY_PAGE_SIZE} count={items.length} params={{ q, spaceId }} />
    </main>
  );
}
