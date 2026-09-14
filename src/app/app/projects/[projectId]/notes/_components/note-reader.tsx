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
    <article className="ui-next-note-reader flex flex-col gap-6 max-w-[var(--ui-width-reading)] mx-auto w-full">
      <header className="ui-next-note-reader__header flex flex-col gap-3 border-b border-ui-border pb-4">
        <div className="ui-next-note-reader__top-bar flex items-center justify-between gap-4 flex-wrap">
          <div className="ui-next-note-reader__badges flex items-center gap-2 flex-wrap">
            <span className="ui-next-muted text-xs text-ui-text-muted">{projectName}</span>
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

          <div className="ui-next-note-reader__actions flex items-center gap-2 flex-wrap">
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

        <h1 className="ui-next-note-reader__title m-0 text-2xl font-bold text-ui-text leading-tight">
          {note.title}
        </h1>

        {note.summary ? (
          <p className="ui-next-note-reader__summary m-0 text-base text-ui-text-secondary leading-relaxed italic p-3 pl-4 bg-ui-surface-sunken border-l-4 border-ui-border-strong rounded-r">
            {note.summary}
          </p>
        ) : null}
      </header>

      <ResearchContent
        className="ui-next-note-reader__content leading-relaxed text-base text-ui-text"
        dir="auto"
      >
        <MarkdownView content={note.contentMd} dir="auto" />
      </ResearchContent>
    </article>
  );
}
