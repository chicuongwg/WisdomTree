import Link from "next/link";
import { notFound } from "next/navigation";
import { CollaborationSection } from "@/app/components/ui-next/collaboration-section";
import {
  getAppCollaborationContext,
  getAppProjectTask,
  toApplicationError,
} from "@/modules/application";
import { requireProjectModule } from "../../_lib/workspace-context";
import { StatusBadge, formatUiDate, translate } from "@/app/components/ui-next";

export default async function ProjectTaskPage({
  params,
}: {
  params: Promise<{ projectId: string; taskId: string }>;
}) {
  const { projectId, taskId } = await params;
  const { actor, application } = await requireProjectModule(projectId, "tasks");
  try {
    const [task, collaboration] = await Promise.all([
      getAppProjectTask(actor, projectId, taskId),
      getAppCollaborationContext(actor, { kind: "task", projectId, entityId: taskId }),
    ]);
    return (
      <section className="ui-next-work-page" aria-labelledby="task-title">
        <Link
          className="ui-next-back-link"
          href={`/app/projects/${encodeURIComponent(projectId)}/tasks${task.canEdit ? `?task=${encodeURIComponent(taskId)}` : ""}`}
        >
          {translate(application.locale, "tasks.openWorkspace")}
        </Link>
        <h2 id="task-title">{task.title}</h2>
        <StatusBadge tone={task.state === "done" ? "success" : "neutral"}>
          {translate(application.locale, `tasks.state.${task.state}`)}
        </StatusBadge>
        <dl className="ui-next-inline">
          <div>
            <dt>{translate(application.locale, "tasks.meta.assignee")}</dt>
            <dd>{task.assigneeName || translate(application.locale, "tasks.unassigned")}</dd>
          </div>
          {task.dueAt ? (
            <div>
              <dt>{translate(application.locale, "tasks.meta.due")}</dt>
              <dd>
                {formatUiDate(task.dueAt, application.locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </dd>
            </div>
          ) : null}
        </dl>
        {task.notes ? <p>{task.notes}</p> : null}
        <CollaborationSection
          locale={application.locale}
          members={collaboration.mentionCandidates}
          commentsUrl={`/api/app/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}/comments`}
          presenceUrl={`/api/app/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(taskId)}/presence`}
        />
      </section>
    );
  } catch (error) {
    if (toApplicationError(error).error === "not_found") notFound();
    throw error;
  }
}
