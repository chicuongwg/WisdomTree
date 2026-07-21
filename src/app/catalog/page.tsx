import Link from "next/link";
import { requireUser, toPrincipal } from "@/lib/page";
import { CATALOG_PAGE_SIZE, listCatalog } from "@/modules/catalog/service";
import { badgeClass, itemLabel, itemStatusLabel, T } from "@/lib/vi";
import { Pager } from "@/app/components/pager";
import { Empty } from "@/app/components/empty";

/**
 * The one cell that answers "mượn được hôm nay không?".
 *
 * A single status badge was honest while a title WAS one book. With three
 * copies it is not: "Đang mượn" on a title with two left is a lie, and a
 * silent cell on a title with none left is a worse one. So the cell now reads
 * as a fraction — "Còn 2/3 cuốn" — and the number, not the colour, carries it.
 *
 * Three shapes, in the order a librarian asks the questions:
 *   lost / repair  → the badge alone. The whole title is off the shelf and the
 *                    count is beside the point.
 *   nothing free   → the badge, in words ("Đã mượn hết"), with the count after
 *                    it so the librarian sees how many are due back.
 *   something free → the count in plain text. No chip: `available` is ~95% of
 *                    the shelf, and a wall of green chips is the thing that
 *                    trains the eye to skip this column.
 *
 * A one-copy title with its copy on the shelf still shows nothing at all —
 * that reading is unchanged, and it is what keeps the column quiet enough to
 * be worth reading.
 */
function availability(item: { status: string; copies: number; availableCopies: number }) {
  if (item.status === "lost" || item.status === "repair") {
    return <span className={badgeClass(itemStatusLabel, item.status)}>{itemLabel(item.status)}</span>;
  }
  if (item.availableCopies === 0) {
    return (
      <>
        <span className={badgeClass(itemStatusLabel, "borrowed")}>{T.copiesAllOut}</span>{" "}
        <span className="copy-count">{T.copiesOf(0, item.copies)}</span>
      </>
    );
  }
  if (item.copies === 1) return null;
  return <span className="copy-count">{T.copiesLeft(item.availableCopies, item.copies)}</span>;
}

// Screen: Catalog (`/catalog`) — physical library, library-space members.
export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const user = await requireUser();
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const items = await listCatalog(toPrincipal(user), { q, page });

  return (
    <main className="page">
      <h1>{T.catalog}</h1>
      <form className="inline" method="get" role="search">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Tên sách, tác giả, mã số…"
          aria-label={`${T.search} trong ${T.catalog.toLowerCase()}`}
        />
        <button type="submit">{T.search}</button>
      </form>
      {items.length === 0 ? (
        q ? (
          <Empty title={T.noMatches} action={<Link href="/catalog">{T.clearFilters}</Link>} />
        ) : (
          // Only a librarian can add an item, so only a librarian gets a button.
          <Empty
            title={T.catalogEmptyHint}
            action={
              user.role === "admin_op"
                ? { label: T.addCatalogItem, href: "/catalog/admin" }
                : undefined
            }
          />
        )
      ) : (
        <div className="record-scroll">
          <table className="list">
            <thead>
              <tr>
                <th scope="col">Mã số</th>
                <th scope="col">{T.catalogItem}</th>
                <th scope="col">Tác giả</th>
                <th scope="col">Vị trí</th>
                <th scope="col">Tình trạng mượn</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="muted">{item.itemCode}</td>
                  <td>
                    <Link href={`/catalog/${item.id}`}>{item.title}</Link>
                  </td>
                  <td>{item.author}</td>
                  <td>{item.location}</td>
                  <td>{availability(item)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager page={page} pageSize={CATALOG_PAGE_SIZE} count={items.length} params={{ q }} />
    </main>
  );
}
