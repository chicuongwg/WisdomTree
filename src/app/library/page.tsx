import Link from "next/link";
import { requireUser, toPrincipal } from "@/lib/page";
import { LIBRARY_PAGE_SIZE, listLibrary, listMemberSpaces } from "@/modules/storage/service";
import { badgeClass, extractionLabel, extractionStateLabel, T, when } from "@/lib/vi";
import { Pager } from "@/app/components/pager";
import { Empty } from "@/app/components/empty";
import { LibraryDropzone } from "@/app/components/library-dropzone";

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
    <LibraryDropzone spaces={spaces} spaceId={spaceId || undefined}>
    <main className="page">
      <h1>{T.library}</h1>
      <form className="inline" method="get" role="search">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder={`${T.search}…`}
          aria-label={`${T.search} trong ${T.library.toLowerCase()}`}
        />
        <select name="spaceId" defaultValue={spaceId ?? ""} aria-label={`Lọc theo ${T.space.toLowerCase()}`}>
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
        q || spaceId ? (
          <Empty title={T.noMatches} action={<Link href="/library">{T.clearFilters}</Link>} />
        ) : (
          <Empty
            title={T.libraryEmptyTitle}
            // TODO(vi): move to src/lib/vi.ts
            hint={`${T.libraryEmptyHint} Hoặc kéo tệp thả vào đây.`}
            action={{ label: T.uploadCta, href: "/source/intake" }}
          />
        )
      ) : (
        <div className="record-scroll">
          <table className="list">
            <thead>
              <tr>
                <th scope="col">{T.title}</th>
                <th scope="col">{T.space}</th>
                <th scope="col">{T.storedAtLabel}</th>
                <th scope="col">Trạng thái xử lý</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.sourceId}>
                  <td>
                    <Link href={`/library/${item.sourceId}`}>{item.title}</Link>
                  </td>
                  <td>{item.spaceName}</td>
                  <td>{when(item.storedAt)}</td>
                  <td>
                    {/* `processed` is ~70% of rows: a chip on every one of them
                        is a wall of green that says nothing. Only the rows that
                        are NOT at rest wear a badge; the empty cell IS the
                        "đã xử lý" reading, and the header still names the
                        column. */}
                    {item.extractionStatus !== "processed" && (
                      <span className={badgeClass(extractionLabel, item.extractionStatus)}>
                        {extractionStateLabel(item.extractionStatus)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} pageSize={LIBRARY_PAGE_SIZE} count={items.length} params={{ q, spaceId }} />
    </main>
    </LibraryDropzone>
  );
}
