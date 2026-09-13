import { fromAppClock, toAppClock } from "@/lib/time";
import { listAppCalendarSchedule } from "@/modules/application";
import { notFound } from "next/navigation";
import { getAppRequestContext } from "../_lib/request-context";
import { CalendarWorkspace } from "./_components/calendar-workspace";
import { PageContainer } from "@/app/components/ui-next";

function monthFrom(value: string | undefined, now: Date) {
  const match = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  const at = toAppClock(now);
  if (!match || Number(match[2]) < 1 || Number(match[2]) > 12) {
    return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), 1));
  }
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
}

function weekFrom(value: string | undefined, now: Date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  const at = match
    ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
    : toAppClock(now);
  const valid = Number.isNaN(at.getTime()) ? toAppClock(now) : at;
  return new Date(valid.getTime() - ((valid.getUTCDay() + 6) % 7) * 86_400_000);
}

export default async function AppCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; m?: string; w?: string; projectId?: string }>;
}) {
  const [{ view, m, w, projectId }, { actor, application, projects }] = await Promise.all([
    searchParams,
    getAppRequestContext(),
  ]);
  const calendarView = view === "week" ? "week" : "month";
  const anchor = calendarView === "week" ? weekFrom(w, new Date()) : monthFrom(m, new Date());
  const rangeAnchor =
    calendarView === "week"
      ? anchor
      : new Date(anchor.getTime() - ((anchor.getUTCDay() + 6) % 7) * 86_400_000);
  const from = fromAppClock(rangeAnchor);
  const to = fromAppClock(
    new Date(rangeAnchor.getTime() + (calendarView === "week" ? 7 : 42) * 86_400_000),
  );
  const operationalProjects = projects
    .filter((project) => project.operationalMember)
    .map((project) => ({
      id: project.id,
      name: project.name,
      isPersonal: project.isPersonal,
      canEditDeadline: project.capabilities.canCreateTask,
    }));
  if (projectId && !operationalProjects.some((project) => project.id === projectId)) notFound();
  const schedule = await listAppCalendarSchedule(actor, { from, to, projectId });
  return (
    <PageContainer width="full">
      <CalendarWorkspace
        locale={application.locale}
        projects={operationalProjects}
        tasks={schedule.tasks}
        deadlines={schedule.deadlines}
        year={anchor.getUTCFullYear()}
        month={anchor.getUTCMonth()}
        weekDay={anchor.getUTCDate()}
        view={calendarView}
        selectedProjectId={projectId}
      />
    </PageContainer>
  );
}
