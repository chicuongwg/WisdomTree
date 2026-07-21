import Link from "next/link";
import { requireUser, toPrincipal } from "@/lib/page";
import { CATALOG_PAGE_SIZE, listCatalog } from "@/modules/catalog/service";
import { badgeClass, itemLabelShort, itemStatusLabel, T } from "@/lib/vi";
import { Pager } from "@/app/components/pager";
import { Empty } from "@/app/components/empty";

export const metadata = { title: T.catalog };

/**
 * How many books, and what is happening to them, are two different questions,
 * so they are two columns (owner decision 2026-07-21). They were briefly one
 * cell reading "Còn 1/3 cuốn", which answered both at once and neither
 * cleanly: a librarian counting the shelf had to read past a state word, and a
 * librarian looking for trouble had to read past a fraction.
 *
 * SỐ LƯỢNG is arithmetic: how many are free out of how many exist. It is the
 * same shape on every row — never blank — because a column that is empty most
 * of the time is a column the eye learns to skip.
 */
function copiesCell(item: { copies: number; availableCopies: number }) {
  return <span className="copy-count">{T.copiesOf(item.availableCopies, item.copies)}</span>;
}

/**
 * TRẠNG THÁI is the state of the title itself, in words, and the state is
 * never carried by the chip's colour alone.
 *
 * "Trên kệ" deliberately has no chip: it is roughly nineteen rows in twenty,
 * and a wall of green is what trains a reader to stop looking at a column. The
 * three states worth interrupting for wear one.
 */
function statusCell(item: { status: string; availableCopies: number }) {
  // Two words, always — the column is read by scanning down it, and a cell
  // that wraps to a second line breaks the scan.
  const state =
    item.status === "lost" || item.status === "repair"
      ? item.status
      : item.availableCopies === 0
        ? "borrowed"
        : "available";
  if (state === "available") return <span className="muted">{itemLabelShort(state)}</span>;
  return <span className={badgeClass(itemStatusLabel, state)}>{itemLabelShort(state)}</span>;
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
        // Page 2 of a one-page list — reached by the pager's "next" on a list
        // whose length is an exact multiple of the page size, or by a typed
        // URL. It used to render the FIRST-RUN empty state, which told a
        // librarian with a full catalogue that there was nothing in it.
        page > 1 ? (
          <Empty
            title={T.pageBeyondEnd}
            action={{ label: T.backToFirstPage, href: q ? `/catalog?q=${encodeURIComponent(q)}` : "/catalog" }}
          />
        ) : q ? (
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
                <th scope="col">{T.itemCode}</th>
                <th scope="col">{T.catalogItem}</th>
                <th scope="col">{T.author}</th>
                <th scope="col">{T.shelfLocation}</th>
                <th scope="col">{T.copiesColumn}</th>
                <th scope="col">{T.state}</th>
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
                  <td>{copiesCell(item)}</td>
                  <td>{statusCell(item)}</td>
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
