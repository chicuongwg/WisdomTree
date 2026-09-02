import type { UiLocale } from "@/modules/auth/profile";
import type { NotePublicationStatus } from "@/modules/publication/service";
import {
  Button,
  ResearchContent,
  MarkdownView,
  StatusBadge,
  translate,
  type StatusTone,
} from "@/app/components/ui-next";

export interface NoteReaderProps {
  locale: UiLocale;
  projectName: string;
  note: {
    id: string;
    title: string;
    summary: string | null;
    contentMd: string;
    researchPurpose: "evidence" | "synthesis" | null;
    currentVersion: number;
    publication: NotePublicationStatus;
  };
  canEdit: boolean;
  onEditClick: () => void;
  onToggleInspector: () => void;
  onToggleFocus: () => void;
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

export function NoteReader({
  locale,
  projectName,
  note,
  canEdit,
  onEditClick,
  onToggleInspector,
  onToggleFocus,
}: NoteReaderProps) {
  return (
    <article className="ui-next-note-reader">
      <header className="ui-next-note-reader__header">
        <div className="ui-next-note-reader__top-bar">
          <div className="ui-next-note-reader__badges">
            <span className="ui-next-muted">{projectName}</span>
            <StatusBadge tone="neutral">
              {translate(locale, "notes.state.official")} v{note.currentVersion}
            </StatusBadge>
            {note.researchPurpose ? (
              <StatusBadge tone={purposeTones[note.researchPurpose]}>
                {translate(locale, `notes.purpose.${note.researchPurpose}`)}
              </StatusBadge>
            ) : null}
            <StatusBadge tone={publicationTones[note.publication.state]}>
              {translate(locale, `notes.publication.${note.publication.state}`)}
            </StatusBadge>
          </div>

          <div className="ui-next-note-reader__actions">
            {canEdit ? (
              <Button type="button" variant="primary" onClick={onEditClick}>
                {translate(locale, "notes.action.edit")}
              </Button>
            ) : null}
            <Button type="button" variant="secondary" onClick={onToggleFocus}>
              {translate(locale, "notes.action.focusMode")}
            </Button>
            <Button type="button" variant="ghost" onClick={onToggleInspector}>
              {translate(locale, "notes.action.inspector")}
            </Button>
          </div>
        </div>

        <h1 className="ui-next-note-reader__title">{note.title}</h1>

        {note.summary ? <p className="ui-next-note-reader__summary">{note.summary}</p> : null}
      </header>

      <ResearchContent className="ui-next-note-reader__content" dir="auto">
        <MarkdownView content={note.contentMd} dir="auto" />
      </ResearchContent>
    </article>
  );
}
