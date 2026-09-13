import Link from "next/link";
import { searchPublicNotes } from "@/modules/application";

export default async function PublishedResearchSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = (await searchParams).q?.trim() ?? "";
  const invalidQuery = query.length > 200;
  const results = query && !invalidQuery ? await searchPublicNotes({ query, limit: 20 }) : [];

  return (
    <main className="page published-research">
      <h1>Nghiên cứu đã công bố</h1>
      <p>Tìm trong các phiên bản nghiên cứu công khai, ổn định.</p>
      <form className="published-research__search" action="/p" method="get" role="search">
        <label htmlFor="published-research-query">Tìm kiếm</label>
        <input
          id="published-research-query"
          name="q"
          type="search"
          defaultValue={query}
          maxLength={200}
        />
        <button type="submit">Tìm</button>
      </form>
      {invalidQuery ? <p role="alert">Từ khóa tìm kiếm tối đa 200 ký tự.</p> : null}
      {query && !invalidQuery && results.length === 0 ? <p>Không tìm thấy kết quả.</p> : null}
      {results.length ? (
        <ul className="published-research__results">
          {results.map((result) => (
            <li key={result.noteId}>
              <Link href={`/p/${encodeURIComponent(result.slug)}`}>{result.title}</Link>
              {result.summary ? <p>{result.summary}</p> : null}
              <small>{result.project.name}</small>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
