import { PagePlaceholder } from "../_components/page-placeholder";
import { getAppRequestContext } from "../_lib/request-context";

export default async function AppSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const [{ application }, query] = await Promise.all([
    getAppRequestContext(),
    searchParams.then((value) => value.q?.trim()),
  ]);
  return (
    <PagePlaceholder
      locale={application.locale}
      titleKey="page.search.title"
      descriptionKey="page.search.description"
      detail={query ? `“${query}”` : undefined}
    />
  );
}
