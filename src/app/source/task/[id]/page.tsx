import Link from "next/link";
import { orNotFound, requireUser, toPrincipal } from "@/lib/page";
import { getCurationWorkbench } from "@/modules/storage/curation";
import { curationStateLabel, T } from "@/lib/vi";
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
        <span className="badge muted">
          {wb.curation ? curationStateLabel[wb.curation.state] : "Chưa giao việc"}
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
            <h2 style={{ marginTop: 0 }}>{T.rawText}</h2>
            {wb.chunks.length === 0 ? (
              <p className="muted">Chưa có văn bản trích xuất cho tư liệu này.</p>
            ) : (
              wb.chunks.map((c) => (
                <div key={c.id} style={{ marginBottom: "0.75rem" }}>
                  <span className="badge muted">{c.refLabel}</span>
                  <pre className="raw-text">{c.content}</pre>
                </div>
              ))
            )}
          </div>
          <div className="panel">
            <h2 style={{ marginTop: 0 }}>Ghi chú</h2>
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
