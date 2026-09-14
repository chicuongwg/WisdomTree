"use client";

import Link from "next/link";
import { useState } from "react";
import type { UiLocale } from "@/modules/auth/profile";
import {
  Button,
  Dialog,
  EmptyState,
  PageContainer,
  PageHeader,
  Stack,
  translate,
} from "@/app/components/ui-next";

type Person = { id: string; displayName: string; summary: string | null; version: number };

export function PeopleDirectory({
  locale,
  people,
  projectId,
  canCreate,
}: {
  locale: UiLocale;
  people: Person[];
  projectId?: string;
  canCreate?: boolean;
}) {
  const [items, setItems] = useState(people);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [createdPerson, setCreatedPerson] = useState<Person | null>(null);
  const isProjectDirectory = Boolean(projectId);
  const filteredItems = items.filter((person) =>
    `${person.displayName} ${person.summary ?? ""}`
      .toLocaleLowerCase(locale)
      .includes(query.trim().toLocaleLowerCase(locale)),
  );

  async function createPerson(form: FormData) {
    if (!projectId || !canCreate || creating) return;
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
      setItems((current) =>
        [...current, person].sort((a, b) => a.displayName.localeCompare(b.displayName, locale)),
      );
      setCreatedPerson(person);
      setQuery("");
      setCreateOpen(false);
    } catch {
      setError(true);
    } finally {
      setCreating(false);
    }
  }

  function openCreate() {
    setError(false);
    setCreateOpen(true);
  }

  const createAction =
    canCreate && projectId ? (
      <Button type="button" variant="primary" onClick={openCreate}>
        {translate(locale, "people.new")}
      </Button>
    ) : null;

  const content = (
    <Stack className={isProjectDirectory ? "ui-next-project-module" : undefined}>
      {isProjectDirectory ? (
        <PageHeader
          headingLevel={2}
          title={translate(locale, "nav.people")}
          description={translate(locale, "people.projectDescription")}
          actions={items.length ? createAction : null}
        />
      ) : (
        <PageHeader
          title={translate(locale, "nav.people")}
          description={translate(locale, "people.directoryDescription")}
        />
      )}
      {createdPerson ? (
        <div className="ui-next-people-next-step flex flex-wrap gap-x-6 gap-y-3 p-4 border-l-[3px] border-ui-accent bg-ui-surface">
          <p role="status" className="m-0 basis-full font-medium text-ui-text">
            {translate(locale, "people.created")}
          </p>
          <Link
            href={`/app/people/${createdPerson.id}`}
            className="text-ui-accent underline-offset-[0.18em] hover:underline"
          >
            {translate(locale, "people.openRecord")} — {createdPerson.displayName}
          </Link>
          {projectId ? (
            <Link
              href={`/app/projects/${projectId}/activities`}
              className="text-ui-accent underline-offset-[0.18em] hover:underline"
            >
              {translate(locale, "people.openActivities")}
            </Link>
          ) : null}
        </div>
      ) : null}
      {items.length ? (
        <section
          className="ui-next-people-results grid gap-4 min-w-0"
          aria-label={translate(locale, "nav.people")}
        >
          <label className="ui-next-people-filter grid gap-2 min-w-0 w-full max-w-[32rem]">
            <span className="text-sm font-medium text-ui-text-secondary">
              {translate(locale, "people.filter")}
            </span>
            <input
              type="search"
              className="ui-next-control"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <ul className="ui-next-people-list list-none m-0 p-0 divide-y divide-ui-border">
            {filteredItems.map((person) => (
              <li
                key={person.id}
                className="ui-next-people-list__row flex flex-wrap items-center justify-between gap-3 py-4 border-b border-ui-border"
              >
                <div className="min-w-0 break-words">
                  <h3 className="m-0 text-base font-semibold">
                    <Link
                      href={`/app/people/${person.id}`}
                      className="text-ui-text hover:text-ui-accent hover:underline"
                    >
                      {person.displayName}
                    </Link>
                  </h3>
                  {person.summary ? (
                    <p
                      className="ui-next-project-card__description max-w-[65ch] mt-1 text-sm text-ui-text-muted break-words"
                      dir="auto"
                    >
                      {person.summary}
                    </p>
                  ) : null}
                </div>
                <Link
                  href={`/app/people/${person.id}`}
                  className="text-ui-accent underline-offset-[0.18em] hover:underline text-sm font-medium"
                >
                  {translate(locale, "people.viewContext")}
                </Link>
              </li>
            ))}
          </ul>
          {!filteredItems.length ? (
            <p role="status" className="text-sm text-ui-text-muted">
              {translate(locale, "people.noMatches")}
            </p>
          ) : null}
        </section>
      ) : (
        <EmptyState
          title={translate(locale, isProjectDirectory ? "people.emptyProjectTitle" : "nav.people")}
          description={translate(
            locale,
            isProjectDirectory ? "people.emptyProjectDescription" : "people.empty",
          )}
          action={createAction}
        />
      )}
      {canCreate && projectId ? (
        <Dialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          title={translate(locale, "people.new")}
          description={translate(locale, "people.createDescription")}
          closeLabel={translate(locale, "common.close")}
        >
          {createOpen ? (
            <form
              className="ui-next-people-form grid gap-4 min-w-0"
              action={(formData) => void createPerson(formData)}
            >
              <label className="grid gap-1.5 min-w-0">
                <span className="text-sm font-medium text-ui-text-secondary">
                  {translate(locale, "people.name")}
                </span>
                <input className="ui-next-control" name="displayName" required maxLength={200} />
              </label>
              <label className="grid gap-1.5 min-w-0">
                <span className="text-sm font-medium text-ui-text-secondary">
                  {translate(locale, "people.summary")}
                </span>
                <textarea className="ui-next-control" name="summary" maxLength={1000} rows={3} />
              </label>
              <Button
                type="submit"
                variant="primary"
                className="justify-self-end"
                disabled={creating}
                loading={creating}
                loadingLabel={translate(locale, "common.loading")}
              >
                {translate(locale, "people.new")}
              </Button>
              {error ? (
                <p role="alert" className="text-sm text-ui-danger">
                  {translate(locale, "people.saveFailed")}
                </p>
              ) : null}
            </form>
          ) : null}
        </Dialog>
      ) : null}
    </Stack>
  );

  return isProjectDirectory ? content : <PageContainer width="wide">{content}</PageContainer>;
}
