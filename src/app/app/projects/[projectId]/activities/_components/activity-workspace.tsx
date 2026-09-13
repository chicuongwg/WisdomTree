"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UiLocale } from "@/modules/auth/profile";
import { Button, Dialog, EmptyState, StatusBadge, translate } from "@/app/components/ui-next";
import { CollaborationSection } from "@/app/components/ui-next/collaboration-section";

type ActivityData = {
  id: string;
  title: string;
  type: string | null;
  summary: string | null;
  status: "planned" | "active" | "completed" | "cancelled";
  version: number;
  participants: Array<{
    personId: string;
    displayName: string;
    summary: string | null;
    roleLabel: string | null;
  }>;
  materials: Array<{ id: string; title: string; description: string | null }>;
  notes: Array<{
    id: string;
    title: string;
    summary: string | null;
    researchPurpose: string | null;
  }>;
  tasks: Array<{
    id: string;
    title: string;
    state: "todo" | "doing" | "done" | "archived";
    dueAt: Date | string | null;
  }>;
};

type Pickable = { id: string; title?: string; displayName?: string; summary?: string | null };

export function ActivityWorkspace({
  projectId,
  locale,
  activity,
  availablePeople,
  availableMaterials,
  availableNotes,
  canEdit,
  collaboration,
}: {
  projectId: string;
  locale: UiLocale;
  activity: ActivityData;
  canEdit: boolean;
  availablePeople: Array<{ id: string; displayName: string; summary: string | null }>;
  availableMaterials: Array<{ id: string; title: string }>;
  availableNotes: Array<{ id: string; title: string; summary: string | null }>;
  collaboration: { mentionCandidates: Array<{ id: string; displayName: string }> } | null;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState<"participant" | "material" | "note" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function request(path: string, init: RequestInit) {
    const response = await fetch(path, init);
    if (!response.ok)
      throw new Error(
        (await response.json().catch(() => ({}))).reason ||
          translate(locale, "error.internal.title"),
      );
    router.refresh();
  }
  async function saveActivity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await request(
        `/api/app/projects/${encodeURIComponent(projectId)}/activities/${encodeURIComponent(activity.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.get("title"),
            type: form.get("type"),
            summary: form.get("summary"),
            status: form.get("status"),
            expectedVersion: activity.version,
          }),
        },
      );
      setEditOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : translate(locale, "error.internal.title"));
    } finally {
      setSaving(false);
    }
  }
  async function addContext(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contextOpen) return;
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await request(
        `/api/app/projects/${encodeURIComponent(projectId)}/activities/${encodeURIComponent(activity.id)}/context`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: contextOpen,
            id: form.get("id"),
            roleLabel: form.get("roleLabel"),
          }),
        },
      );
      setContextOpen(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : translate(locale, "error.internal.title"));
    } finally {
      setSaving(false);
    }
  }
  async function removeContext(kind: "participant" | "material" | "note", id: string) {
    setError(null);
    try {
      await request(
        `/api/app/projects/${encodeURIComponent(projectId)}/activities/${encodeURIComponent(activity.id)}/context?kind=${kind}&id=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : translate(locale, "error.internal.title"));
    }
  }
  const options: Pickable[] =
    contextOpen === "participant"
      ? availablePeople
      : contextOpen === "material"
        ? availableMaterials
        : availableNotes;
  const pickedIds = new Set(
    contextOpen === "participant"
      ? activity.participants.map((item) => item.personId)
      : contextOpen === "material"
        ? activity.materials.map((item) => item.id)
        : activity.notes.map((item) => item.id),
  );

  return (
    <section className="ui-next-activity-detail" aria-labelledby="activity-title">
      <header className="ui-next-work-page__header">
        <div>
          <Link
            className="ui-next-back-link"
            href={`/app/projects/${encodeURIComponent(projectId)}/activities`}
          >
            {translate(locale, "common.back")}
          </Link>
          <h2 id="activity-title">{activity.title}</h2>
          <p>{activity.summary || translate(locale, "activities.contextEmpty")}</p>
        </div>
        <div className="ui-next-work-list__meta">
          {activity.type ? <span>{activity.type}</span> : null}
          <StatusBadge
            tone={
              activity.status === "cancelled"
                ? "warning"
                : activity.status === "completed"
                  ? "success"
                  : "information"
            }
          >
            {translate(locale, `activities.status.${activity.status}`)}
          </StatusBadge>
          {canEdit ? (
            <Button type="button" variant="secondary" onClick={() => setEditOpen(true)}>
              {translate(locale, "activities.edit")}
            </Button>
          ) : null}
        </div>
      </header>
      {error ? (
        <p className="ui-next-work-form__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="ui-next-activity-detail__grid">
        <ContextSection
          title={translate(locale, "activities.participants")}
          addLabel={translate(locale, "activities.addParticipant")}
          canEdit={canEdit}
          onAdd={() => {
            setError(null);
            setContextOpen("participant");
          }}
          empty={translate(locale, "activities.participantsEmpty")}
        >
          {activity.participants.map((person) => (
            <li key={person.personId}>
              <span>
                <strong>{person.displayName}</strong>
                {person.roleLabel ? <small>{person.roleLabel}</small> : null}
              </span>
              {canEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeContext("participant", person.personId)}
                >
                  {translate(locale, "activities.remove")}
                </Button>
              ) : null}
            </li>
          ))}
        </ContextSection>
        <ContextSection
          title={translate(locale, "activities.materials")}
          addLabel={translate(locale, "activities.addMaterial")}
          canEdit={canEdit}
          onAdd={() => {
            setError(null);
            setContextOpen("material");
          }}
          empty={translate(locale, "activities.materialsEmpty")}
        >
          {activity.materials.map((material) => (
            <li key={material.id}>
              <Link
                href={`/app/projects/${encodeURIComponent(projectId)}/materials/${encodeURIComponent(material.id)}`}
              >
                {material.title}
              </Link>
              {canEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeContext("material", material.id)}
                >
                  {translate(locale, "activities.remove")}
                </Button>
              ) : null}
            </li>
          ))}
        </ContextSection>
        <ContextSection
          title={translate(locale, "activities.notes")}
          addLabel={translate(locale, "activities.addNote")}
          canEdit={canEdit}
          onAdd={() => {
            setError(null);
            setContextOpen("note");
          }}
          empty={translate(locale, "activities.notesEmpty")}
        >
          {activity.notes.map((note) => (
            <li key={note.id}>
              <Link
                href={`/app/projects/${encodeURIComponent(projectId)}/notes/${encodeURIComponent(note.id)}`}
              >
                {note.title}
              </Link>
              {canEdit ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => removeContext("note", note.id)}
                >
                  {translate(locale, "activities.remove")}
                </Button>
              ) : null}
            </li>
          ))}
        </ContextSection>
        <section className="ui-next-activity-context">
          <h3>{translate(locale, "activities.tasks")}</h3>
          {activity.tasks.length ? (
            <ul>
              {activity.tasks.map((task) => (
                <li key={task.id}>
                  <Link
                    href={`/app/projects/${encodeURIComponent(projectId)}/tasks/${encodeURIComponent(task.id)}`}
                  >
                    {task.title}
                  </Link>
                  <StatusBadge>{translate(locale, `tasks.state.${task.state}`)}</StatusBadge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title={translate(locale, "activities.tasksEmpty")}
              description={translate(locale, "activities.tasksHelp")}
            />
          )}
        </section>
      </div>
      {collaboration ? (
        <CollaborationSection
          locale={locale}
          members={collaboration.mentionCandidates}
          commentsUrl={`/api/app/projects/${encodeURIComponent(projectId)}/activities/${encodeURIComponent(activity.id)}/comments`}
          presenceUrl={`/api/app/projects/${encodeURIComponent(projectId)}/activities/${encodeURIComponent(activity.id)}/presence`}
        />
      ) : null}
      <Dialog
        footer={
          <div className="ui-next-work-form__actions">
            <Button type="button" variant="secondary" onClick={() => setEditOpen(false)}>
              {translate(locale, "common.cancel")}
            </Button>
            <Button
              type="submit"
              form="edit-activity"
              variant="primary"
              loading={saving}
              loadingLabel={translate(locale, "common.loading")}
            >
              {translate(locale, "common.save")}
            </Button>
          </div>
        }
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={translate(locale, "activities.editTitle")}
        closeLabel={translate(locale, "common.close")}
      >
        <form id="edit-activity" className="ui-next-work-form" onSubmit={saveActivity}>
          <label>
            <span>{translate(locale, "activities.field.title")}</span>
            <input name="title" defaultValue={activity.title} required maxLength={300} />
          </label>
          <label>
            <span>{translate(locale, "activities.field.type")}</span>
            <input name="type" defaultValue={activity.type || ""} maxLength={80} />
          </label>
          <label>
            <span>{translate(locale, "activities.field.summary")}</span>
            <textarea name="summary" rows={4} defaultValue={activity.summary || ""} />
          </label>
          <label>
            <span>{translate(locale, "activities.field.status")}</span>
            <select name="status" defaultValue={activity.status}>
              {(["planned", "active", "completed", "cancelled"] as const).map((status) => (
                <option key={status} value={status}>
                  {translate(locale, `activities.status.${status}`)}
                </option>
              ))}
            </select>
          </label>
        </form>
      </Dialog>
      <Dialog
        open={Boolean(contextOpen)}
        onClose={() => setContextOpen(null)}
        title={contextOpen ? translate(locale, `activities.add.${contextOpen}`) : ""}
        closeLabel={translate(locale, "common.close")}
      >
        <form className="ui-next-work-form" onSubmit={addContext}>
          <label>
            <span>{translate(locale, "activities.field.choose")}</span>
            <select name="id" required defaultValue="">
              <option value="" disabled>
                {translate(locale, "activities.field.choose")}
              </option>
              {options
                .filter((item) => !pickedIds.has(item.id))
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.displayName || item.title}
                  </option>
                ))}
            </select>
          </label>
          {contextOpen === "participant" ? (
            <label>
              <span>{translate(locale, "activities.field.role")}</span>
              <input name="roleLabel" maxLength={80} />
            </label>
          ) : null}
          <div className="ui-next-work-form__actions">
            <Button type="button" variant="secondary" onClick={() => setContextOpen(null)}>
              {translate(locale, "common.cancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={!options.some((item) => !pickedIds.has(item.id))}
              loading={saving}
              loadingLabel={translate(locale, "common.loading")}
            >
              {translate(locale, "common.create")}
            </Button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}

function ContextSection({
  title,
  addLabel,
  canEdit,
  onAdd,
  empty,
  children,
}: {
  title: string;
  addLabel: string;
  canEdit: boolean;
  onAdd: () => void;
  empty: string;
  children: React.ReactNode;
}) {
  const entries = Array.isArray(children) ? children : [children];
  return (
    <section className="ui-next-activity-context">
      <header>
        <h3>{title}</h3>
        {canEdit ? (
          <Button type="button" variant="ghost" onClick={onAdd}>
            {addLabel}
          </Button>
        ) : null}
      </header>
      {entries.length ? <ul>{children}</ul> : <p>{empty}</p>}
    </section>
  );
}
