import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, toPrincipal } from "@/lib/page";
import { sourceExists } from "@/modules/storage/service";
import {
  getCurationWorkbench,
  getGapRequest,
  listAssignableEditors,
} from "@/modules/storage/curation";
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
} from "@/lib/vi";
import { CurationAdminActions } from "@/app/components/curation-admin-actions";
import { GapTriageActions } from "@/app/components/gap-triage-actions";
import { RawChunks } from "@/app/components/raw-chunks";

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

  if (!(await sourceExists(id))) {
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
  const editors = await listAssignableEditors(actor);

  return (
    <main className="page">
      <h1>
        {T.source}: {wb.source.title}
      </h1>
      <p>
        {/* Trust chip removed: it showed a state nothing writes. */}
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
          <RawChunks
            chunks={wb.chunks}
            empty={
              wb.version.extractionStatus === "unprocessable"
                ? "Chưa có văn bản trích xuất. Tệp không xử lý được — vẫn được lưu và tải xuống bình thường."
                : "Chưa có văn bản trích xuất."
            }
          />
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
