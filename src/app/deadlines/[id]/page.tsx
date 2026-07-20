import Link from "next/link";
import { orNotFound, requireUser, toPrincipal } from "@/lib/page";
import { getDeadlineLinks } from "@/modules/pm/service";
import { deadlineKindLabel, T, taskLabel } from "@/lib/vi";
import { DeadlineForm } from "@/app/components/deadline-form";
import { CommentsSection } from "@/app/components/comments-section";

// Screen: Deadline Detail (`/deadlines/:id`) — type, due date, linked
// checklist and documents, plus the shared comments block anchored to the
// deadline (user-screen-specs.md § Deadlines).
export default async function DeadlineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const { id } = await params;
  const { deadline, linkedTasks, linkedSources, linkedNodes } = await orNotFound(() =>
    getDeadlineLinks(actor, id),
  );

  return (
    <main className="page">
      <h1>
        {deadline.title} <span className="badge muted">{deadlineKindLabel(deadline.type)}</span>
      </h1>
      <p className="muted">
        {T.dueAtLabel}: {deadline.dueAt.toLocaleString("vi-VN")} · {T.reminderOffsets}:{" "}
        {deadline.reminderOffsets.join(", ")}
      </p>

      <div className="with-side">
        <div>
          <div className="panel">
            <h2>{T.checklistAndDocs}</h2>
            {deadline.links.length === 0 ? (
              <p className="muted">{T.empty}</p>
            ) : (
              <ul>
                {linkedTasks.map((t) => (
                  <li key={t.id}>
                    <span className="badge muted">{T.task}</span> {t.title}{" "}
                    <span className="muted">({taskLabel(t.state)})</span>
                  </li>
                ))}
                {linkedSources.map((s) => (
                  <li key={s.id}>
                    <span className="badge muted">{T.source}</span>{" "}
                    <Link href={`/library/${s.id}`}>{s.title}</Link>
                  </li>
                ))}
                {linkedNodes.map((n) => (
                  <li key={n.id}>
                    <span className="badge muted">{T.node}</span>{" "}
                    <Link href={`/tree/node/${n.id}`}>{n.title}</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <CommentsSection anchorType="deadline" anchorId={deadline.id} />
        </div>
        <aside>
          <div className="panel">
            <h2>{T.editDeadline}</h2>
            <DeadlineForm
              spaces={[{ id: deadline.spaceId, name: T.project }]}
              existing={{
                id: deadline.id,
                spaceId: deadline.spaceId,
                title: deadline.title,
                type: deadline.type,
                dueAt: deadline.dueAt.toISOString(),
                reminderOffsets: deadline.reminderOffsets,
                version: deadline.version,
              }}
            />
          </div>
        </aside>
      </div>
    </main>
  );
}
