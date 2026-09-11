"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { UiLocale } from "@/modules/auth/profile";
import {
  Button,
  Dialog,
  EmptyState,
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
      <header className="ui-next-materials-page__header">
        <div>
          <h2 id="materials-title">{translate(locale, "materials.title")}</h2>
          <p>{translate(locale, "materials.description")}</p>
        </div>
        {canCreateMaterial ? (
          <Button type="button" variant="primary" onClick={() => setIsOpen(true)}>
            {translate(locale, "materials.new")}
          </Button>
        ) : null}
      </header>

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
        <ul className="ui-next-materials-list" role="list">
          {materials.map((material) => (
            <li key={material.id} className="ui-next-materials-list__item">
              <Link
                href={`/app/projects/${encodeURIComponent(projectId)}/materials/${encodeURIComponent(material.id)}`}
                className="ui-next-materials-list__link"
              >
                <div className="ui-next-materials-list__heading">
                  <h3>{material.title}</h3>
                  <div className="ui-next-materials-list__badges">
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
                <div className="ui-next-materials-list__meta">
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
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={translate(locale, "materials.create.title")}
        description={translate(locale, "materials.create.description")}
        closeLabel={translate(locale, "common.close")}
      >
        <form className="ui-next-material-form" onSubmit={createMaterial}>
          <label>
            <span>{translate(locale, "materials.field.title")}</span>
            <input name="title" required maxLength={300} autoFocus />
          </label>
          <label>
            <span>{translate(locale, "materials.field.description")}</span>
            <textarea name="description" rows={3} />
          </label>
          <label>
            <span>{translate(locale, "materials.field.file")}</span>
            <input name="file" type="file" />
            <small>{translate(locale, "materials.field.fileHelp")}</small>
          </label>
          {error ? (
            <p className="ui-next-material-form__error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="ui-next-material-form__actions">
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>
              {translate(locale, "common.cancel")}
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isCreating}
              loadingLabel={translate(locale, "common.loading")}
            >
              {translate(locale, "materials.create.submit")}
            </Button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}
