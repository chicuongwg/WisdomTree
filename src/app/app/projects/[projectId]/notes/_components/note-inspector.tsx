"use client";

import { useState } from "react";
import Link from "next/link";
import type { UiLocale } from "@/modules/auth/profile";
import type { NotePublicationStatus } from "@/modules/publication/service";
import {
  Button,
  Dialog,
  Drawer,
  StatusBadge,
  translate,
  type StatusTone,
} from "@/app/components/ui-next";

export interface AttachedSourceVersion {
  sourceVersionId: string;
  sourceId: string;
  title: string;
  seq: number;
  projectId: string;
}

export interface AttachedNoteVersion {
  noteVersionId: string;
  nodeId?: string;
  supportingNodeId?: string;
  title: string | null;
  seq: number;
  projectId: string;
}

export interface NoteInspectorProps {
  open: boolean;
  onClose: () => void;
  locale: UiLocale;
  projectName: string;
  isDraft: boolean;
  canEditDraft?: boolean;
  version: number;
  officialVersion?: number | null;
  researchPurpose: "evidence" | "synthesis" | null;
  publication?: NotePublicationStatus | null;
  projectId?: string;
  noteId?: string;
  canPublish?: boolean;
  onPublicationUpdated?: () => void;
  tags?: string[];
  isDrawer?: boolean;
  evidence: {
    snapshotStatus?: "complete" | "unknown";
    sourceVersions: AttachedSourceVersion[];
    noteVersions: AttachedNoteVersion[];
  };
  onOpenEvidencePicker?: () => void;
  onRemoveSourceVersion?: (sourceVersionId: string) => Promise<void>;
  onRemoveNoteVersion?: (noteVersionId: string) => Promise<void>;
  provenance?: {
    snapshotStatus: "complete" | "unknown";
    supportingMaterials: Array<{
      material: { id: string; title: string };
      materialVersion: { id: string; version: number };
      project: { id: string };
      activities: Array<{
        id: string;
        title: string;
        project: { id: string; name: string };
        people: Array<{ id: string; displayName: string; roleLabel: string | null }>;
      }>;
    }>;
    supportingNotes: Array<{
      note: { id: string; title: string | null };
      noteVersion: { id: string; version: number };
      project: { id: string };
      activities: Array<{
        id: string;
        title: string;
        project: { id: string; name: string };
        people: Array<{ id: string; displayName: string; roleLabel: string | null }>;
      }>;
    }>;
  } | null;
}

const publicationTones: Record<NotePublicationStatus["state"], StatusTone> = {
  never_published: "neutral",
  published_current: "published",
  published_with_changes: "warning",
  unpublished: "danger",
};

const purposeTones: Record<"evidence" | "synthesis", StatusTone> = {
  evidence: "evidence",
  synthesis: "synthesis",
};

