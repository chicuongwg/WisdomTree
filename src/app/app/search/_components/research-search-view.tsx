import Link from "next/link";
import type { UiLocale } from "@/modules/auth/profile";
import type { InternalResearchSearchResult } from "@/modules/search/service";
import { PageContainer, PageHeader, Stack, Surface, translate } from "@/app/components/ui-next";

function resultHref(result: InternalResearchSearchResult) {
  if (result.kind === "project") return `/app/projects/${result.id}`;
  if (result.kind === "person") return `/app/people/${result.id}`;
  if (result.kind === "note") return `/app/projects/${result.project.id}/notes/${result.id}`;
  if (result.kind === "material")
    return `/app/projects/${result.project.id}/materials/${result.id}`;
  return `/app/projects/${result.project.id}/activities/${result.id}`;
}

export function ResearchSearchView({
  locale,
  query,
  type,
  results,
}: {
  locale: UiLocale;
  query: string;
  type: string;
  results: InternalResearchSearchResult[];
}) {
  const types = ["all", "note", "material", "activity", "person", "project"] as const;
  return (
    <PageContainer width="wide">
      <Stack>
        <PageHeader
          title={translate(locale, "nav.search")}
          description={translate(locale, "search.description")}
        />
        <form className="ui-next-inline" method="get">
          <label style={{ flex: 1 }}>
            <span className="ui-next-visually-hidden">{translate(locale, "nav.search")}</span>
            <input
              className="ui-next-control"
              name="q"
              defaultValue={query}
              placeholder={translate(locale, "search.placeholder")}
              maxLength={200}
            />
          </label>
          <label>
            <span className="ui-next-visually-hidden">
              {translate(locale, "search.filterLabel")}
            </span>
            <select className="ui-next-control" name="type" defaultValue={type}>
              {types.map((value) => (
                <option key={value} value={value}>
                  {value === "all"
                    ? translate(locale, "search.filter.all")
                    : translate(locale, `shell.kind.${value}`)}
                </option>
              ))}
            </select>
          </label>
          <button className="ui-next-button ui-next-button--primary" type="submit">
            {translate(locale, "nav.search")}
          </button>
        </form>
        {!query ? (
          <Surface>
            <p>{translate(locale, "search.empty")}</p>
          </Surface>
        ) : null}
        {query && !results.length ? (
          <Surface>
            <p>{translate(locale, "search.noResults")}</p>
          </Surface>
        ) : null}
        {results.length ? (
          <ul
            className="ui-next-project-list"
            aria-label={translate(locale, "shell.searchResults")}
          >
            {results.map((result) => (
              <li key={`${result.kind}:${result.id}`}>
                <Surface className="ui-next-project-card">
                  <div className="ui-next-project-card__main">
                    <small>{translate(locale, `shell.kind.${result.kind}`)}</small>
                    <h3>
                      <Link href={resultHref(result)}>
                        {result.kind === "project" && result.isPersonal
                          ? translate(locale, "projects.myProject")
                          : result.title}
                      </Link>
                    </h3>
                    {result.summary ? (
                      <p className="ui-next-project-card__description" dir="auto">
                        {result.summary}
                      </p>
                    ) : null}
                    <p className="ui-next-muted">
                      {result.kind === "person"
                        ? result.projects.map((project) => project.name).join(" · ")
                        : result.kind === "project"
                          ? null
                          : result.project.name}
                    </p>
                  </div>
                </Surface>
              </li>
            ))}
          </ul>
        ) : null}
      </Stack>
    </PageContainer>
  );
}
