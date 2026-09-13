"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UiLocale } from "@/modules/auth/profile";
import {
  Button,
  Dialog,
  EmptyState,
  PageHeader,
  StatusBadge,
  translate,
} from "@/app/components/ui-next";

type Activity = {
  id: string;
  title: string;
  type: string | null;
  summary: string | null;
  status: "planned" | "active" | "completed" | "cancelled";
};

export function ActivitiesView({
  projectId,
  locale,
  activities,
  canCreate,
}: {
  projectId: string;
  locale: UiLocale;
  activities: Activity[];
  canCreate: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function createActivity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch(
        `/api/app/projects/${encodeURIComponent(projectId)}/activities`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: form.get("title"),
            type: form.get("type"),
            summary: form.get("summary"),
          }),
        },
      );
      if (!response.ok) {
        setError(
          (await response.json().catch(() => ({}))).reason ||
            translate(locale, "error.internal.title"),
        );
        return;
      }
      const { activity } = (await response.json()) as { activity: { id: string } };
      router.push(
        `/app/projects/${encodeURIComponent(projectId)}/activities/${encodeURIComponent(activity.id)}`,
      );
    } catch {
      setError(translate(locale, "error.internal.title"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="ui-next-work-page" aria-labelledby="activities-title">
      <PageHeader
        headingLevel={2}
        titleId="activities-title"
        title={translate(locale, "activities.title")}
        description={translate(locale, "activities.description")}
        actions={
          canCreate ? (
            <Button type="button" variant="primary" onClick={() => setOpen(true)}>
              {translate(locale, "activities.new")}
            </Button>
          ) : null
        }
      />
      {activities.length ? (
        <ul className="ui-next-work-list" role="list">
          {activities.map((activity) => (
            <li key={activity.id}>
              <Link
                className="ui-next-work-list__link"
                href={`/app/projects/${encodeURIComponent(projectId)}/activities/${encodeURIComponent(activity.id)}`}
              >
                <div>
                  <h3>{activity.title}</h3>
                  {activity.summary ? <p>{activity.summary}</p> : null}
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
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title={translate(locale, "activities.emptyTitle")}
          description={translate(locale, "activities.emptyDescription")}
          action={
            canCreate ? (
              <Button type="button" variant="primary" onClick={() => setOpen(true)}>
                {translate(locale, "activities.createFirst")}
              </Button>
            ) : null
          }
        />
      )}
      <Dialog
        footer={
          <div className="ui-next-work-form__actions">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              {translate(locale, "common.cancel")}
            </Button>
            <Button
              type="submit"
              form="create-activity"
              variant="primary"
              loading={saving}
              loadingLabel={translate(locale, "common.loading")}
            >
              {translate(locale, "activities.create.submit")}
            </Button>
          </div>
        }
        open={open}
        onClose={() => setOpen(false)}
        title={translate(locale, "activities.create.title")}
        closeLabel={translate(locale, "common.close")}
      >
        <form id="create-activity" className="ui-next-work-form" onSubmit={createActivity}>
          <label>
            <span>{translate(locale, "activities.field.title")}</span>
            <input name="title" required maxLength={300} autoFocus />
          </label>
          <label>
            <span>{translate(locale, "activities.field.type")}</span>
            <input name="type" maxLength={80} />
          </label>
          <label>
            <span>{translate(locale, "activities.field.summary")}</span>
            <textarea name="summary" rows={4} />
          </label>
          {error ? (
            <p role="alert" className="ui-next-work-form__error">
              {error}
            </p>
          ) : null}
        </form>
      </Dialog>
    </section>
  );
}
