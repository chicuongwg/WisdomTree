"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { UiLocale } from "@/modules/auth/profile";
import type { DraftDto } from "@/modules/application";
import { Button, Dialog, Stack, TextField, translate } from "@/app/components/ui-next";
import { NoteList } from "./note-list";

export function NotesView({
  projectId,
  locale,
  notes,
  drafts,
  canCreateNote,
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
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch(`/api/app/projects/${encodeURIComponent(projectId)}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.reason || translate(locale, "error.internal.title"));
        return;
      }

      const data = (await res.json()) as { draft: DraftDto };
      setCreateOpen(false);
      router.push(
        `/app/projects/${encodeURIComponent(projectId)}/notes/${encodeURIComponent(data.draft.id)}`,
      );
    } catch {
      setError(translate(locale, "error.internal.title"));
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <>
      <NoteList
        projectId={projectId}
        locale={locale}
        notes={notes}
        drafts={drafts}
        canCreateNote={canCreateNote}
        onCreateClick={() => {
          setTitle("");
          setError(null);
          setCreateOpen(true);
        }}
      />

      <Dialog
        footer={
          <div className="ui-next-dialog-actions">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              {translate(locale, "common.cancel")}
            </Button>
            <Button
              type="submit"
              form="create-note"
              variant="primary"
              disabled={isCreating || !title.trim()}
            >
              {isCreating
                ? translate(locale, "notes.create.creating")
                : translate(locale, "notes.create.submit")}
            </Button>
          </div>
        }
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={translate(locale, "notes.create.title")}
        closeLabel={translate(locale, "common.close")}
      >
        <Stack as="form" gap="4" id="create-note" onSubmit={handleCreate}>
          <TextField
            id="create-note-title"
            type="text"
            label={translate(locale, "notes.field.title")}
            className="ui-next-note-editor__title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={translate(locale, "notes.field.titlePlaceholder")}
            autoFocus
            required
            error={error ?? undefined}
          />
        </Stack>
      </Dialog>
    </>
  );
}
