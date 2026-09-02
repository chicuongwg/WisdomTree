import { PagePlaceholder } from "../_components/page-placeholder";
import { getAppRequestContext } from "../_lib/request-context";

export default async function AppMyWorkPage() {
  const { application } = await getAppRequestContext();
  return (
    <PagePlaceholder
      locale={application.locale}
      titleKey="page.myWork.title"
      descriptionKey="page.myWork.description"
    />
  );
}
