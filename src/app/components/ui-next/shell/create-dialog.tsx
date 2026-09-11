"use client";

import { useState } from "react";
import type { UiLocale } from "@/modules/auth/profile";
import type { AppProjectDto } from "@/modules/application";
import { Dialog } from "../overlays/dialog";
import { Button } from "../primitives/button";
import { StatusBadge } from "../primitives/status-badge";
import { translate, type UiNextMessageKey } from "../localization";

type ShellProject = Pick<
  AppProjectDto,
  "id" | "name" | "researchLens" | "status" | "operationalMember" | "capabilities"
>;

const createActions: Array<{
  labelKey: UiNextMessageKey;
  capability: keyof AppProjectDto["capabilities"];
}> = [
  { labelKey: "shell.createNote", capability: "canCreateNote" },
  { labelKey: "shell.createMaterial", capability: "canCreateMaterial" },
  { labelKey: "shell.createActivity", capability: "canCreateActivity" },
  { labelKey: "shell.createTask", capability: "canCreateTask" },
  { labelKey: "shell.createPerson", capability: "canManagePeople" },
];

export function CreateDialog({
  locale,
  projects,
  defaultProjectId,
}: {
  locale: UiLocale;
  projects: ShellProject[];
  defaultProjectId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const selected = projects.find((project) => project.id === projectId) ?? null;
  const availableActions = selected
    ? createActions.filter((action) => Boolean(selected.capabilities[action.capability]))
    : [];

  const [creatingNote, setCreatingNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setProjectId(null);
    setCreatingNote(false);
    setNoteTitle("");
    setError(null);
  }

  function openDialog() {
    setProjectId(projects.find((project) => project.id === defaultProjectId)?.id ?? null);
    setCreatingNote(false);
    setNoteTitle("");
    setError(null);
    setOpen(true);
  }

  async function handleCreateNote(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !noteTitle.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/app/projects/${encodeURIComponent(selected.id)}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: noteTitle.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.reason || translate(locale, "error.internal.title"));
        return;
      }

      const data = (await res.json()) as { draft: { id: string } };
      close();
      window.location.href = `/app/projects/${encodeURIComponent(selected.id)}/notes/${encodeURIComponent(data.draft.id)}`;
    } catch {
      setError(translate(locale, "error.internal.title"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Button type="button" variant="primary" onClick={openDialog}>
        {translate(locale, "shell.new")}
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title={translate(locale, "shell.newTitle")}
        description={translate(locale, "shell.newDescription")}
        closeLabel={translate(locale, "common.close")}
      >
        {!selected ? (
          <div className="ui-next-create-dialog">
            <h3>{translate(locale, "shell.chooseProject")}</h3>
            <div className="ui-next-create-dialog__projects">
              {projects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className="ui-next-create-dialog__project"
                  onClick={() => setProjectId(project.id)}
                >
                  <span>
                    <strong>{project.name}</strong>
                    <small>{project.researchLens}</small>
                  </span>
                  <span>
                    <StatusBadge tone={project.operationalMember ? "success" : "information"}>
                      {translate(
                        locale,
                        project.operationalMember ? "shell.workAccess" : "shell.researchAccess",
                      )}
                    </StatusBadge>
                    <small>{translate(locale, `shell.projectStatus.${project.status}`)}</small>
                  </span>
                </button>
              ))}
              {!projects.length ? <p>{translate(locale, "shell.noProjects")}</p> : null}
            </div>
          </div>
        ) : creatingNote ? (
          <form
            onSubmit={handleCreateNote}
            className="ui-next-create-dialog"
            style={{ display: "flex", flexDirection: "column", gap: "var(--ui-space-4)" }}
          >
            <Button type="button" variant="ghost" onClick={() => setCreatingNote(false)}>
              {translate(locale, "common.back")}
            </Button>
            <div>
              <h3>{translate(locale, "notes.create.title")}</h3>
              <p className="ui-next-muted">{selected.name}</p>
            </div>
            <div className="ui-next-form-field">
              <label htmlFor="shell-note-title" className="ui-next-form-label">
                {translate(locale, "notes.field.title")}
              </label>
              <input
                id="shell-note-title"
                type="text"
                className="ui-next-note-editor__title-input"
                style={{
                  border: "1px solid var(--ui-color-border)",
                  background: "var(--ui-color-surface)",
                }}
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                placeholder={translate(locale, "notes.field.titlePlaceholder")}
                autoFocus
                required
              />
            </div>
            {error ? (
              <p
                style={{
                  color: "var(--ui-color-danger)",
                  fontSize: "var(--ui-font-size-sm)",
                  margin: 0,
                }}
              >
                {error}
              </p>
            ) : null}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--ui-space-2)" }}>
              <Button type="button" variant="secondary" onClick={() => setCreatingNote(false)}>
                {translate(locale, "common.cancel")}
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting || !noteTitle.trim()}>
                {isSubmitting
                  ? translate(locale, "notes.create.creating")
                  : translate(locale, "notes.create.submit")}
              </Button>
            </div>
          </form>
        ) : (
          <div className="ui-next-create-dialog">
            <Button type="button" variant="ghost" onClick={() => setProjectId(null)}>
              {translate(locale, "common.back")}
            </Button>
            <div>
              <h3>{translate(locale, "shell.chooseObjectType")}</h3>
              <p>{selected.name}</p>
            </div>
            {availableActions.length ? (
              <div className="ui-next-create-dialog__actions">
                {availableActions.map((action) => {
                  if (action.capability === "canCreateNote") {
                    return (
                      <Button
                        key={action.labelKey}
                        type="button"
                        variant="primary"
                        onClick={() => setCreatingNote(true)}
                      >
                        {translate(locale, action.labelKey)}
                      </Button>
                    );
                  }
                  if (action.capability === "canCreateActivity" || action.capability === "canCreateTask") {
                    const module = action.capability === "canCreateActivity" ? "activities" : "tasks";
                    return (
                      <Button
                        key={action.labelKey}
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          window.location.href = `/app/projects/${encodeURIComponent(selected.id)}/${module}`;
                        }}
                      >
                        {translate(locale, action.labelKey)}
                      </Button>
                    );
                  }
                  return (
                    <Button key={action.labelKey} type="button" variant="secondary" disabled>
                      {translate(locale, action.labelKey)} · {translate(locale, "common.upcoming")}
                    </Button>
                  );
                })}
              </div>
            ) : (
              <p>{translate(locale, "shell.noCreateActions")}</p>
            )}
            <p className="ui-next-muted">{translate(locale, "shell.creationUpcoming")}</p>
          </div>
        )}
      </Dialog>
    </>
  );
}
