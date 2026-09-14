"use client";

import { useState } from "react";
import type { UiLocale } from "@/modules/auth/profile";
import type { AppProjectDto } from "@/modules/application";
import { Dialog } from "../overlays/dialog";
import { Button } from "../primitives/button";
import { TextField } from "../primitives/form-controls";
import { Stack } from "../layout/primitives";
import { StatusBadge } from "../primitives/status-badge";
import { translate, type UiNextMessageKey } from "../localization";

type ShellProject = Pick<
  AppProjectDto,
  "id" | "name" | "researchLens" | "status" | "isPersonal" | "operationalMember" | "capabilities"
>;

const createActions: Array<{
  labelKey: UiNextMessageKey;
  descriptionKey: UiNextMessageKey;
  capability:
    | "canCreateNote"
    | "canCreateMaterial"
    | "canCreateActivity"
    | "canCreateTask"
    | "canManagePeople";
}> = [
  {
    labelKey: "shell.createNote",
    descriptionKey: "shell.notePurpose",
    capability: "canCreateNote",
  },
  {
    labelKey: "shell.createMaterial",
    descriptionKey: "shell.materialPurpose",
    capability: "canCreateMaterial",
  },
  {
    labelKey: "shell.createActivity",
    descriptionKey: "shell.activityPurpose",
    capability: "canCreateActivity",
  },
  {
    labelKey: "shell.createTask",
    descriptionKey: "shell.taskPurpose",
    capability: "canCreateTask",
  },
  {
    labelKey: "shell.createPerson",
    descriptionKey: "shell.personPurpose",
    capability: "canManagePeople",
  },
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
  const projectName = selected?.isPersonal
    ? translate(locale, "projects.myProject")
    : selected?.name;

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
      <Button
        type="button"
        variant="primary"
        className="ui-next-create-trigger"
        aria-label={translate(locale, "shell.new")}
        onClick={openDialog}
      >
        <span className="ui-next-create-trigger__label">{translate(locale, "shell.new")}</span>
      </Button>
      <Dialog
        size="wide"
        open={open}
        onClose={close}
        title={translate(locale, "shell.newTitle")}
        description={selected ? undefined : translate(locale, "shell.newDescription")}
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
                    <strong>
                      {project.isPersonal ? translate(locale, "projects.myProject") : project.name}
                    </strong>
                    <small>
                      {project.isPersonal && project.researchLens === "Personal research workspace"
                        ? translate(locale, "projects.personalWorkspace")
                        : project.researchLens}
                    </small>
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
          <Stack
            as="form"
            gap="4"
            onSubmit={handleCreateNote}
            className="ui-next-create-dialog"
          >
            <Button
              type="button"
              variant="ghost"
              className="ui-next-create-dialog__back"
              onClick={() => setCreatingNote(false)}
            >
              {translate(locale, "common.back")}
            </Button>
            <div>
              <h3>{translate(locale, "notes.create.title")}</h3>
              <p className="ui-next-muted">{projectName}</p>
            </div>
            <TextField
              id="shell-note-title"
              type="text"
              label={translate(locale, "notes.field.title")}
              className="ui-next-note-editor__title-input"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              placeholder={translate(locale, "notes.field.titlePlaceholder")}
              autoFocus
              required
              error={error ?? undefined}
            />
            <div className="ui-next-dialog-actions">
              <Button type="button" variant="secondary" onClick={() => setCreatingNote(false)}>
                {translate(locale, "common.cancel")}
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting || !noteTitle.trim()}>
                {isSubmitting
                  ? translate(locale, "notes.create.creating")
                  : translate(locale, "notes.create.submit")}
              </Button>
            </div>
          </Stack>
        ) : (
          <div className="ui-next-create-dialog">
            <div className="ui-next-create-dialog__context">
              <div>
                <p className="ui-next-muted">{translate(locale, "shell.selectedProject")}</p>
                <strong>{projectName}</strong>
              </div>
              <Button type="button" variant="ghost" onClick={() => setProjectId(null)}>
                {translate(locale, "shell.changeProject")}
              </Button>
            </div>
            {availableActions.length ? (
              <>
                <h3>{translate(locale, "shell.chooseObjectType")}</h3>
                <div className="ui-next-create-dialog__actions">
                  {availableActions.map((action) => {
                    return (
                      <button
                        key={action.labelKey}
                        type="button"
                        className="ui-next-create-dialog__action"
                        aria-label={translate(locale, action.labelKey)}
                        aria-describedby={`create-purpose-${action.capability}`}
                        onClick={() => {
                          if (action.capability === "canCreateNote") {
                            setCreatingNote(true);
                            return;
                          }
                          const module = {
                            canCreateMaterial: "materials",
                            canCreateActivity: "activities",
                            canCreateTask: "tasks",
                            canManagePeople: "people",
                          }[action.capability];
                          window.location.href = `/app/projects/${encodeURIComponent(selected.id)}/${module}`;
                        }}
                      >
                        <span>
                          <strong>{translate(locale, action.labelKey)}</strong>
                          <small id={`create-purpose-${action.capability}`}>
                            {translate(locale, action.descriptionKey)}
                          </small>
                        </span>
                        <span aria-hidden="true">›</span>
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <p>{translate(locale, "shell.noCreateActions")}</p>
            )}
          </div>
        )}
      </Dialog>
    </>
  );
}
