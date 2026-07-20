import { orNotFound, requireUser, toPrincipal } from "@/lib/page";
import { getSourceDetail } from "@/modules/storage/service";
import {
  badgeClass,
  extractionLabel,
  extractionStateLabel,
  T,
  trustLabel,
  trustStateLabel,
} from "@/lib/vi";
import { CommentsSection } from "@/app/components/comments-section";
import { ExtractionWatcher } from "@/app/components/extraction-watcher";
import { SourceOwnerActions } from "@/app/components/source-owner-actions";

// Screen: Stored Item Detail (`/library/:id`) — member view: metadata and
// download only, never operational review internals (screen-inventory.md).
// The download button works even while extraction is `pending` (store-first).
export default async function StoredItemDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const source = await orNotFound(() => getSourceDetail(toPrincipal(user), id));
  const v = source.currentVersion;

  return (
    <main className="page">
      <h1>{source.title}</h1>
      <div className="panel">
        <table className="list">
          <tbody>
            <tr>
              <th>{T.space}</th>
              <td>{source.spaceName}</td>
            </tr>
            {source.description && (
              <tr>
                <th>{T.description}</th>
                <td>{source.description}</td>
              </tr>
            )}
            <tr>
              <th>Độ tin cậy</th>
              <td>
                <span className={badgeClass(trustLabel, source.trustStatus)}>
                  {trustStateLabel(source.trustStatus)}
                </span>
              </td>
            </tr>
            {v && (
              <>
                <tr>
                  <th>{T.file}</th>
                  <td>
                    {v.originalFilename} <span className="muted">({Math.max(1, Math.round(v.sizeBytes / 1024))} KB)</span>
                  </td>
                </tr>
                <tr>
                  <th>{T.storedAtLabel}</th>
                  <td>{v.storedAt?.toLocaleString("vi-VN")}</td>
                </tr>
                <tr>
                  <th>Trạng thái xử lý</th>
                  <td>
                    <span className={badgeClass(extractionLabel, v.extractionStatus)}>
                      {extractionStateLabel(v.extractionStatus)}
                    </span>{" "}
                    {v.extractionStatus === "unprocessable" && (
                      <span className="muted">Tệp gốc vẫn được lưu và tải xuống bình thường.</span>
                    )}
                    <ExtractionWatcher sourceId={source.id} status={v.extractionStatus} />
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
        {v && (
          <p>
            <a className="button" href={`/api/source/${source.id}/download`}>
              {T.download}
            </a>
          </p>
        )}
      </div>
      {/* Owner-only: the server enforces this too (storage.source.manage is
          owned-or-assigned), this just keeps the controls off other people's
          screens. Admin/Op passes the same check on role. */}
      {(source.submittedBy === user.id || user.role === "admin_op") && (
        <SourceOwnerActions
          sourceId={source.id}
          title={source.title}
          description={source.description}
        />
      )}
      <CommentsSection anchorType="source" anchorId={source.id} />
    </main>
  );
}
