"use client";

import { useState } from "react";
import type { UiLocale } from "@/modules/auth/profile";
import type { NotePublicationStatus } from "@/modules/publication/service";
import { Button, Drawer, StatusBadge, translate, type StatusTone } from "@/app/components/ui-next";

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
  title: string;
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
}

const publicationTones: Record<NotePublicationStatus["state"], StatusTone> = {
  never_published: "neutral",
  published_current: "success",
  published_with_changes: "warning",
  unpublished: "danger",
};

const purposeTones: Record<"evidence" | "synthesis", StatusTone> = {
  evidence: "information",
  synthesis: "success",
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
  tags,
  evidence,
  onOpenEvidencePicker,
  onRemoveSourceVersion,
  onRemoveNoteVersion,
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
              <span className="ui-next-note-inspector__url">/p/{publication.slug}</span>
            </div>
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
          <p className="ui-next-muted" style={{ margin: 0, fontSize: "var(--ui-font-size-sm)" }}>
            {translate(locale, "notes.evidence.historyUnknown")}
          </p>
        ) : !hasEvidence ? (
          <p className="ui-next-muted" style={{ margin: 0, fontSize: "var(--ui-font-size-sm)" }}>
            {translate(locale, "notes.evidence.empty")}
          </p>
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
                          {item.title}
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
                          {item.title}
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
                          aria-label={`${translate(locale, "notes.evidence.remove")} ${item.title}`}
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
    </>
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
