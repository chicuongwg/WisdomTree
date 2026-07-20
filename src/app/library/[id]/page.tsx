import { orNotFound, requireUser, toPrincipal } from "@/lib/page";
import { getSourceDetail, listFolders } from "@/modules/storage/service";
import {
  badgeClass,
  extractionLabel,
  extractionStateLabel,
  T,
  trustLabel,
  trustStateLabel,
  when,
} from "@/lib/vi";
import { listMentionCandidates } from "@/modules/notify/service";
import { CommentsSection } from "@/app/components/comments-section";
import { ExtractionWatcher } from "@/app/components/extraction-watcher";
import { SourceOwnerActions } from "@/app/components/source-owner-actions";
import { SourceFileActions } from "@/app/components/source-file-actions";

// Screen: Stored Item Detail (`/library/:id`) — member view: metadata and
// download only, never operational review internals (screen-inventory.md).
// The download button works even while extraction is `pending` (store-first).
export default async function StoredItemDetail({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const actor = toPrincipal(user);
  const source = await orNotFound(() => getSourceDetail(actor, id));
  const v = source.currentVersion;
  const stored = v?.storageState === "stored";
  const canEdit = source.submittedBy === user.id || user.role === "admin_op";
  // The move select needs the space's folders; only fetched when someone who
  // can move is looking at a movable item.
  const folders = canEdit && stored ? await listFolders(actor, source.spaceId) : [];
  const downloadUrl = `/api/source/${source.id}/download`;

  return (
    <main className="page">
      <h1>{source.title}</h1>
      <div className="panel">
        <div className="record-scroll">
          <table className="list">
            <tbody>
              <tr>
                <th scope="row">{T.space}</th>
                <td>{source.spaceName}</td>
              </tr>
              {source.description && (
                <tr>
                  <th scope="row">{T.description}</th>
                  <td>{source.description}</td>
                </tr>
              )}
              <tr>
                <th scope="row">Độ tin cậy</th>
                <td>
                  <span className={badgeClass(trustLabel, source.trustStatus)}>
                    {trustStateLabel(source.trustStatus)}
                  </span>
                </td>
              </tr>
              {v && (
                <>
                  <tr>
                    <th scope="row">{T.file}</th>
                    <td>
                      {v.originalFilename} <span className="muted">({Math.max(1, Math.round(v.sizeBytes / 1024))} KB)</span>
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">{T.storedAtLabel}</th>
                    <td>{when(v.storedAt)}</td>
                  </tr>
                  <tr>
                    <th scope="row">Trạng thái xử lý</th>
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
        </div>
        {/* Preview in place for what the browser can render; the token URL is
            the same authorized 302 the download uses — never a public path. */}
        {v && stored && v.mimeType.startsWith("image/") && (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="preview-image" src={downloadUrl} alt={source.title} />
        )}
        {v && stored && v.mimeType === "application/pdf" && (
          <iframe className="preview-frame" src={downloadUrl} title={source.title} />
        )}
        {v && stored && (
          <p>
            <a className="button" href={downloadUrl}>
              {T.download}
            </a>
          </p>
        )}
        {v && !stored && (
          // TODO(vi): move to src/lib/vi.ts
          <p className="muted">Tư liệu đã được thu hồi — không tải xuống được.</p>
        )}
      </div>
      {source.versions.length > 1 && (
        <div className="panel">
          {/* TODO(vi): move to src/lib/vi.ts */}
          <h2>Các bản đã lưu</h2>
          <div className="record-scroll">
            <table className="list">
              <thead>
                <tr>
                  {/* TODO(vi): move to src/lib/vi.ts */}
                  <th scope="col">Bản</th>
                  <th scope="col">{T.file}</th>
                  <th scope="col">Người tải lên</th>
                  <th scope="col">{T.storedAtLabel}</th>
                </tr>
              </thead>
              <tbody>
                {source.versions.map((ver) => (
                  <tr key={ver.seq}>
                    <td>
                      {ver.seq}
                      {ver.seq === v?.seq && <span className="muted"> (hiện tại)</span>}
                    </td>
                    <td>{ver.filename}</td>
                    <td>{ver.uploadedByName}</td>
                    <td>{when(ver.storedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <SourceFileActions
        sourceId={source.id}
        folderId={source.folderId}
        folders={folders}
        archived={Boolean(v && !stored)}
        canEdit={canEdit && stored}
        canRestore={user.role === "admin_op" && v?.storageState === "archived"}
      />
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
      <CommentsSection
            anchorType="source"
            anchorId={source.id}
            members={await listMentionCandidates("source", source.id)}
          />
    </main>
  );
}
