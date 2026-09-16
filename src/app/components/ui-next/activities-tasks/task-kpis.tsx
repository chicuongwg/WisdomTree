"use client";

import type { UiLocale } from "@/modules/auth/profile";
import type { ProjectTaskKpis } from "@/modules/pm/service";
import { StatusBadge } from "../primitives/status-badge";
import { formatUiDate, translate } from "../localization";

export function KpiScorecardView({
  locale,
  kpis,
}: {
  locale: UiLocale;
  kpis?: ProjectTaskKpis;
}) {
  if (!kpis) return null;
  return (
    <div className="ui-next-kpi-view" aria-label={translate(locale, "tasks.kpi.title")}>
      <section className="ui-next-kpi-summary">
        <div className="ui-next-kpi-card">
          <span className="ui-next-kpi-card__label">{translate(locale, "tasks.kpi.totalTasks")}</span>
          <span className="ui-next-kpi-card__value">{kpis.totalTasks}</span>
          <span className="ui-next-kpi-card__subtext">
            {kpis.totalDoing} {translate(locale, "tasks.kpi.doing").toLowerCase()} · {kpis.totalTodo}{" "}
            {translate(locale, "tasks.kpi.todo").toLowerCase()}
          </span>
        </div>
        <div className="ui-next-kpi-card">
          <span className="ui-next-kpi-card__label">{translate(locale, "tasks.kpi.totalCompleted")}</span>
          <span className="ui-next-kpi-card__value">{kpis.totalCompleted}</span>
          <span className="ui-next-kpi-card__subtext">
            {kpis.totalOverdue > 0 ? (
              <strong className="text-ui-danger">
                {kpis.totalOverdue} {translate(locale, "tasks.kpi.overdue").toLowerCase()}
              </strong>
            ) : (
              <span className="text-ui-success">0 {translate(locale, "tasks.kpi.overdue").toLowerCase()}</span>
            )}
          </span>
        </div>
        <div className="ui-next-kpi-card">
          <span className="ui-next-kpi-card__label">{translate(locale, "tasks.kpi.completionRate")}</span>
          <span className="ui-next-kpi-card__value">{kpis.overallCompletionRate}%</span>
          <span className="ui-next-kpi-card__subtext">
            {kpis.totalCompleted} / {kpis.totalTasks} {translate(locale, "tasks.completed").toLowerCase()}
          </span>
        </div>
        <div className="ui-next-kpi-card">
          <span className="ui-next-kpi-card__label">{translate(locale, "tasks.kpi.onTimeRate")}</span>
          <span className="ui-next-kpi-card__value">{kpis.overallOnTimeRate}%</span>
          <span className="ui-next-kpi-card__subtext">
            {translate(locale, "tasks.onTime")}
          </span>
        </div>
      </section>

      <section className="ui-next-kpi-roster" aria-labelledby="kpi-roster-title">
        <h3 id="kpi-roster-title">{translate(locale, "tasks.kpi.title")}</h3>
        {kpis.personKpis.map((person) => (
          <div key={person.personId} className="ui-next-kpi-person-card">
            <header className="ui-next-kpi-person-card__header">
              <div className="ui-next-kpi-person-card__identity">
                <span className="ui-next-kpi-person-card__avatar">
                  {person.displayName.slice(0, 2).toUpperCase()}
                </span>
                <h4 className="ui-next-kpi-person-card__name">{person.displayName}</h4>
              </div>
              <div className="ui-next-kpi-person-card__pills">
                <StatusBadge tone={person.completionRate >= 80 ? "success" : person.completionRate >= 50 ? "information" : "neutral"}>
                  {person.completionRate}% {translate(locale, "tasks.completed").toLowerCase()}
                </StatusBadge>
                <StatusBadge tone={person.onTimeRate >= 85 ? "success" : "warning"}>
                  {person.onTimeRate}% {translate(locale, "tasks.onTime").toLowerCase()}
                </StatusBadge>
              </div>
            </header>

            <div className="ui-next-kpi-person-card__stats">
              <span>
                <strong>{person.completedCount}</strong> {translate(locale, "tasks.state.done")}
              </span>
              <span>
                <strong>{person.doingCount}</strong> {translate(locale, "tasks.state.doing")}
              </span>
              <span>
                <strong>{person.todoCount}</strong> {translate(locale, "tasks.state.todo")}
              </span>
              {person.overdueCount > 0 ? (
                <span className="text-ui-danger font-semibold">
                  <strong>{person.overdueCount}</strong> {translate(locale, "tasks.kpi.overdue")}
                </span>
              ) : null}
              {person.averageDurationHours !== null ? (
                <span>
                  {translate(locale, "tasks.kpi.avgDuration")}:{" "}
                  <strong>{translate(locale, "tasks.kpi.hours", { hours: person.averageDurationHours })}</strong>
                </span>
              ) : null}
            </div>

            {person.recentCompletedTasks.length ? (
              <details className="ui-next-kpi-person-card__recent">
                <summary>
                  {translate(locale, "tasks.kpi.recentCompleted")} ({person.recentCompletedTasks.length})
                </summary>
                <ul className="ui-next-kpi-person-card__recent-list" role="list">
                  {person.recentCompletedTasks.map((task) => (
                    <li key={task.id} className="ui-next-kpi-person-card__recent-item">
                      <span className="font-medium">{task.title}</span>
                      <span className="flex items-center gap-2">
                        {task.completedAt ? (
                          <small className="text-ui-text-muted">
                            {formatUiDate(task.completedAt, locale, { dateStyle: "short", timeStyle: "short" })}
                          </small>
                        ) : null}
                        <StatusBadge tone={task.isOnTime ? "success" : "warning"}>
                          {translate(locale, task.isOnTime ? "tasks.onTime" : "tasks.late")}
                        </StatusBadge>
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        ))}
      </section>
    </div>
  );
}
