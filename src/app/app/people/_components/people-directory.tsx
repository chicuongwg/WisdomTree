"use client";

import Link from "next/link";
import { useState } from "react";
import type { UiLocale } from "@/modules/auth/profile";
import { Button, PageContainer, PageHeader, Stack, Surface, translate } from "@/app/components/ui-next";

type Person = { id: string; displayName: string; summary: string | null; version: number };

export function PeopleDirectory({
  locale,
  people,
  projectId,
  projectName,
  canCreate,
}: {
  locale: UiLocale;
  people: Person[];
  projectId?: string;
  projectName?: string;
  canCreate?: boolean;
}) {
  const [items, setItems] = useState(people);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(false);

  async function createPerson(form: FormData) {
    if (!projectId) return;
    setCreating(true);
    setError(false);
    try {
      const response = await fetch(`/api/app/projects/${encodeURIComponent(projectId)}/people`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: String(form.get("displayName") ?? ""),
          summary: String(form.get("summary") ?? ""),
        }),
      });
      if (!response.ok) throw new Error("person_create_failed");
      const { person } = (await response.json()) as { person: Person };
      setItems((current) => [...current, person].sort((a, b) => a.displayName.localeCompare(b.displayName)));
      (document.getElementById("new-person-form") as HTMLFormElement | null)?.reset();
    } catch {
      setError(true);
    } finally {
      setCreating(false);
    }
  }

  return (
    <PageContainer width="wide">
      <Stack>
        <PageHeader
          title={projectName ?? translate(locale, "nav.people")}
          description={translate(locale, projectName ? "people.projectDescription" : "people.directoryDescription")}
        />
        {canCreate && projectId ? (
          <Surface>
            <form
              id="new-person-form"
              className="ui-next-inline"
              action={(formData) => void createPerson(formData)}
            >
              <label>
                <span>{translate(locale, "people.name")}</span>
                <input className="ui-next-control" name="displayName" required maxLength={200} />
              </label>
              <label>
                <span>{translate(locale, "people.summary")}</span>
                <input className="ui-next-control" name="summary" maxLength={1000} />
              </label>
              <Button type="submit" disabled={creating}>
                {creating ? translate(locale, "common.loading") : translate(locale, "people.new")}
              </Button>
              {error ? <p role="alert">{translate(locale, "people.saveFailed")}</p> : null}
            </form>
          </Surface>
        ) : null}
        {items.length ? (
          <ul className="ui-next-project-list" aria-label={translate(locale, "nav.people")}>
            {items.map((person) => (
              <li key={person.id}>
                <Surface className="ui-next-project-card">
                  <div className="ui-next-project-card__main">
                    <h3><Link href={`/app/people/${person.id}`}>{person.displayName}</Link></h3>
                    {person.summary ? <p className="ui-next-project-card__description" dir="auto">{person.summary}</p> : null}
                  </div>
                </Surface>
              </li>
            ))}
          </ul>
        ) : (
          <Surface><p>{translate(locale, "people.empty")}</p></Surface>
        )}
      </Stack>
    </PageContainer>
  );
}
