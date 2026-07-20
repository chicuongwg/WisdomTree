import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/modules/auth/schema";
import { sources } from "@/modules/storage/schema";
import { requireUser, toPrincipal } from "@/lib/page";
import { getCurationWorkbench, getGapRequest } from "@/modules/storage/curation";
import { listBranches, listNodeOptions } from "@/modules/knowledge/service";
import {
  badgeClass,
  curationLabel,
  curationStateLabel,
  extractionLabel,
  extractionStateLabel,
  gapLabel,
  gapStateLabel,
  T,
  trustLabel,
  trustStateLabel,
} from "@/lib/vi";
import { CurationAdminActions } from "@/app/components/curation-admin-actions";
import { GapTriageActions } from "@/app/components/gap-triage-actions";

// Screen: Source Detail (`/source/:id`, admin-op-screen-specs.md) —
// type-aware: file-backed evidence review or branch-gap triage.
export default async function AdminSourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (user.role !== "admin_op") notFound();
  const actor = toPrincipal(user);
  const { id } = await params;

  const [isSource] = await db.select({ id: sources.id }).from(sources).where(eq(sources.id, id));
  if (!isSource) {
    // Gap-request variant of the type-aware detail screen.
    let gap;
    try {
      gap = await getGapRequest(actor, id);
    } catch {
      notFound();
    }
    const [branches, nodes] = await Promise.all([listBranches(actor), listNodeOptions(actor)]);
    return (
      <main className="page">
        <h1>
          {T.gapRequest}: {gap.title}
        </h1>
        <p>
          <span className={badgeClass(gapStateLabel, gap.state)}>{gapLabel(gap.state)}</span> ·{" "}
          {T.uploader}:{" "}
          {gap.submitterName ?? "—"}
        </p>
        {gap.description && <p>{gap.description}</p>}
        {gap.convertedBranchId && (
          <p>
            Đã chuyển thành: <Link href={`/tree/branch/${gap.convertedBranchId}`}>{T.branch}</Link>
          </p>
        )}
        {gap.convertedNodeId && (
          <p>
            Trang đích: <Link href={`/tree/node/${gap.convertedNodeId}`}>{T.node}</Link>
          </p>
        )}
        <GapTriageActions
          requestId={gap.id}
          state={gap.state}
          branches={branches.map((b) => ({ id: b.id, name: b.name }))}
          nodes={nodes.map((n) => ({ id: n.id, title: n.title }))}
        />
      </main>
    );
  }

  const wb = await getCurationWorkbench(actor, id);
  const editors = await db
    .select({ id: users.id, name: users.displayName })
    .from(users)
    .where(inArray(users.role, ["editor", "admin_op"]));

  return (
    <main className="page">
      <h1>
        {T.source}: {wb.source.title}
      </h1>
      <p>
        <span className={badgeClass(trustLabel, wb.source.trustStatus)}>
          {trustStateLabel(wb.source.trustStatus)}
        </span>{" "}
        <span className={badgeClass(extractionLabel, wb.version.extractionStatus)}>
          {extractionStateLabel(wb.version.extractionStatus)}
        </span>{" "}
        {wb.curation && (
          <span className={badgeClass(curationStateLabel, wb.curation.state)}>
            {curationLabel(wb.curation.state)}
          </span>
        )}{" "}
        · <Link href={`/library/${wb.source.id}`}>Xem trong {T.library}</Link> ·{" "}
        <Link href={`/source/task/${wb.source.id}`}>Mở bàn hiệu đính</Link>
      </p>

      <div className="with-side">
        <div>
          <h2>{T.rawText}</h2>
          {wb.chunks.length === 0 ? (
            <p className="muted">
              Chưa có văn bản trích xuất.{" "}
              {wb.version.extractionStatus === "unprocessable"
                ? "Tệp không xử lý được — vẫn được lưu và tải xuống bình thường."
                : ""}
            </p>
          ) : (
            wb.chunks.map((c) => (
              <div key={c.id} className="stack-item">
                <span className="badge muted">{c.refLabel}</span>
                <pre className="raw-text">{c.content}</pre>
              </div>
            ))
          )}
          <h2>{T.correctedText}</h2>
          {wb.correctedLatest ? (
            <pre className="raw-text">{wb.correctedLatest.content}</pre>
          ) : (
            <p className="muted">Chưa có bản hiệu đính.</p>
          )}
          <h2>{T.markdownDraft}</h2>
          {wb.draft ? (
            <pre className="raw-text">{wb.draft.contentMd}</pre>
          ) : (
            <p className="muted">Chưa có bản thảo.</p>
          )}
        </div>
        <aside>
          <CurationAdminActions
            sourceId={wb.source.id}
            versionId={wb.version.id}
            editors={editors}
            currentAssignee={wb.curation?.assignedTo ?? null}
            curationOpen={
              !!wb.curation && ["under_correction", "ready_for_review"].includes(wb.curation.state)
            }
          />
        </aside>
      </div>
    </main>
  );
}
