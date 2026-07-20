import Link from "next/link";
import { requireUser, toPrincipal } from "@/lib/page";
import { listCatalog } from "@/modules/catalog/service";
import { badgeClass, itemLabel, itemStatusLabel, T } from "@/lib/vi";

// Screen: Catalog (`/catalog`) — physical library, library-space members.
export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await requireUser();
  const { q } = await searchParams;
  const items = await listCatalog(toPrincipal(user), { q });

  return (
    <main className="page">
      <h1>{T.catalog}</h1>
      <form className="inline" method="get">
        <input type="search" name="q" defaultValue={q ?? ""} placeholder="Tên sách, tác giả, mã số…" />
        <button type="submit">{T.search}</button>
      </form>
      {items.length === 0 ? (
        <p className="muted">{T.empty}</p>
      ) : (
        <table className="list">
          <thead>
            <tr>
              <th>Mã số</th>
              <th>{T.catalogItem}</th>
              <th>Tác giả</th>
              <th>Vị trí</th>
              <th>Trạng thái</th>
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
                  <span className={badgeClass(itemStatusLabel, item.status)}>
                    {itemLabel(item.status)}
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
