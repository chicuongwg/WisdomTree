import Link from "next/link";
import { orNotFound, requireUser, toPrincipal } from "@/lib/page";
import { getDeadlineLinks } from "@/modules/pm/service";
import { day, deadlineKindLabel, reminderLabel, T, taskLabel } from "@/lib/vi";
import { DeadlineForm } from "@/app/components/deadline-form";
import { listMentionCandidates } from "@/modules/notify/service";
import { CommentsSection } from "@/app/components/comments-section";
import { Empty } from "@/app/components/empty";

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
        {T.dueAtLabel}: {day(deadline.dueAt)} · {T.reminderOffsets}:{" "}
        {deadline.reminderOffsets.map(reminderLabel).join(", ")}
      </p>

      <div className="with-side">
        <div>
          <div className="panel">
            <h2>{T.checklistAndDocs}</h2>
            {deadline.links.length === 0 ? (
              // Nothing gets linked from this screen — the link is made from
              // the task or the document side.
              <Empty
                panel={false}
                title={T.deadlineLinksEmptyTitle}
                hint={T.deadlineLinksEmptyHint}
              />
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
          <CommentsSection
            anchorType="deadline"
            anchorId={deadline.id}
            members={await listMentionCandidates("deadline", deadline.id)}
          />
        </div>
        <div>
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
        </div>
      </div>
    </main>
  );
}
