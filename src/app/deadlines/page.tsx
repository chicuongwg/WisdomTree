import Link from "next/link";
import { requireUser, toPrincipal } from "@/lib/page";
import { listDeadlines } from "@/modules/pm/service";
import { listMemberSpaces } from "@/modules/storage/service";
import { badgeToneClass, day, deadlineKindLabel, T, untilLabel } from "@/lib/vi";
import { DeadlineForm } from "@/app/components/deadline-form";
import { Empty } from "@/app/components/empty";

export const metadata = { title: T.deadline };

// Screen: Deadlines (`/deadlines`) — upcoming deadlines sorted by due date,
// filterable by project (user-screen-specs.md § Deadlines). The calendar
// subscribe link moved to /account § Lịch của tôi (one home per setting).
export default async function DeadlinesPage({
  searchParams,
}: {
  searchParams: Promise<{ spaceId?: string }>;
}) {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const { spaceId } = await searchParams;
  const [deadlines, spaces] = await Promise.all([
    listDeadlines(actor, spaceId || undefined),
    listMemberSpaces(actor),
  ]);
  const teamSpaces = spaces.filter((s) => s.type === "team");
  const spaceName = new Map(spaces.map((s) => [s.id, s.name]));
  // One "now" for the whole table, so two rows can never disagree about today.
  const now = new Date();

  return (
    <main className="page">
      <h1>{T.deadline}</h1>

      <form className="inline" method="get">
        <label htmlFor="dl-filter">{T.project}</label>
        <select id="dl-filter" name="spaceId" defaultValue={spaceId ?? ""}>
          <option value="">{T.allProjects}</option>
          {teamSpaces.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <button type="submit" className="secondary">
          {T.search}
        </button>
      </form>

      <div className="with-side">
        <div className="panel">
          {deadlines.length === 0 ? (
            spaceId ? (
              <Empty
                panel={false}
                title={T.noMatches}
                action={<Link href="/deadlines">{T.clearFilters}</Link>}
              />
            ) : (
              // The create form is the aside on this same screen, so the empty
              // state points at it rather than repeating the button.
              <Empty
                panel={false}
                title={T.deadlinesEmptyTitle}
                hint={T.deadlinesEmptyHint}
              />
            )
          ) : (
            <div className="record-scroll">
              <table className="list">
                <thead>
                  <tr>
                    <th scope="col">{T.title}</th>
                    <th scope="col">{T.deadlineType}</th>
                    <th scope="col">{T.project}</th>
                    <th scope="col">{T.dueAtLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {deadlines.map((d) => {
                    const until = untilLabel(d.dueAt, now);
                    return (
                      <tr key={d.id}>
                        <td>
                          <Link href={`/deadlines/${d.id}`}>{d.title}</Link>
                        </td>
                        <td>
                          <span className="badge muted">{deadlineKindLabel(d.type)}</span>
                        </td>
                        <td className="muted">{spaceName.get(d.spaceId) ?? ""}</td>
                        <td>
                          {/* A date, not an enum state — but inside a week it is
                              something a human must act on. The chip now SAYS
                              how near it is; the `attention` tone is the second
                              carrier, not the only one. */}
                          <span className={badgeToneClass(until ? "attention" : "waiting")}>
                            {until ? `${until} · ${day(d.dueAt)}` : day(d.dueAt)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <div className="panel">
            <h2>{T.createDeadline}</h2>
            <DeadlineForm spaces={teamSpaces} />
          </div>
        </div>
      </div>
    </main>
  );
}
