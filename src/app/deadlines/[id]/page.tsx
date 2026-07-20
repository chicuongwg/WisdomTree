import Link from "next/link";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { orNotFound, requireUser, toPrincipal } from "@/lib/page";
import { getDeadline } from "@/modules/pm/service";
import { listMentionableUsers } from "@/modules/notify/service";
import { tasks } from "@/modules/pm/schema";
import { sources } from "@/modules/storage/schema";
import { treeNodes } from "@/modules/knowledge/schema";
import { deadlineTypeLabel, T, taskStateLabel } from "@/lib/vi";
import { DeadlineForm } from "@/app/components/deadline-form";
import { CommentsSection } from "@/app/components/comments-section";

// Screen: Deadline Detail (`/deadlines/:id`) — type, due date, linked
// checklist and documents, plus the shared comments block anchored to the
// deadline (user-screen-specs.md § Deadlines).
export default async function DeadlineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const { id } = await params;
  const deadline = await orNotFound(() => getDeadline(actor, id));
  const mentionOptions = await listMentionableUsers();

  const taskIds = deadline.links.filter((l) => l.targetType === "task").map((l) => l.targetId);
  const sourceIds = deadline.links.filter((l) => l.targetType === "source").map((l) => l.targetId);
  const nodeIds = deadline.links.filter((l) => l.targetType === "tree_node").map((l) => l.targetId);
  const [linkedTasks, linkedSources, linkedNodes] = await Promise.all([
    taskIds.length ? db.select().from(tasks).where(inArray(tasks.id, taskIds)) : [],
    sourceIds.length ? db.select().from(sources).where(inArray(sources.id, sourceIds)) : [],
    nodeIds.length ? db.select().from(treeNodes).where(inArray(treeNodes.id, nodeIds)) : [],
  ]);

  return (
    <main className="page">
      <h1>
        {deadline.title} <span className="badge muted">{deadlineTypeLabel[deadline.type]}</span>
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
                    <span className="muted">({taskStateLabel[t.state]})</span>
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
          <CommentsSection anchorType="deadline" anchorId={deadline.id} mentionOptions={mentionOptions} />
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