export function NoteInspectorContent({
  locale,
  projectName,
  isDraft,
  canEditDraft,
  version,
  officialVersion,
  researchPurpose,
  publication,
  projectId,
  noteId,
  canPublish,
  onPublicationUpdated,
  tags,
  evidence,
  onOpenEvidencePicker,
  onRemoveSourceVersion,
  onRemoveNoteVersion,
  provenance,
}: Omit<NoteInspectorProps, "open" | "onClose" | "isDrawer">) {
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleRemoveSource(id: string) {
    if (!onRemoveSourceVersion) return;
    setRemovingId(id);
    try {
      await onRemoveSourceVersion(id);
    } finally {
      setRemovingId(null);
    }
  }

  async function handleRemoveNote(id: string) {
    if (!onRemoveNoteVersion) return;
    setRemovingId(id);
    try {
      await onRemoveNoteVersion(id);
    } finally {
      setRemovingId(null);
    }
  }

  const hasEvidence = evidence.sourceVersions.length > 0 || evidence.noteVersions.length > 0;

  return (
    <>
      <section className="ui-next-note-inspector__section">
        <h4 className="ui-next-note-inspector__section-title">
          {translate(locale, "notes.inspector.context")}
        </h4>
        <div className="ui-next-note-inspector__meta-item">
          <span className="ui-next-note-inspector__meta-label">
            {translate(locale, "nav.projects")}
          </span>
          <span>{projectName}</span>
        </div>
        <div className="ui-next-note-inspector__meta-item">
          <span className="ui-next-note-inspector__meta-label">
            {translate(locale, "notes.inspector.title")}
          </span>
          <StatusBadge tone={isDraft ? "information" : "neutral"}>
            {translate(locale, isDraft ? "notes.state.new_draft" : "notes.state.official")}
          </StatusBadge>
        </div>
        <div className="ui-next-note-inspector__meta-item">
          <span className="ui-next-note-inspector__meta-label">
            {translate(locale, "notes.purpose.label")}
          </span>
          {researchPurpose ? (
            <StatusBadge tone={purposeTones[researchPurpose]}>
              {translate(locale, `notes.purpose.${researchPurpose}`)}
            </StatusBadge>
          ) : (
            <span className="ui-next-muted">{translate(locale, "notes.purpose.unspecified")}</span>
          )}
        </div>
      </section>

      <section className="ui-next-note-inspector__section">
        <h4 className="ui-next-note-inspector__section-title">
          {translate(locale, "notes.inspector.metadata")}
        </h4>
        {officialVersion !== undefined && officialVersion !== null ? (
          <div className="ui-next-note-inspector__meta-item">
            <span className="ui-next-note-inspector__meta-label">
              {translate(locale, "notes.inspector.officialVersion")}
            </span>
            <span>v{officialVersion}</span>
          </div>
        ) : null}
        <div className="ui-next-note-inspector__meta-item">
          <span className="ui-next-note-inspector__meta-label">
            {isDraft
              ? translate(locale, "notes.inspector.draftVersion")
              : translate(locale, "notes.inspector.version")}
          </span>
          <span>v{version}</span>
        </div>
        {tags && tags.length > 0 ? (
          <div className="ui-next-note-inspector__meta-item">
            <span className="ui-next-note-inspector__meta-label">Tags</span>
            <span>{tags.join(", ")}</span>
          </div>
        ) : null}
      </section>

      {publication ? (
        <section className="ui-next-note-inspector__section">
          <h4 className="ui-next-note-inspector__section-title">
            {translate(locale, "notes.inspector.publication")}
          </h4>
          <div className="ui-next-note-inspector__meta-item">
            <span className="ui-next-note-inspector__meta-label">
              {translate(locale, "notes.inspector.publication")}
            </span>
            <StatusBadge tone={publicationTones[publication.state]}>
              {translate(locale, `notes.publication.${publication.state}`)}
            </StatusBadge>
          </div>
          {publication.slug ? (
            <div className="ui-next-note-inspector__meta-item">
              <span className="ui-next-note-inspector__meta-label">
                {translate(locale, "notes.publication.publicUrl")}
              </span>
              <Link href={`/p/${publication.slug}`} className="ui-next-note-inspector__url">
                /p/{publication.slug}
              </Link>
            </div>
          ) : null}
          {canPublish && projectId && noteId && onPublicationUpdated ? (
            <PublicationActions
              locale={locale}
              projectId={projectId}
              noteId={noteId}
              publication={publication}
              onPublicationUpdated={onPublicationUpdated}
            />
          ) : null}
        </section>
      ) : null}

      <section className="ui-next-note-inspector__section">
        <div className="ui-next-note-inspector__section-header">
          <h4 className="ui-next-note-inspector__section-title">
            {translate(locale, "notes.evidence.title")}
          </h4>
          {canEditDraft && onOpenEvidencePicker ? (
            <Button type="button" variant="secondary" onClick={onOpenEvidencePicker}>
              {translate(locale, "notes.evidence.add")}
            </Button>
          ) : null}
        </div>

        {evidence.snapshotStatus === "unknown" ? (
          <p className="ui-next-muted m-0 text-sm">
            {translate(locale, "notes.evidence.historyUnknown")}
          </p>
        ) : !hasEvidence ? (
          <p className="ui-next-muted m-0 text-sm">{translate(locale, "notes.evidence.empty")}</p>
        ) : (
          <div className="ui-next-note-inspector__evidence-content">
            {evidence.sourceVersions.length > 0 ? (
              <div className="ui-next-note-inspector__evidence-group">
                <h5 className="ui-next-note-inspector__evidence-subtitle">
                  {translate(locale, "notes.evidence.materials")}
                </h5>
                <ul className="ui-next-note-inspector__evidence-list">
                  {evidence.sourceVersions.map((item) => (
                    <li
                      key={item.sourceVersionId}
                      className="ui-next-note-inspector__evidence-item"
                    >
                      <div className="ui-next-note-inspector__evidence-info">
                        <span className="ui-next-note-inspector__evidence-name" dir="auto">
                          {item.title ?? "—"}
                        </span>
                        <div className="ui-next-note-inspector__evidence-meta">
                          <StatusBadge tone="neutral">v{item.seq}</StatusBadge>
                        </div>
                      </div>
                      {canEditDraft && onRemoveSourceVersion ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleRemoveSource(item.sourceVersionId)}
                          disabled={removingId === item.sourceVersionId}
                          aria-label={`${translate(locale, "notes.evidence.remove")} ${item.title}`}
                        >
                          {removingId === item.sourceVersionId
                            ? translate(locale, "notes.evidence.removing")
                            : translate(locale, "notes.evidence.remove")}
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {evidence.noteVersions.length > 0 ? (
              <div className="ui-next-note-inspector__evidence-group">
                <h5 className="ui-next-note-inspector__evidence-subtitle">
                  {translate(locale, "notes.evidence.notes")}
                </h5>
                <ul className="ui-next-note-inspector__evidence-list">
                  {evidence.noteVersions.map((item) => (
                    <li key={item.noteVersionId} className="ui-next-note-inspector__evidence-item">
                      <div className="ui-next-note-inspector__evidence-info">
                        <span className="ui-next-note-inspector__evidence-name" dir="auto">
                          {item.title ?? "—"}
                        </span>
                        <div className="ui-next-note-inspector__evidence-meta">
                          <StatusBadge tone="information">v{item.seq}</StatusBadge>
                        </div>
                      </div>
                      {canEditDraft && onRemoveNoteVersion ? (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => handleRemoveNote(item.noteVersionId)}
                          disabled={removingId === item.noteVersionId}
                          aria-label={`${translate(locale, "notes.evidence.remove")} ${item.title ?? "—"}`}
                        >
                          {removingId === item.noteVersionId
                            ? translate(locale, "notes.evidence.removing")
                            : translate(locale, "notes.evidence.remove")}
                        </Button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {!isDraft && provenance ? (
        <section className="ui-next-note-inspector__section">
          <h4 className="ui-next-note-inspector__section-title">
            {translate(locale, "provenance.title")}
          </h4>
          {provenance.snapshotStatus === "unknown" ? (
            <p className="ui-next-muted">{translate(locale, "notes.evidence.historyUnknown")}</p>
          ) : (
            <div className="ui-next-note-inspector__evidence-content">
              {provenance.supportingMaterials.map((item) => (
                <div
                  key={item.materialVersion.id}
                  className="ui-next-note-inspector__evidence-group"
                >
                  <Link
                    href={`/app/projects/${item.project.id}/materials/${item.material.id}`}
                    className="ui-next-note-inspector__evidence-name"
                  >
                    {item.material.title} · v{item.materialVersion.version}
                  </Link>
                  <ActivityContexts locale={locale} contexts={item.activities} />
                </div>
              ))}
              {provenance.supportingNotes.map((item) => (
                <div key={item.noteVersion.id} className="ui-next-note-inspector__evidence-group">
                  <Link
                    href={`/app/projects/${item.project.id}/notes/${item.note.id}`}
                    className="ui-next-note-inspector__evidence-name"
                  >
                    {item.note.title ?? "—"} · v{item.noteVersion.version}
                  </Link>
                  <ActivityContexts locale={locale} contexts={item.activities} />
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </>
  );
}

function PublicationActions({
  locale,
  projectId,
  noteId,
  publication,
  onPublicationUpdated,
}: {
  locale: UiLocale;
  projectId: string;
  noteId: string;
  publication: NotePublicationStatus;
  onPublicationUpdated: () => void;
}) {
  const [intent, setIntent] = useState<"publish" | "unpublish" | null>(null);
  const [publicSlug, setPublicSlug] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const publishLabel =
    publication.state === "published_with_changes"
      ? translate(locale, "notes.publication.publishChanges")
      : translate(locale, "notes.publication.publish");

  async function submit() {
    if (!intent) return;
    setPending(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/app/projects/${encodeURIComponent(projectId)}/notes/${encodeURIComponent(noteId)}/publication`,
        {
          method: intent === "publish" ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json" },
          ...(intent === "publish" ? { body: JSON.stringify({ publicSlug }) } : {}),
        },
      );
      if (!response.ok) throw new Error("publication_failed");
      setIntent(null);
      onPublicationUpdated();
    } catch {
      setError(translate(locale, "notes.publication.actionFailed"));
    } finally {
      setPending(false);
    }
  }

  const canPublish = publication.state !== "published_current";
  const canUnpublish =
    publication.state === "published_current" || publication.state === "published_with_changes";

  return (
    <div className="ui-next-note-inspector__publication-actions">
      {publication.revisionNumber ? (
        <span className="ui-next-muted">
          {translate(locale, "notes.publication.revision", { number: publication.revisionNumber })}
        </span>
      ) : null}
      {canPublish ? (
        <Button type="button" variant="secondary" onClick={() => setIntent("publish")}>
          {publishLabel}
        </Button>
      ) : null}
      {canUnpublish ? (
        <Button type="button" variant="danger" onClick={() => setIntent("unpublish")}>
          {translate(locale, "notes.publication.unpublish")}
        </Button>
      ) : null}
      <Dialog
        open={intent !== null}
        onClose={() => {
          if (!pending) setIntent(null);
        }}
        title={translate(
          locale,
          intent === "unpublish"
            ? "notes.publication.unpublishTitle"
            : "notes.publication.publishTitle",
        )}
        description={translate(
          locale,
          intent === "unpublish"
            ? "notes.publication.unpublishDescription"
            : "notes.publication.publishDescription",
        )}
        closeLabel={translate(locale, "common.close")}
      >
        {intent === "publish" && publication.state === "never_published" ? (
          <label className="ui-next-field">
            <span className="ui-next-field__label">
              {translate(locale, "notes.publication.slug")}
            </span>
            <input
              className="ui-next-control"
              value={publicSlug}
              onChange={(event) => setPublicSlug(event.target.value)}
              maxLength={120}
            />
          </label>
        ) : null}
        {error ? (
          <p className="ui-next-field__error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="ui-next-note-inspector__publication-dialog-actions">
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => setIntent(null)}
          >
            {translate(locale, "common.cancel")}
          </Button>
          <Button
            type="button"
            variant={intent === "unpublish" ? "danger" : "primary"}
            loading={pending}
            loadingLabel={translate(locale, "common.loading")}
            onClick={submit}
          >
            {intent === "unpublish"
              ? translate(locale, "notes.publication.confirmUnpublish")
              : translate(locale, "notes.publication.confirmPublish")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

function ActivityContexts({
  locale,
  contexts,
}: {
  locale: UiLocale;
  contexts: Array<{
    id: string;
    title: string;
    project: { id: string; name: string };
    people: Array<{ id: string; displayName: string; roleLabel: string | null }>;
  }>;
}) {
  return contexts.length ? (
    <ul className="ui-next-note-inspector__evidence-list">
      {contexts.map((activity) => (
        <li key={activity.id}>
          <strong>{translate(locale, "provenance.activityContext")}: </strong>
          <Link href={`/app/projects/${activity.project.id}/activities/${activity.id}`}>
            {activity.title}
          </Link>
          {activity.people.length
            ? ` — ${activity.people.map((person) => person.displayName).join(", ")}`
            : ""}
        </li>
      ))}
    </ul>
  ) : (
    <p className="ui-next-muted">{translate(locale, "provenance.noActivityContext")}</p>
  );
}

export function NoteInspector(props: NoteInspectorProps) {
  if (!props.open) return null;

  if (props.isDrawer) {
    return (
      <Drawer
        open={props.open}
        onClose={props.onClose}
        title={translate(props.locale, "notes.inspector.title")}
        closeLabel={translate(props.locale, "common.close")}
      >
        <div className="ui-next-note-inspector ui-next-note-inspector--drawer">
          <NoteInspectorContent {...props} />
        </div>
      </Drawer>
    );
  }

  return (
    <aside
      className="ui-next-note-inspector"
      aria-label={translate(props.locale, "notes.inspector.title")}
    >
      <header className="ui-next-note-inspector__header">
        <h3 className="ui-next-note-inspector__title">
          {translate(props.locale, "notes.inspector.title")}
        </h3>
        <Button
          type="button"
          variant="ghost"
          onClick={props.onClose}
          aria-label={translate(props.locale, "common.close")}
        >
          ✕
        </Button>
      </header>
      <NoteInspectorContent {...props} />
    </aside>
  );
}
