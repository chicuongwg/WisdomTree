import { Crumbs } from "@/app/components/crumbs";
import { orNotFound, requireUser, toPrincipal } from "@/lib/page";
import { getSourceDetail, listFolders } from "@/modules/storage/service";
import { badgeToneClass, fileSize, T, when } from "@/lib/vi";
import { extractionDisplay, nextActionFor, nextActionLabel } from "@/lib/source-status";
import { listMentionCandidates } from "@/modules/notify/service";
import { CommentsSection } from "@/app/components/comments-section";
import { ExtractionWatcher } from "@/app/components/extraction-watcher";
import { SourceOwnerActions } from "@/app/components/source-owner-actions";
import { SourceFileActions } from "@/app/components/source-file-actions";
import { NominateSource } from "@/app/components/nominate-source";

// Static, not generateMetadata: naming the record in the tab would cost a
// second read of it on every detail view (the getters take a freshly built
// principal, so the request cache cannot dedupe the two calls). The kind of
// screen is what makes a browser history list usable again; the record's own
// name is already the h1.
export const metadata = { title: T.storedItem };

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
      <Crumbs items={[{ label: T.library, href: "/library" }]} />
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
              {/* Trust chip removed: it showed a state nothing writes. */}
              {v && (
                <>
                  <tr>
                    <th scope="row">{T.file}</th>
                    <td>
                      {v.originalFilename} <span className="muted">({fileSize(v.sizeBytes)})</span>
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">{T.storedAtLabel}</th>
                    <td>{when(v.storedAt)}</td>
                  </tr>
                  <tr>
                    <th scope="row">{T.extractionState}</th>
                    <td>
                      {(() => {
                        const ed = extractionDisplay(v.extractionStatus, v.hasText, v.mimeType);
                        return <span className={badgeToneClass(ed.tone)}>{ed.label}</span>;
                      })()}{" "}
                      {v.extractionStatus === "unprocessable" && (
                        <span className="muted">
                          Tệp gốc vẫn được lưu và tải xuống bình thường.
                        </span>
                      )}
                      {v.extractionStatus === "processed" && !v.hasText && (
                        <span className="muted">{T.extractionNoTextDetail}</span>
                      )}
                      <ExtractionWatcher sourceId={source.id} status={v.extractionStatus} />
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
        {/* What happens to this file next, in one member-facing sentence
            (functional-spec.md:57). */}
        <p className="muted">
          {
            nextActionLabel[
              nextActionFor({
                storageState: v?.storageState,
                extractionStatus: v?.extractionStatus,
                hasText: v?.hasText,
                curationState: source.curationState,
                curationAssigned: source.curationAssigned,
              })
            ]
          }
        </p>
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
        {v && !stored && <p className="muted">{T.sourceWithdrawnNotice}</p>}
      </div>
      {source.versions.length > 1 && (
        <div className="panel">
          <h2>{T.storedVersionsHeading}</h2>
          <div className="record-scroll">
            <table className="list">
              <thead>
                <tr>
                  <th scope="col">{T.versionColumn}</th>
                  <th scope="col">{T.file}</th>
                  <th scope="col">{T.uploader}</th>
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
      {canEdit && stored && (
        <NominateSource
          sourceId={source.id}
          nominated={Boolean(source.curationState)}
          canRevert={source.curationState !== "promoted"}
        />
      )}
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
