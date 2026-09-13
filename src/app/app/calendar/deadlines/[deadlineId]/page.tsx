import Link from "next/link";
import { notFound } from "next/navigation";
import { CollaborationSection } from "@/app/components/ui-next/collaboration-section";
import {
  PageContainer,
  PageHeader,
  Stack,
  Surface,
  formatUiDate,
  translate,
} from "@/app/components/ui-next";
import {
  getAppCollaborationContext,
  getAppDeadline,
  toApplicationError,
} from "@/modules/application";
import { getAppRequestContext } from "../../../_lib/request-context";

export default async function DeadlineDetailPage({
  params,
}: {
  params: Promise<{ deadlineId: string }>;
}) {
  const { deadlineId } = await params;
  const { actor, application } = await getAppRequestContext();
  try {
    const [deadline, collaboration] = await Promise.all([
      getAppDeadline(actor, deadlineId),
      getAppCollaborationContext(actor, { kind: "deadline", entityId: deadlineId }),
    ]);
    return (
      <PageContainer width="standard">
        <Stack>
          <Link className="ui-next-back-link" href="/app/calendar">
            {translate(application.locale, "common.back")}
          </Link>
          <PageHeader title={deadline.title} description={deadline.project.name} />
          <Surface>
            <p>
              {translate(application.locale, `calendar.type.${deadline.type}`)} ·{" "}
              {formatUiDate(deadline.dueAt, application.locale, {
                dateStyle: "full",
                timeStyle: "short",
              })}
            </p>
          </Surface>
          <CollaborationSection
            locale={application.locale}
            members={collaboration.mentionCandidates}
            commentsUrl={`/api/app/calendar/deadlines/${encodeURIComponent(deadline.id)}/comments`}
            presenceUrl={`/api/app/calendar/deadlines/${encodeURIComponent(deadline.id)}/presence`}
          />
        </Stack>
      </PageContainer>
    );
  } catch (error) {
    if (toApplicationError(error).error === "not_found") notFound();
    throw error;
  }
}
