import Link from "next/link";
import type { UiLocale } from "@/modules/auth/profile";
import { EmptyState, StatusBadge, formatUiDate, translate } from "@/app/components/ui-next";

type MyTask = { id: string; projectId: string; title: string; state: "todo" | "doing" | "done" | "archived"; dueAt: Date | string | null; project: { id: string; name: string }; activity: { id: string; title: string } | null };

export function MyWorkView({ locale, tasks }: { locale: UiLocale; tasks: MyTask[] }) {
  const now = new Date(); const due = (task: MyTask) => task.dueAt ? new Date(task.dueAt) : null;
  const groups = [["myWork.overdue", tasks.filter((task) => { const date = due(task); return date && date < now && task.state !== "done"; })], ["myWork.upcoming", tasks.filter((task) => { const date = due(task); return date && date >= now && task.state !== "done"; })], ["myWork.noDueDate", tasks.filter((task) => !task.dueAt && task.state !== "done")], ["myWork.completed", tasks.filter((task) => task.state === "done")]] as const;
  return <section className="ui-next-work-page" aria-labelledby="my-work-title"><header className="ui-next-work-page__header"><div><h2 id="my-work-title">{translate(locale, "page.myWork.title")}</h2><p>{translate(locale, "myWork.description")}</p></div></header>{tasks.length ? <div className="ui-next-my-work">{groups.map(([key, group]) => group.length ? <section key={key}><h3>{translate(locale, key)}</h3><ul className="ui-next-task-list">{group.map((task) => <li key={task.id}><Link className="ui-next-task-list__row" href={`/app/projects/${encodeURIComponent(task.projectId)}/tasks`}><span><strong>{task.title}</strong><small>{task.project.name}{task.activity ? ` · ${task.activity.title}` : ""}{task.dueAt ? ` · ${formatUiDate(task.dueAt, locale)}` : ""}</small></span><StatusBadge tone={task.state === "done" ? "success" : task.state === "doing" ? "information" : "neutral"}>{translate(locale, `tasks.state.${task.state}`)}</StatusBadge></Link></li>)}</ul></section> : null)}</div> : <EmptyState title={translate(locale, "myWork.emptyTitle")} description={translate(locale, "myWork.emptyDescription")} />}</section>;
}
