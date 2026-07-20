import { orNotFound, requireUser, toPrincipal } from "@/lib/page";
import { getSourceDetail } from "@/modules/storage/service";
import { listMentionableUsers } from "@/modules/notify/service";
import { extractionStateLabel, T, trustStateLabel } from "@/lib/vi";
import { CommentsSection } from "@/app/components/comments-section";

// Screen: Stored Item Detail (`/library/:id`) — member view: metadata and
// download only, never operational review internals (screen-inventory.md).
// The download button works even while extraction is `pending` (store-first).
export default async function StoredItemDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const source = await orNotFound(() => getSourceDetail(toPrincipal(user), id));
  const v = source.currentVersion;
  const mentionOptions = await listMentionableUsers();

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
                <span className="badge muted">{trustStateLabel(source.trustStatus)}</span>
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
                    <span className={`badge ${v.extractionStatus === "unprocessable" ? "warn" : v.extractionStatus === "pending" ? "muted" : ""}`}>
                      {extractionStateLabel(v.extractionStatus)}
                    </span>{" "}
                    {v.extractionStatus === "unprocessable" && (
                      <span className="muted">Tệp gốc vẫn được lưu và tải xuống bình thường.</span>
                    )}
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
      <CommentsSection anchorType="source" anchorId={source.id} mentionOptions={mentionOptions} />
    </main>
  );
}
