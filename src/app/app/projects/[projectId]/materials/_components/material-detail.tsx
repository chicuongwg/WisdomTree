"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { UiLocale } from "@/modules/auth/profile";
import {
  Button,
  MarkdownView,
  StatusBadge,
  formatUiDate,
  formatUiNumber,
  translate,
} from "@/app/components/ui-next";
import { CollaborationSection } from "@/app/components/ui-next/collaboration-section";

type MaterialDetailDto = {
  id: string;
  title: string;
  description: string | null;
  currentVersion: { id: string; seq: number } | null;
  versions: Array<{
    id: string;
    seq: number;
    originalFilename: string;
    mimeType: string;
    sizeBytes: number;
    storageState: "uploaded" | "stored" | "quarantined" | "archived";
    extractionStatus: "pending" | "processed" | "unprocessable";
    storedAt: Date | string | null;
    uploadedByName: string;
  }>;
  lineageNotes: Array<{
    sourceVersionId: string;
    sourceVersionSeq: number;
    noteId: string;
    title: string;
  }>;
  workingDrafts: Array<{
    sourceVersionId: string;
    sourceVersionSeq: number;
    draftId: string;
    title: string;
  }>;
  physical: {
    itemCode: string;
    author: string | null;
    location: string | null;
    copies: number;
    availableCopies: number;
  } | null;
};

type Candidate = { sourceVersionId: string; method: string; contentMd: string };

