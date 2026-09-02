import {
  EmptyState,
  PageContainer,
  PageHeader,
  Stack,
  translate,
} from "../../../components/ui-next";
import { getAppRequestContext } from "../../_lib/request-context";

export default async function ProjectNotFound() {
  const { application } = await getAppRequestContext();
  return (
    <PageContainer width="wide">
      <Stack>
        <PageHeader title={translate(application.locale, "workspace.projectUnavailableTitle")} />
        <EmptyState
          title={translate(application.locale, "workspace.projectUnavailableTitle")}
          description={translate(application.locale, "workspace.projectUnavailableDescription")}
        />
      </Stack>
    </PageContainer>
  );
}
