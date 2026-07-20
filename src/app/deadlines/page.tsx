import Link from "next/link";
import { headers } from "next/headers";
import { requireUser, toPrincipal } from "@/lib/page";
import { listDeadlines, myCalendarToken } from "@/modules/pm/service";
import { listMemberSpaces } from "@/modules/storage/service";
import { deadlineTypeLabel, T } from "@/lib/vi";
import { DeadlineForm } from "@/app/components/deadline-form";

// Screen: Deadlines (`/deadlines`) — upcoming deadlines sorted by due date,
// filterable by project, with the calendar-feed subscribe link
// (user-screen-specs.md § Deadlines).
export default async function DeadlinesPage({
  searchParams,
}: {
  searchParams: Promise<{ spaceId?: string }>;
}) {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const { spaceId } = await searchParams;
  const [deadlines, spaces, token, headerList] = await Promise.all([
    listDeadlines(actor, spaceId || undefined),
    listMemberSpaces(actor),
    myCalendarToken(actor),
    headers(),
  ]);
  const teamSpaces = spaces.filter((s) => s.type === "team");
  const spaceName = new Map(spaces.map((s) => [s.id, s.name]));
  const host = headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";

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
            <p className="muted">Chưa có hạn chót nào. Tạo hạn chót đầu tiên ở khung bên.</p>
          ) : (
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
                  const soon = d.dueAt.getTime() - Date.now() < 7 * 86_400_000;
                  return (
                    <tr key={d.id}>
                      <td>
                        <Link href={`/deadlines/${d.id}`}>{d.title}</Link>
                      </td>
                      <td>
                        <span className="badge muted">{deadlineTypeLabel[d.type]}</span>
                      </td>
                      <td className="muted">{spaceName.get(d.spaceId) ?? ""}</td>
                      <td>
                        <span className={`badge ${soon ? "warn" : ""}`}>
                          {d.dueAt.toLocaleString("vi-VN")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <aside>
          <div className="panel">
            <h2>{T.createDeadline}</h2>
            <DeadlineForm spaces={teamSpaces} />
          </div>
          <div className="panel">
            <h2>{T.myCalendar}</h2>
            {token ? (
              <>
                <p className="meta">
                  {T.calendarSubscribeHint}
                </p>
                <code className="ics-url">{`${proto}://${host}/calendar/${token.token}.ics`}</code>
              </>
            ) : (
              <p className="muted">Chưa có đường dẫn lịch cho tài khoản này.</p>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
