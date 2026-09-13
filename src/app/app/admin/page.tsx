import { notFound } from "next/navigation";
import {
  getAppOperationalStatus,
  listAppAuditEvents,
  listAppCoreMembers,
  listAppProjects,
  listAppUsers,
} from "@/modules/application";
import { PageContainer, PageHeader, Stack, translate } from "../../components/ui-next";
import { getAppRequestContext } from "../_lib/request-context";
import { AdminWorkspace } from "./_components/admin-workspace";

export default async function AppAdministrationPage() {
  const { actor, application } = await getAppRequestContext();
  if (!application.globalCapabilities.canAccessAdministration) notFound();
  const [projects, users, coreMembers, auditEvents, operationalStatus] = await Promise.all([
    listAppProjects(actor),
    listAppUsers(actor),
    listAppCoreMembers(actor),
    listAppAuditEvents(actor, { limit: 12 }),
    getAppOperationalStatus(actor),
  ]);
  return (
    <PageContainer width="wide">
      <Stack>
        <PageHeader
          title={translate(application.locale, "admin.title")}
          description={translate(application.locale, "admin.description")}
        />
        <AdminWorkspace
          locale={application.locale}
          projects={projects.filter((project) => !project.isPersonal)}
          users={users}
          coreMembers={coreMembers}
          auditEvents={auditEvents}
          operationalStatus={operationalStatus}
        />
      </Stack>
    </PageContainer>
  );
}
