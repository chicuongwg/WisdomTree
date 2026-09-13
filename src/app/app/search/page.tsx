import { getAppRequestContext } from "../_lib/request-context";
import { searchAppResearch } from "@/modules/application";
import { ResearchSearchView } from "./_components/research-search-view";

export default async function AppSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const [{ actor, application }, params] = await Promise.all([
    getAppRequestContext(),
    searchParams,
  ]);
  const query = params.q?.trim() ?? "";
  const type = params.type ?? "all";
  const results = query
    ? await searchAppResearch(actor, {
        query,
        ...(type !== "all"
          ? { types: [type as "project" | "note" | "material" | "activity" | "person"] }
          : {}),
      })
    : [];
  return (
    <ResearchSearchView locale={application.locale} query={query} type={type} results={results} />
  );
}
