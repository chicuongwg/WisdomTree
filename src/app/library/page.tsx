import Link from "next/link";
import { requireUser, toPrincipal } from "@/lib/page";
import { listLibrary, listMemberSpaces } from "@/modules/storage/service";
import { extractionStateLabel, T } from "@/lib/vi";

// Screen: Library (`/library`) — space-scoped, store-first: items appear at
// `stored`, before extraction finishes.
export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; spaceId?: string }>;
}) {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const { q, spaceId } = await searchParams;
  const [items, spaces] = await Promise.all([
    listLibrary(actor, { q, spaceId: spaceId || undefined }),
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
        <p className="muted">{T.empty}</p>
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
                  <span className={`badge ${item.extractionStatus === "unprocessable" ? "warn" : item.extractionStatus === "pending" ? "muted" : ""}`}>
                    {extractionStateLabel(item.extractionStatus)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
