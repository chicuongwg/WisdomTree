import Link from "next/link";
import { requireUser, toPrincipal } from "@/lib/page";
import { LIBRARY_PAGE_SIZE, listFolders, listLibrary, listMemberSpaces } from "@/modules/storage/service";
import { badgeToneClass, T, when } from "@/lib/vi";
import { extractionDisplay } from "@/lib/source-status";
import { Pager } from "@/app/components/pager";
import { Empty } from "@/app/components/empty";
import { LibraryDropzone } from "@/app/components/library-dropzone";
import { FolderCreate } from "@/app/components/folder-create";

// The 24×24 stroke-1.7 hand of the rail icons (shell-rail.tsx), shrunk to sit
// in a table row — an SVG rather than 📁 so it takes the text colour and the
// two themes for free.
const folderIcon = (
  <svg
    viewBox="0 0 24 24"
    className="folder-icon"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 7a2 2 0 0 1 2-2h4.2l2 2.3H19a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </svg>
);

// Screen: Library (`/library`) — space-scoped, store-first: items appear at
// `stored`, before extraction finishes. Inside one space the view is
// Drive-shaped: folder rows above file rows, a breadcrumb, sortable headers.
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    spaceId?: string;
    page?: string;
    folderId?: string;
    sort?: string;
    dir?: string;
    archived?: string;
  }>;
}) {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const sp = await searchParams;
  const { q, spaceId } = sp;
  const page = Math.max(1, Number(sp.page) || 1);
  const isAdmin = user.role === "admin_op";
  const archived = isAdmin && sp.archived === "1";
  // Folder browsing only exists inside one space; a text search covers the
  // whole space (folders are a filing axis, not a search filter), and the
  // archive view is a flat recovery list.
  const browsing = Boolean(spaceId) && !q && !archived;
  const folderId = browsing ? sp.folderId || null : undefined;
  const sort = sp.sort === "title" ? ("title" as const) : ("storedAt" as const);
  const dir = sp.dir === "asc" ? ("asc" as const) : ("desc" as const);

  const [items, spaces, folders] = await Promise.all([
    listLibrary(actor, { q, spaceId: spaceId || undefined, page, folderId, sort, dir, archived }),
    listMemberSpaces(actor),
    browsing && spaceId ? listFolders(actor, spaceId) : Promise.resolve([]),
  ]);

  const href = (over: Record<string, string | undefined>) => {
    const merged = { q, spaceId, folderId: sp.folderId, sort: sp.sort, dir: sp.dir, archived: sp.archived, ...over };
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) u.set(k, v);
    const s = u.toString();
    return s ? `/library?${s}` : "/library";
  };

  // Breadcrumb: walk parentId up from the open folder. Flat rows, tiny trees.
  const byId = new Map(folders.map((f) => [f.id, f]));
  const crumbs: Array<{ id: string; name: string }> = [];
  for (let f = folderId ? byId.get(folderId) : undefined; f; f = f.parentId ? byId.get(f.parentId) : undefined) {
    crumbs.unshift(f);
  }
  const childFolders = browsing ? folders.filter((f) => (f.parentId ?? null) === folderId) : [];

  const sortHeader = (key: "title" | "storedAt", label: string) => {
    const active = sort === key;
    const nextDir = active ? (dir === "asc" ? "desc" : "asc") : key === "title" ? "asc" : "desc";
    return (
      <th scope="col" aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : undefined}>
        <Link href={href({ sort: key, dir: nextDir })}>
          {label}
          {active && (dir === "asc" ? " ↑" : " ↓")}
        </Link>
      </th>
    );
  };

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
      {archived ? (
        // TODO(vi): move to src/lib/vi.ts
        <p className="muted" role="status">
          Đang xem tư liệu đã thu hồi. <Link href={href({ archived: undefined })}>Quay lại thư viện</Link>
        </p>
      ) : (
        isAdmin && (
          <p className="muted">
            {/* TODO(vi): move to src/lib/vi.ts */}
            <Link href={href({ archived: "1", folderId: undefined })}>Xem tư liệu đã thu hồi</Link>
          </p>
        )
      )}
      {browsing && spaceId && (
        <nav className="breadcrumb" aria-label="Vị trí">{/* TODO(vi) */}
          <Link href={href({ folderId: undefined })}>
            {/* TODO(vi): move to src/lib/vi.ts */}
            Kho {spaces.find((s) => s.id === spaceId)?.name ?? ""}
          </Link>
          {crumbs.map((c) => (
            <span key={c.id}>
              {" / "}
              <Link href={href({ folderId: c.id })}>{c.name}</Link>
            </span>
          ))}
        </nav>
      )}
      {browsing && spaceId && <FolderCreate spaceId={spaceId} parentId={folderId ?? null} />}
      {items.length === 0 && childFolders.length === 0 ? (
        // An empty list is the most common first screen a new team sees, so it
        // carries the next action rather than only reporting emptiness.
        folderId ? (
          // TODO(vi): move to src/lib/vi.ts
          <Empty title="Thư mục trống." hint="Chuyển tư liệu vào đây từ trang chi tiết, hoặc tải tệp lên rồi chọn thư mục này." />
        ) : q || spaceId || archived ? (
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
                {sortHeader("title", T.title)}
                <th scope="col">{T.space}</th>
                {/* TODO(vi): move to src/lib/vi.ts */}
                <th scope="col">Người gửi</th>
                {sortHeader("storedAt", T.storedAtLabel)}
                <th scope="col">Trạng thái xử lý</th>
              </tr>
            </thead>
            <tbody>
              {childFolders.map((f) => (
                <tr key={f.id}>
                  <td>
                    <Link href={href({ folderId: f.id })}>
                      {folderIcon}
                      {f.name}
                    </Link>
                  </td>
                  <td colSpan={4} />
                </tr>
              ))}
              {items.map((item) => {
                const ed = extractionDisplay(item.extractionStatus, item.hasText, item.mimeType);
                return (
                  <tr key={item.sourceId}>
                    <td>
                      <Link href={`/library/${item.sourceId}`}>{item.title}</Link>
                    </td>
                    <td>{item.spaceName}</td>
                    <td>{item.submitterName}</td>
                    <td>{when(item.storedAt)}</td>
                    <td>
                      {/* Truly-processed rows (`done`) are ~70% of the list: a
                          chip on every one is a wall of green that says
                          nothing, so the empty cell IS the "đã xử lý" reading.
                          Everything else — including `processed` with no text,
                          which the stub used to hide behind that quiet cell —
                          wears its badge. */}
                      {ed.tone !== "done" && (
                        <span className={badgeToneClass(ed.tone)}>{ed.label}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Pager
        page={page}
        pageSize={LIBRARY_PAGE_SIZE}
        count={items.length}
        params={{ q, spaceId, folderId: sp.folderId, sort: sp.sort, dir: sp.dir, archived: sp.archived }}
      />
    </main>
    </LibraryDropzone>
  );
}
