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
  formatUiDate,
  translate,
} from "@/app/components/ui-next";

type MaterialItem = {
  id: string;
  title: string;
  currentVersion: {
    mimeType: string;
    storedAt: Date | string | null;
    extractionStatus: "pending" | "processed" | "unprocessable";
    hasText: boolean;
  } | null;
  physical: { itemCode: string; status: string | null } | null;
};

function extractionLabel(locale: UiLocale, status: "pending" | "processed" | "unprocessable") {
  return translate(locale, `materials.extraction.${status}`);
}

export function MaterialsView({
  projectId,
  locale,
  materials,
  canCreateMaterial,
}: {
  projectId: string;
  locale: UiLocale;
  materials: MaterialItem[];
  canCreateMaterial: boolean;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createMaterial(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreating(true);
    setError(null);
    try {
      const response = await fetch(`/api/app/projects/${encodeURIComponent(projectId)}/materials`, {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.reason || translate(locale, "error.internal.title"));
        return;
      }
      const body = (await response.json()) as { material: { id: string } };
      setIsOpen(false);
      router.push(
        `/app/projects/${encodeURIComponent(projectId)}/materials/${encodeURIComponent(body.material.id)}`,
      );
    } catch {
      setError(translate(locale, "error.internal.title"));
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <section className="ui-next-materials-page" aria-labelledby="materials-title">
      <PageHeader
        headingLevel={2}
        titleId="materials-title"
        title={translate(locale, "materials.title")}
        description={translate(locale, "materials.description")}
        actions={
          canCreateMaterial ? (
            <Button type="button" variant="primary" onClick={() => setIsOpen(true)}>
              {translate(locale, "materials.new")}
            </Button>
          ) : null
        }
      />

      {materials.length === 0 ? (
        <EmptyState
          title={translate(locale, "materials.emptyTitle")}
          description={translate(locale, "materials.emptyDescription")}
          action={
            canCreateMaterial ? (
              <Button type="button" variant="primary" onClick={() => setIsOpen(true)}>
                {translate(locale, "materials.createFirst")}
              </Button>
            ) : null
          }
        />
      ) : (
        <ul className="ui-next-materials-list flex flex-col gap-3 list-none m-0 p-0" role="list">
          {materials.map((material) => (
            <li
              key={material.id}
              className="ui-next-materials-list__item bg-ui-surface border border-ui-border rounded-lg p-4 transition-all hover:border-ui-border-strong hover:shadow-sm"
            >
              <Link
                href={`/app/projects/${encodeURIComponent(projectId)}/materials/${encodeURIComponent(material.id)}`}
                className="ui-next-materials-list__link flex flex-col gap-2 no-underline text-inherit focus-visible:outline-2 focus-visible:outline-ui-focus rounded"
              >
                <div className="ui-next-materials-list__heading flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="m-0 text-lg font-semibold text-ui-text">{material.title}</h3>
                  <div className="ui-next-materials-list__badges flex items-center gap-2 flex-wrap">
                    {material.currentVersion ? (
                      <StatusBadge
                        tone={
                          material.currentVersion.extractionStatus === "unprocessable"
                            ? "warning"
                            : material.currentVersion.extractionStatus === "processed"
                              ? "success"
                              : "information"
                        }
                      >
                        {extractionLabel(locale, material.currentVersion.extractionStatus)}
                      </StatusBadge>
                    ) : (
                      <StatusBadge>{translate(locale, "materials.status.registered")}</StatusBadge>
                    )}
                    {material.physical ? (
                      <StatusBadge tone="neutral">
                        {translate(locale, "materials.physical")}
                      </StatusBadge>
                    ) : null}
                  </div>
                </div>
                <div className="ui-next-materials-list__meta flex items-center gap-4 text-xs text-ui-text-muted">
                  {material.currentVersion ? (
                    <span>{translate(locale, "materials.version.current")}</span>
                  ) : (
                    <span>{translate(locale, "materials.noDigitalVersion")}</span>
                  )}
                  {material.currentVersion?.storedAt ? (
                    <span>{formatUiDate(material.currentVersion.storedAt, locale)}</span>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        footer={
          <div className="ui-next-material-form__actions flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>
              {translate(locale, "common.cancel")}
            </Button>
            <Button
              type="submit"
              form="create-material"
              variant="primary"
              loading={isCreating}
              loadingLabel={translate(locale, "common.loading")}
            >
              {translate(locale, "materials.create.submit")}
            </Button>
          </div>
        }
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={translate(locale, "materials.create.title")}
        description={translate(locale, "materials.create.description")}
        closeLabel={translate(locale, "common.close")}
      >
        <form
          id="create-material"
          className="ui-next-material-form flex flex-col gap-4"
          onSubmit={createMaterial}
        >
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ui-text">
            <span>{translate(locale, "materials.field.title")}</span>
            <input
              name="title"
              required
              maxLength={300}
              autoFocus
              className="min-h-[2.5rem] rounded-md border border-ui-border bg-ui-surface px-3 py-1.5 text-sm text-ui-text outline-none focus:border-ui-focus focus:ring-1 focus:ring-ui-focus"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ui-text">
            <span>{translate(locale, "materials.field.description")}</span>
            <textarea
              name="description"
              rows={3}
              className="rounded-md border border-ui-border bg-ui-surface px-3 py-1.5 text-sm text-ui-text outline-none focus:border-ui-focus focus:ring-1 focus:ring-ui-focus"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ui-text">
            <span>{translate(locale, "materials.field.file")}</span>
            <input
              name="file"
              type="file"
              className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-ui-surface-muted file:text-ui-text hover:file:cursor-pointer"
            />
            <small className="text-xs text-ui-text-muted">
              {translate(locale, "materials.field.fileHelp")}
            </small>
          </label>
          {error ? (
            <p
              className="ui-next-material-form__error m-0 text-sm text-ui-danger font-medium"
              role="alert"
            >
              {error}
            </p>
          ) : null}
        </form>
      </Dialog>
    </section>
  );
}
