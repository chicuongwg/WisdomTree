import Link from "next/link";
import type { UiLocale } from "@/modules/auth/profile";
import {
  EmptyState,
  PageHeader,
  StatusBadge,
  formatUiDate,
  translate,
} from "@/app/components/ui-next";

type MyTask = {
  id: string;
  projectId: string;
  title: string;
  state: "todo" | "doing" | "done" | "archived";
  dueAt: Date | string | null;
  project: { id: string; name: string };
  activity: { id: string; title: string } | null;
};

export function MyWorkView({ locale, tasks }: { locale: UiLocale; tasks: MyTask[] }) {
  const states = ["todo", "doing", "done", "archived"] as const;
  return (
    <section className="ui-next-work-page" aria-labelledby="my-work-title">
      <PageHeader
        titleId="my-work-title"
        title={translate(locale, "page.myWork.title")}
        description={translate(locale, "myWork.description")}
      />
      {tasks.length ? (
        <div
          className="ui-next-kanban ui-next-my-work-kanban"
          aria-label={translate(locale, "tasks.kanban")}
        >
          {states.map((state) => {
            const laneTasks = tasks.filter((task) => task.state === state);
            return (
              <section
                className="ui-next-kanban__lane"
                key={state}
                aria-labelledby={`my-work-${state}`}
              >
                <header>
                  <h2 id={`my-work-${state}`}>{translate(locale, `tasks.state.${state}`)}</h2>
                  <span>{laneTasks.length}</span>
                </header>
                {laneTasks.length ? (
                  <ul role="list">
                    {laneTasks.map((task) => (
                      <li className="ui-next-kanban__card" key={task.id}>
                        <Link
                          href={`/app/projects/${encodeURIComponent(task.projectId)}/tasks/${encodeURIComponent(task.id)}`}
                        >
                          {task.title}
                        </Link>
                        <div className="ui-next-my-work-kanban__context">
                          <span>{task.project.name}</span>
                          {task.activity ? <span>{task.activity.title}</span> : null}
                          {task.dueAt ? (
                            <span>
                              {translate(locale, "tasks.meta.due")}{" "}
                              {formatUiDate(task.dueAt, locale)}
                            </span>
                          ) : null}
                        </div>
                        <StatusBadge
                          tone={
                            task.state === "done"
                              ? "success"
                              : task.state === "doing"
                                ? "information"
                                : "neutral"
                          }
                        >
                          {translate(locale, `tasks.state.${task.state}`)}
                        </StatusBadge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>{translate(locale, "tasks.laneEmpty")}</p>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={translate(locale, "myWork.emptyTitle")}
          description={translate(locale, "myWork.emptyDescription")}
        />
      )}
    </section>
  );
}
