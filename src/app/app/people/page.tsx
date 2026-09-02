import { PagePlaceholder } from "../_components/page-placeholder";
import { getAppRequestContext } from "../_lib/request-context";

export default async function AppPeoplePage() {
  const { application } = await getAppRequestContext();
  return (
    <PagePlaceholder
      locale={application.locale}
      titleKey="page.people.title"
      descriptionKey="page.people.description"
    />
  );
}