export function MaterialDetail({
  projectId,
  locale,
  material,
  canManageMaterial,
  canStewardMaterial,
  canManagePhysical,
  collaboration,
}: {
  projectId: string;
  locale: UiLocale;
  material: MaterialDetailDto;
  canManageMaterial: boolean;
  canStewardMaterial: boolean;
  canManagePhysical: boolean;
  collaboration: { mentionCandidates: Array<{ id: string; displayName: string }> } | null;
}) {
  const router = useRouter();
  const [selectedVersionId, setSelectedVersionId] = useState(
    material.currentVersion?.id ?? material.versions[0]?.id ?? "",
  );
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [pendingAction, setPendingAction] = useState<
    | "upload"
    | "review"
    | "retry"
    | "note"
    | "metadata"
    | "withdraw"
    | "reject"
    | "physical"
    | "archivePhysical"
    | null
  >(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedVersion = useMemo(
    () => material.versions.find((version) => version.id === selectedVersionId) ?? null,
    [material.versions, selectedVersionId],
  );
  const workingDraft = material.workingDrafts.find(
    (draft) => draft.sourceVersionId === selectedVersionId,
  );

  function extractionLabel(status: "pending" | "processed" | "unprocessable") {
    return translate(locale, `materials.extraction.${status}`);
  }

  async function uploadVersion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("upload");
    setMessage(null);
    try {
      const response = await fetch(
        `/api/app/projects/${encodeURIComponent(projectId)}/materials/${encodeURIComponent(material.id)}/versions`,
        {
          method: "POST",
          body: new FormData(event.currentTarget),
        },
      );
      if (!response.ok)
        throw new Error((await response.json().catch(() => ({}))).reason || "upload_failed");
      router.refresh();
    } catch {
      setMessage(translate(locale, "materials.error.upload"));
    } finally {
      setPendingAction(null);
    }
  }

  async function reviewExtraction() {
    if (!selectedVersion) return;
    setPendingAction("review");
    setMessage(null);
    try {
      const response = await fetch(
        `/api/app/projects/${encodeURIComponent(projectId)}/materials/${encodeURIComponent(material.id)}/versions/${encodeURIComponent(selectedVersion.id)}/candidate`,
      );
      if (!response.ok) throw new Error("candidate_unavailable");
      const body = (await response.json()) as { candidate: Candidate };
      setCandidate(body.candidate);
      setNoteTitle(material.title);
    } catch {
      setMessage(translate(locale, "materials.error.review"));
    } finally {
      setPendingAction(null);
    }
  }

  async function retryExtraction() {
    if (!selectedVersion) return;
    setPendingAction("retry");
    setMessage(null);
    try {
      const response = await fetch(
        `/api/app/projects/${encodeURIComponent(projectId)}/materials/${encodeURIComponent(material.id)}/versions/${encodeURIComponent(selectedVersion.id)}/extract`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ method: "auto" }),
        },
      );
      if (!response.ok) throw new Error("retry_failed");
      setMessage(translate(locale, "materials.retryQueued"));
      router.refresh();
    } catch {
      setMessage(translate(locale, "materials.error.retry"));
    } finally {
      setPendingAction(null);
    }
  }

  async function createNote() {
    if (!selectedVersion) return;
    setPendingAction("note");
    setMessage(null);
    try {
      const response = await fetch(
        `/api/app/projects/${encodeURIComponent(projectId)}/materials/${encodeURIComponent(material.id)}/versions/${encodeURIComponent(selectedVersion.id)}/note`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: noteTitle.trim() || undefined }),
        },
      );
      if (!response.ok)
        throw new Error((await response.json().catch(() => ({}))).reason || "note_failed");
      const body = (await response.json()) as { draft: { id: string } };
      router.push(
        `/app/projects/${encodeURIComponent(projectId)}/notes/${encodeURIComponent(body.draft.id)}`,
      );
    } catch {
      setMessage(translate(locale, "materials.error.note"));
    } finally {
      setPendingAction(null);
    }
  }

  async function saveMetadata(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("metadata");
    setMessage(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(
        `/api/app/projects/${encodeURIComponent(projectId)}/materials/${encodeURIComponent(material.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: form.get("title"), description: form.get("description") }),
        },
      );
      if (!response.ok) throw new Error("metadata_failed");
      router.refresh();
    } catch {
      setMessage(translate(locale, "materials.error.stewardship"));
    } finally {
      setPendingAction(null);
    }
  }

  async function withdrawMaterial() {
    setPendingAction("withdraw");
    setMessage(null);
    try {
      const response = await fetch(
        `/api/app/projects/${encodeURIComponent(projectId)}/materials/${encodeURIComponent(material.id)}/withdraw`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("withdraw_failed");
      router.refresh();
    } catch {
      setMessage(translate(locale, "materials.error.stewardship"));
    } finally {
      setPendingAction(null);
    }
  }

  async function rejectCandidate() {
    if (!selectedVersion) return;
    setPendingAction("reject");
    setMessage(null);
    try {
      const response = await fetch(
        `/api/app/projects/${encodeURIComponent(projectId)}/materials/${encodeURIComponent(material.id)}/versions/${encodeURIComponent(selectedVersion.id)}/candidate`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error("reject_failed");
      setCandidate(null);
      router.refresh();
    } catch {
      setMessage(translate(locale, "materials.error.review"));
    } finally {
      setPendingAction(null);
    }
  }

  async function savePhysical(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPendingAction("physical");
    setMessage(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(
        `/api/app/projects/${encodeURIComponent(projectId)}/materials/${encodeURIComponent(material.id)}/physical`,
        {
          method: material.physical ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            author: form.get("author"),
            location: form.get("location"),
            copies: form.get("copies"),
          }),
        },
      );
      if (!response.ok) throw new Error("physical_failed");
      router.refresh();
    } catch {
      setMessage(translate(locale, "materials.error.upload"));
    } finally {
      setPendingAction(null);
    }
  }

  async function archivePhysical() {
    setPendingAction("archivePhysical");
    setMessage(null);
    try {
      const response = await fetch(
        `/api/app/projects/${encodeURIComponent(projectId)}/materials/${encodeURIComponent(material.id)}/physical/archive`,
        { method: "POST" },
      );
      if (!response.ok) throw new Error("physical_archive_failed");
      router.refresh();
    } catch {
      setMessage(translate(locale, "materials.error.upload"));
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <section className="ui-next-material-detail" aria-labelledby="material-title">
      <Link
        href={`/app/projects/${encodeURIComponent(projectId)}/materials`}
        className="ui-next-material-detail__back"
      >
        {translate(locale, "materials.back")}
      </Link>
      <header className="ui-next-material-detail__header">
        <div>
          <p>{translate(locale, "materials.identity")}</p>
          <h2 id="material-title">{material.title}</h2>
          {material.description ? (
            <p className="ui-next-material-detail__description">{material.description}</p>
          ) : null}
        </div>
        <StatusBadge tone={material.currentVersion ? "success" : "neutral"}>
          {material.currentVersion
            ? translate(locale, "materials.status.hasSource")
            : translate(locale, "materials.status.registered")}
        </StatusBadge>
      </header>

      {canManageMaterial ? (
        <form className="ui-next-material-version-form" onSubmit={uploadVersion}>
          <label>
            <span>{translate(locale, "materials.addVersion")}</span>
            <input name="file" type="file" required />
          </label>
          <Button
            type="submit"
            variant="secondary"
            loading={pendingAction === "upload"}
            loadingLabel={translate(locale, "common.loading")}
          >
            {translate(locale, "materials.uploadVersion")}
          </Button>
        </form>
      ) : null}

      {canStewardMaterial ? (
        <section className="ui-next-material-panel" aria-labelledby="material-stewardship-title">
          <h3 id="material-stewardship-title">{translate(locale, "materials.stewardship")}</h3>
          <form className="ui-next-material-form" onSubmit={saveMetadata}>
            <label>
              <span>{translate(locale, "materials.field.title")}</span>
              <input name="title" defaultValue={material.title} required maxLength={300} />
            </label>
            <label>
              <span>{translate(locale, "materials.field.description")}</span>
              <textarea name="description" defaultValue={material.description ?? ""} rows={3} />
            </label>
            <div className="ui-next-material-form__actions">
              <Button
                type="submit"
                loading={pendingAction === "metadata"}
                loadingLabel={translate(locale, "common.loading")}
              >
                {translate(locale, "materials.saveMetadata")}
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={withdrawMaterial}
                loading={pendingAction === "withdraw"}
                loadingLabel={translate(locale, "common.loading")}
              >
                {translate(locale, "materials.withdraw")}
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      <div className="ui-next-material-detail__grid">
        <section className="ui-next-material-panel" aria-labelledby="material-versions-title">
          <h3 id="material-versions-title">{translate(locale, "materials.versions")}</h3>
          {material.versions.length === 0 ? (
            <p>{translate(locale, "materials.noDigitalVersion")}</p>
          ) : (
            <ul className="ui-next-material-versions">
              {material.versions.map((version) => (
                <li key={version.id}>
                  <button
                    type="button"
                    className="ui-next-material-version"
                    data-selected={version.id === selectedVersionId || undefined}
                    onClick={() => {
                      setSelectedVersionId(version.id);
                      setCandidate(null);
                      setMessage(null);
                    }}
                  >
                    <span>
                      {translate(locale, "materials.version.number", { number: version.seq })}
                    </span>
                    <strong>{version.originalFilename}</strong>
                    <small>
                      {version.mimeType} · {formatUiNumber(version.sizeBytes, locale)}{" "}
                      {translate(locale, "materials.bytes")}
                    </small>
                    <StatusBadge
                      tone={
                        version.extractionStatus === "unprocessable"
                          ? "warning"
                          : version.extractionStatus === "processed"
                            ? "success"
                            : "information"
                      }
                    >
                      {extractionLabel(version.extractionStatus)}
                    </StatusBadge>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="ui-next-material-panel" aria-labelledby="material-extraction-title">
          <h3 id="material-extraction-title">{translate(locale, "materials.extraction.title")}</h3>
          {selectedVersion ? (
            <>
              <p className="ui-next-material-detail__meta">
                {translate(locale, "materials.version.number", { number: selectedVersion.seq })} ·{" "}
                {selectedVersion.storedAt
                  ? formatUiDate(selectedVersion.storedAt, locale)
                  : translate(locale, "materials.dateUnavailable")}
              </p>
              <p>{translate(locale, "materials.extraction.derivedNotice")}</p>
              {selectedVersion.storageState === "stored" ? (
                <a
                  className="ui-next-material-detail__download"
                  href={`/api/app/projects/${encodeURIComponent(projectId)}/materials/${encodeURIComponent(material.id)}/versions/${encodeURIComponent(selectedVersion.id)}/download`}
                >
                  {translate(locale, "materials.downloadOriginal")}
                </a>
              ) : null}
              {workingDraft ? (
                <Link
                  href={`/app/projects/${encodeURIComponent(projectId)}/notes/${encodeURIComponent(workingDraft.draftId)}`}
                  className="ui-next-material-detail__continue-draft"
                >
                  {translate(locale, "materials.continueWorkingNote")}
                </Link>
              ) : null}
              {canManageMaterial &&
              selectedVersion.extractionStatus === "processed" &&
              !candidate ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={reviewExtraction}
                  loading={pendingAction === "review"}
                  loadingLabel={translate(locale, "common.loading")}
                >
                  {translate(locale, "materials.reviewExtraction")}
                </Button>
              ) : null}
              {canManageMaterial && selectedVersion.extractionStatus === "unprocessable" ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={retryExtraction}
                  loading={pendingAction === "retry"}
                  loadingLabel={translate(locale, "common.loading")}
                >
                  {translate(locale, "materials.retryExtraction")}
                </Button>
              ) : null}
              {candidate ? (
                <div className="ui-next-material-candidate">
                  <p>
                    <StatusBadge tone="warning">
                      {translate(locale, "materials.extraction.machineDerived")}
                    </StatusBadge>
                  </p>
                  <MarkdownView content={candidate.contentMd} />
                  <label>
                    <span>{translate(locale, "materials.noteTitle")}</span>
                    <input
                      value={noteTitle}
                      onChange={(event) => setNoteTitle(event.target.value)}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="primary"
                    onClick={createNote}
                    loading={pendingAction === "note"}
                    loadingLabel={translate(locale, "common.loading")}
                  >
                    {translate(locale, "materials.createProjectNote")}
                  </Button>
                  {canStewardMaterial ? (
                    <Button
                      type="button"
                      variant="danger"
                      onClick={rejectCandidate}
                      loading={pendingAction === "reject"}
                      loadingLabel={translate(locale, "common.loading")}
                    >
                      {translate(locale, "materials.rejectCandidate")}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <p>{translate(locale, "materials.noDigitalVersion")}</p>
          )}
          {message ? (
            <p className="ui-next-material-form__error" role="alert">
              {message}
            </p>
          ) : null}
        </section>
      </div>

      {canManagePhysical || material.physical ? (
        <section className="ui-next-material-panel" aria-labelledby="material-physical-title">
          <h3 id="material-physical-title">{translate(locale, "materials.physical.title")}</h3>
          <p>{translate(locale, "materials.physical.description")}</p>
          {material.physical ? (
            <p className="ui-next-material-detail__meta">
              {material.physical.itemCode} · {material.physical.availableCopies}/
              {material.physical.copies}
            </p>
          ) : null}
          {canManagePhysical ? (
            <form className="ui-next-material-form" onSubmit={savePhysical}>
              <label>
                <span>{translate(locale, "materials.physical.author")}</span>
                <input name="author" defaultValue={material.physical?.author ?? ""} />
              </label>
              <label>
                <span>{translate(locale, "materials.physical.location")}</span>
                <input name="location" defaultValue={material.physical?.location ?? ""} />
              </label>
              <label>
                <span>{translate(locale, "materials.physical.copies")}</span>
                <input
                  name="copies"
                  type="number"
                  min="1"
                  defaultValue={material.physical?.copies ?? 1}
                  required
                />
              </label>
              <div className="ui-next-material-form__actions">
                <Button
                  type="submit"
                  loading={pendingAction === "physical"}
                  loadingLabel={translate(locale, "common.loading")}
                >
                  {material.physical
                    ? translate(locale, "materials.physical.update")
                    : translate(locale, "materials.physical.add")}
                </Button>
                {material.physical ? (
                  <Button
                    type="button"
                    variant="danger"
                    onClick={archivePhysical}
                    loading={pendingAction === "archivePhysical"}
                    loadingLabel={translate(locale, "common.loading")}
                  >
                    {translate(locale, "materials.physical.archive")}
                  </Button>
                ) : null}
              </div>
            </form>
          ) : null}
        </section>
      ) : null}

      <section className="ui-next-material-panel" aria-labelledby="material-lineage-title">
        <h3 id="material-lineage-title">{translate(locale, "materials.lineage.title")}</h3>
        <p>{translate(locale, "materials.lineage.description")}</p>
        {material.lineageNotes.length ? (
          <ul className="ui-next-material-lineage" role="list">
            {material.lineageNotes.map((note) => (
              <li key={`${note.sourceVersionId}:${note.noteId}`}>
                <Link
                  href={`/app/projects/${encodeURIComponent(projectId)}/notes/${encodeURIComponent(note.noteId)}`}
                >
                  {note.title}
                </Link>
                <span>
                  {translate(locale, "materials.lineage.fromVersion", {
                    number: note.sourceVersionSeq,
                  })}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p>{translate(locale, "materials.lineage.empty")}</p>
        )}
      </section>
      {collaboration ? (
        <CollaborationSection
          locale={locale}
          members={collaboration.mentionCandidates}
          commentsUrl={`/api/app/projects/${encodeURIComponent(projectId)}/materials/${encodeURIComponent(material.id)}/comments`}
          presenceUrl={`/api/app/projects/${encodeURIComponent(projectId)}/materials/${encodeURIComponent(material.id)}/presence`}
        />
      ) : null}
    </section>
  );
}
