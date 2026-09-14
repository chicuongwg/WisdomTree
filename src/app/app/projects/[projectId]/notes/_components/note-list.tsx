import Link from "next/link";
import type { UiLocale } from "@/modules/auth/profile";
import type { DraftDto } from "@/modules/application";
import {
  Button,
  StatusBadge,
  translate,
  formatUiDate,
  type StatusTone,
} from "@/app/components/ui-next";

export interface NoteListItemData {
  id: string;
  href: string;
  title: string;
  summary: string | null;
  researchPurpose: "evidence" | "synthesis" | null;
  state: "official" | "draft_changes" | "new_draft";
  version: number;
  updatedAt: Date | string | null;
}

const stateTones: Record<NoteListItemData["state"], StatusTone> = {
  official: "neutral",
  draft_changes: "warning",
  new_draft: "information",
};

const purposeTones: Record<"evidence" | "synthesis", StatusTone> = {
  evidence: "information",
  synthesis: "success",
};

export function NoteList({
  projectId,
  locale,
  notes,
  drafts,
  canCreateNote,
  onCreateClick,
}: {
  projectId: string;
  locale: UiLocale;
  notes: Array<{
    id: string;
    projectId: string;
    title: string;
    summary: string | null;
    researchPurpose: "evidence" | "synthesis" | null;
    currentVersion: number;
    updatedAt: Date | string;
  }>;
  drafts: DraftDto[];
  canCreateNote: boolean;
  onCreateClick?: () => void;
}) {
  const items: NoteListItemData[] = [];

  // Standalone new private drafts
  for (const draft of drafts) {
    if (!draft.noteId) {
      items.push({
        id: draft.id,
        href: `/app/projects/${projectId}/notes/${draft.id}`,
        title: draft.title || translate(locale, "notes.untitled"),
        summary: draft.summary,
        researchPurpose: draft.researchPurpose,
        state: "new_draft",
        version: draft.version,
        updatedAt: null,
      });
    }
  }

  // Official notes (with or without matching author draft)
  for (const note of notes) {
    const matchingDraft = drafts.find((d) => d.noteId === note.id);
    items.push({
      id: note.id,
      href: `/app/projects/${projectId}/notes/${note.id}`,
      title: matchingDraft ? matchingDraft.title : note.title,
      summary: matchingDraft ? matchingDraft.summary : note.summary,
      researchPurpose: matchingDraft ? matchingDraft.researchPurpose : note.researchPurpose,
      state: matchingDraft ? "draft_changes" : "official",
      version: note.currentVersion,
      updatedAt: note.updatedAt,
    });
  }

  if (items.length === 0) {
    return (
      <div className="ui-next-notes-page flex flex-col gap-6">
        <div className="ui-next-notes-header flex items-center justify-between gap-4 flex-wrap">
          <h2 className="m-0 text-xl font-bold text-ui-text">{translate(locale, "notes.title")}</h2>
          {canCreateNote && onCreateClick ? (
            <Button type="button" variant="primary" onClick={onCreateClick}>
              {translate(locale, "notes.newNote")}
            </Button>
          ) : null}
        </div>
        <div className="ui-next-empty-state flex flex-col items-center justify-center p-12 text-center bg-ui-surface border border-dashed border-ui-border rounded-lg gap-3">
          <h3 className="m-0 text-lg font-semibold text-ui-text">
            {translate(locale, "notes.emptyTitle")}
          </h3>
          <p className="m-0 text-sm text-ui-text-secondary max-w-md">
            {translate(locale, "notes.emptyDescription")}
          </p>
          {canCreateNote && onCreateClick ? (
            <Button type="button" variant="primary" onClick={onCreateClick}>
              {translate(locale, "notes.createFirstNote")}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="ui-next-notes-page flex flex-col gap-6">
      <div className="ui-next-notes-header flex items-center justify-between gap-4 flex-wrap">
        <h2 className="m-0 text-xl font-bold text-ui-text">
          {translate(locale, "notes.title")} ({items.length})
        </h2>
        {canCreateNote && onCreateClick ? (
          <Button type="button" variant="primary" onClick={onCreateClick}>
            {translate(locale, "notes.newNote")}
          </Button>
        ) : null}
      </div>

      <ul className="ui-next-notes-list flex flex-col gap-3 list-none m-0 p-0" role="list">
        {items.map((item) => (
          <li
            key={item.id}
            className="ui-next-notes-item bg-ui-surface border border-ui-border rounded-lg p-4 transition-all hover:border-ui-border-strong hover:shadow-sm"
          >
            <Link
              href={item.href}
              className="ui-next-notes-item__link flex flex-col gap-2 no-underline text-inherit focus-visible:outline-2 focus-visible:outline-ui-focus focus-visible:outline-offset-2 rounded"
            >
              <div className="ui-next-notes-item__top flex items-center justify-between gap-3 flex-wrap">
                <h3 className="ui-next-notes-item__title m-0 text-lg font-semibold text-ui-text">
                  {item.title}
                </h3>
                <div className="ui-next-notes-item__badges flex items-center gap-2 flex-wrap">
                  {item.researchPurpose ? (
                    <StatusBadge tone={purposeTones[item.researchPurpose]}>
                      {translate(locale, `notes.purpose.${item.researchPurpose}`)}
                    </StatusBadge>
                  ) : null}
                  <StatusBadge tone={stateTones[item.state]}>
                    {translate(locale, `notes.state.${item.state}`)}
                  </StatusBadge>
                </div>
              </div>

              {item.summary ? (
                <p className="ui-next-notes-item__summary m-0 text-ui-text-secondary text-sm leading-relaxed line-clamp-2">
                  {item.summary}
                </p>
              ) : null}

              <div className="ui-next-notes-item__meta flex items-center gap-4 text-xs text-ui-text-muted">
                <span>
                  {translate(locale, "notes.inspector.version")} {item.version}
                </span>
                {item.updatedAt ? (
                  <span>
                    {translate(locale, "notes.inspector.updatedAt")}:{" "}
                    {formatUiDate(item.updatedAt, locale)}
                  </span>
                ) : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
