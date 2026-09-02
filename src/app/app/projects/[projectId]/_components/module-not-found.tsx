import { EmptyState, translate } from "../../../../components/ui-next";
import { getAppRequestContext } from "../../../_lib/request-context";

export async function ProjectModuleNotFound() {
  const { application } = await getAppRequestContext();
  return (
    <EmptyState
      title={translate(application.locale, "workspace.moduleUnavailableTitle")}
      description={translate(application.locale, "workspace.moduleUnavailableDescription")}
    />
  );
}
