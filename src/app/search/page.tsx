import Link from "next/link";
import { requireUser, toPrincipal } from "@/lib/page";
import { searchKnowledge } from "@/modules/knowledge/service";
import { listMemberSpaces } from "@/modules/storage/service";
import { wikiPath } from "@/lib/wiki-path";

export const metadata = { title: "Tìm kiếm" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; spaceId?: string }> }) {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const { q = "", spaceId } = await searchParams;
  const [results, spaces] = await Promise.all([
    q.trim() ? searchKnowledge(actor, q, spaceId) : Promise.resolve([]),
    listMemberSpaces(actor),
  ]);
  return (
    <main className="page">
      <h1>Tìm kiếm</h1>
      <form method="get" className="inline" role="search">
        <input name="q" type="search" defaultValue={q} required aria-label="Từ khóa" />
        <select name="spaceId" defaultValue={spaceId ?? ""} aria-label="Không gian">
          <option value="">Tất cả không gian</option>
          {spaces.map((space) => <option key={space.id} value={space.id}>{space.name}</option>)}
        </select>
        <button type="submit">Tìm</button>
      </form>
      {q && <p className="muted">{results.length} kết quả cho “{q}”</p>}
      <div className="cards">
        {results.map((result) => (
          <article className="panel" key={`${result.kind}-${result.id}`}>
            <div className="meta">{result.kind === "node" ? "Trang wiki" : "Tài liệu nguồn"} · {result.context}</div>
            <h2><Link href={result.kind === "node" ? wikiPath(result.id, result.slug) : `/library/${result.id}`}>{result.title}</Link></h2>
          </article>
        ))}
      </div>
    </main>
  );
}
