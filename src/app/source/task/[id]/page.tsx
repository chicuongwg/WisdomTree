import Link from "next/link";
import { orNotFound, requireUser, toPrincipal } from "@/lib/page";
import { getCurationWorkbench } from "@/modules/storage/curation";
import { badgeClass, badgeToneClass, curationLabel, curationStateLabel, T } from "@/lib/vi";
import { CurationWorkbench } from "@/app/components/curation-workbench";

// Screen: Assigned Source Task (`/source/task/:id`, user-screen-specs.md) —
// the assigned editor corrects text and refines the draft; raw text is the
// reference pane; approve/publish is out of reach here by design.
export default async function AssignedSourceTaskPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const { id } = await params;
  const wb = await orNotFound(() => getCurationWorkbench(actor, id));
  const readOnly = !(
    user.role === "admin_op" ||
    (user.role === "editor" && wb.curation?.assignedTo === user.id)
  );

  return (
    <main className="page">
      <h1>
        {T.assignedTask}: {wb.source.title}
      </h1>
      <p className="muted">
        {T.state}:{" "}
        {/* No curation row yet = the task is still unassigned, which is a
            `waiting` state even though no enum value has been written. */}
        <span
          className={
            wb.curation
              ? badgeClass(curationStateLabel, wb.curation.state)
              : badgeToneClass("waiting")
          }
        >
          {wb.curation ? curationLabel(wb.curation.state) : "Chưa giao việc"}
        </span>{" "}
        · <Link href={`/library/${wb.source.id}`}>Xem trong {T.library}</Link>
      </p>

      <div className="with-side">
        <div>
          <CurationWorkbench
            sourceId={wb.source.id}
            versionId={wb.version.id}
            curationState={wb.curation?.state ?? null}
            correctedLatest={wb.correctedLatest?.content ?? ""}
            draft={
              wb.draft
                ? {
                    contentMd: wb.draft.contentMd,
                    suggestedBranchId: wb.draft.suggestedBranchId,
                    version: wb.draft.version,
                  }
                : null
            }
            branches={wb.branches}
            readOnly={readOnly}
          />
        </div>
        <aside>
          <div className="panel">
            <h2>{T.rawText}</h2>
            {wb.chunks.length === 0 ? (
              <p className="muted">Chưa có văn bản trích xuất cho tư liệu này.</p>
            ) : (
              wb.chunks.map((c) => (
                <div key={c.id} className="stack-item">
                  <span className="badge muted">{c.refLabel}</span>
                  <pre className="raw-text">{c.content}</pre>
                </div>
              ))
            )}
          </div>
          <div className="panel">
            <h2>Ghi chú</h2>
            <p className="muted">
              Đã có {wb.correctedCount} bản hiệu đính. Khi hoàn tất, chọn “{T.markReady}” để chuyển
              cho Quản trị/Vận hành duyệt xuất bản.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
