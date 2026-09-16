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

    const stateTone =
      task.state === "done"
        ? "success"
        : task.state === "doing"
          ? "information"
          : task.state === "archived"
            ? "neutral"
            : "neutral";

    return (
      <section className="ui-next-work-page" aria-labelledby="task-detail-title">
        {/* Breadcrumb */}
        <Link
          className="ui-next-back-link"
          href={`/app/projects/${encodeURIComponent(projectId)}/tasks${task.canEdit ? `?task=${encodeURIComponent(taskId)}` : ""}`}
        >
          ← {translate(application.locale, "tasks.openWorkspace")}
        </Link>

        {/* Title + Status header */}
        <div className="ui-next-task-detail__header">
          <h2 id="task-detail-title" className="ui-next-task-detail__title">{task.title}</h2>
          <StatusBadge tone={stateTone}>
            {translate(application.locale, `tasks.state.${task.state}`)}
          </StatusBadge>
        </div>

        {/* Property grid */}
        <div className="ui-next-task-detail__props">
          <div className="ui-next-task-detail__prop">
            <span className="ui-next-task-detail__prop-label">{translate(application.locale, "tasks.meta.assignee")}</span>
            <span className="ui-next-task-detail__prop-value">
              {task.assigneeName || translate(application.locale, "tasks.unassigned")}
            </span>
          </div>

          {task.dueAt ? (
            <div className="ui-next-task-detail__prop">
              <span className="ui-next-task-detail__prop-label">{translate(application.locale, "tasks.meta.due")}</span>
              <span className="ui-next-task-detail__prop-value">
                {formatUiDate(task.dueAt, application.locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </span>
            </div>
          ) : null}

          {task.priority ? (
            <div className="ui-next-task-detail__prop">
              <span className="ui-next-task-detail__prop-label">{translate(application.locale, "tasks.field.priority")}</span>
              <span className={`ui-next-priority-pill ui-next-priority-pill--${task.priority}`}>
                {translate(application.locale, `tasks.priority.${task.priority}`)}
              </span>
            </div>
          ) : null}

          {task.kind ? (
            <div className="ui-next-task-detail__prop">
              <span className="ui-next-task-detail__prop-label">{translate(application.locale, "tasks.field.kind")}</span>
              <span className="ui-next-kind-badge">
                {translate(application.locale, `tasks.kind.${task.kind}`)}
              </span>
            </div>
          ) : null}

          {task.sprint ? (
            <div className="ui-next-task-detail__prop">
              <span className="ui-next-task-detail__prop-label">{translate(application.locale, "tasks.field.sprint")}</span>
              <span className="ui-next-task-detail__prop-value">{task.sprint}</span>
            </div>
          ) : null}

          {task.estimatePoints != null ? (
            <div className="ui-next-task-detail__prop">
              <span className="ui-next-task-detail__prop-label">{translate(application.locale, "tasks.field.estimatePoints")}</span>
              <span className="ui-next-points-pill">{task.estimatePoints} pts</span>
            </div>
          ) : null}
        </div>

        {/* Notes */}
        {task.notes ? (
          <div className="ui-next-task-detail__notes">
            <span className="ui-next-task-detail__notes-label">{translate(application.locale, "tasks.field.notes")}</span>
            <p className="ui-next-task-detail__notes-body">{task.notes}</p>
          </div>
        ) : null}

        {/* Collaboration */}
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
