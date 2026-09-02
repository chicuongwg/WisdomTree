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
      <div className="ui-next-notes-page">
        <div className="ui-next-notes-header">
          <h2>{translate(locale, "notes.title")}</h2>
          {canCreateNote && onCreateClick ? (
            <Button type="button" variant="primary" onClick={onCreateClick}>
              {translate(locale, "notes.newNote")}
            </Button>
          ) : null}
        </div>
        <div className="ui-next-empty-state">
          <h3>{translate(locale, "notes.emptyTitle")}</h3>
          <p>{translate(locale, "notes.emptyDescription")}</p>
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
    <div className="ui-next-notes-page">
      <div className="ui-next-notes-header">
        <h2>
          {translate(locale, "notes.title")} ({items.length})
        </h2>
        {canCreateNote && onCreateClick ? (
          <Button type="button" variant="primary" onClick={onCreateClick}>
            {translate(locale, "notes.newNote")}
          </Button>
        ) : null}
      </div>

      <ul className="ui-next-notes-list" role="list">
        {items.map((item) => (
          <li key={item.id} className="ui-next-notes-item">
            <Link href={item.href} className="ui-next-notes-item__link">
              <div className="ui-next-notes-item__top">
                <h3 className="ui-next-notes-item__title">{item.title}</h3>
                <div className="ui-next-notes-item__badges">
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

              {item.summary ? <p className="ui-next-notes-item__summary">{item.summary}</p> : null}

              <div className="ui-next-notes-item__meta">
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
