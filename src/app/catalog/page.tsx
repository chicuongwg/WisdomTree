import Link from "next/link";
import { requireUser, toPrincipal } from "@/lib/page";
import { CATALOG_PAGE_SIZE, listCatalog } from "@/modules/catalog/service";
import { badgeClass, itemLabel, itemStatusLabel, T } from "@/lib/vi";
import { Pager } from "@/app/components/pager";
import { Empty } from "@/app/components/empty";

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
                <th scope="col">Trạng thái</th>
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
                  <td>
                    {/* `available` is ~95% of the shelf. A chip on every row
                        trains the eye to skip the column, which is exactly the
                        column that matters on the 5% that are out or lost. The
                        resting state shows nothing; the header still names it. */}
                    {item.status !== "available" && (
                      <span className={badgeClass(itemStatusLabel, item.status)}>
                        {itemLabel(item.status)}
                      </span>
                    )}
                  </td>
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
