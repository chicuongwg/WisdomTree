"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { UiLocale } from "@/modules/auth/profile";
import { Dialog } from "../overlays/dialog";
import { Button } from "../primitives/button";
import { translate } from "../localization";
import { runGuardedNoteNavigation } from "../navigation/unsaved-note-navigation";

type ProjectRef = { id: string; name: string };
type SearchResult =
  | {
      kind: "project";
      id: string;
      title: string;
      summary: string | null;
      project: ProjectRef;
      isPersonal: boolean;
    }
  | {
      kind: "note" | "material" | "activity";
      id: string;
      title: string;
      summary: string | null;
      project: ProjectRef;
    }
  | { kind: "person"; id: string; title: string; summary: string | null; projects: ProjectRef[] };

type Choice = {
  key: string;
  title: string;
  context: string;
  href: string;
  kind: SearchResult["kind"] | "command";
};

function resultHref(result: SearchResult) {
  if (result.kind === "project") return `/app/projects/${result.id}`;
  if (result.kind === "person") return `/app/people/${encodeURIComponent(result.id)}`;
  if (result.kind === "note") return `/app/projects/${result.project.id}/notes/${result.id}`;
  if (result.kind === "material")
    return `/app/projects/${result.project.id}/materials/${result.id}`;
  if (result.kind === "activity")
    return `/app/projects/${result.project.id}/activities/${result.id}`;
  return `/app/projects/${result.project.id}`;
}

export function QuickSearch({ locale }: { locale: UiLocale }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState(0);
  const listId = useId();

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    const normalized = query.trim();
    if (!normalized) {
      setResults([]);
      setLoading(false);
      setFailed(false);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setFailed(false);
      try {
        const response = await fetch(`/api/app/search?q=${encodeURIComponent(normalized)}`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("search");
        setResults((await response.json()) as SearchResult[]);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setResults([]);
          setFailed(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const choices = useMemo<Choice[]>(() => {
    if (!query.trim()) {
      return [
        {
          key: "overview",
          title: translate(locale, "nav.overview"),
          context: "",
          href: "/app",
          kind: "command",
        },
        {
          key: "projects",
          title: translate(locale, "nav.projects"),
          context: "",
          href: "/app/projects",
          kind: "command",
        },
        {
          key: "work",
          title: translate(locale, "nav.myWork"),
          context: "",
          href: "/app/my-work",
          kind: "command",
        },
        {
          key: "calendar",
          title: translate(locale, "nav.calendar"),
          context: "",
          href: "/app/calendar",
          kind: "command",
        },
        {
          key: "people",
          title: translate(locale, "nav.people"),
          context: "",
          href: "/app/people",
          kind: "command",
        },
        {
          key: "search",
          title: translate(locale, "nav.search"),
          context: "",
          href: "/app/search",
          kind: "command",
        },
        {
          key: "graph",
          title: translate(locale, "nav.graph"),
          context: "",
          href: "/app/graph",
          kind: "command",
        },
        {
          key: "notifications",
          title: translate(locale, "nav.notifications"),
          context: "",
          href: "/app/notifications",
          kind: "command",
        },
      ];
    }
    return results.map((result) => ({
      key: `${result.kind}:${result.id}`,
      title:
        result.kind === "project" && result.isPersonal
          ? translate(locale, "projects.myProject")
          : result.title,
      context:
        result.kind === "person"
          ? result.projects.map((project) => project.name).join(" · ")
          : result.kind === "project"
            ? translate(locale, "shell.kind.project")
            : result.project.name,
      href: resultHref(result),
      kind: result.kind,
    }));
  }, [locale, query, results]);

  useEffect(() => setSelected(0), [choices.length, query]);

  function close() {
    setOpen(false);
    setQuery("");
    setResults([]);
    setSelected(0);
  }

  function activate(choice: Choice) {
    runGuardedNoteNavigation(() => {
      close();
      router.push(choice.href);
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="ui-next-quick-search-trigger w-full justify-between text-ui-text-secondary font-medium max-xs:w-10 max-xs:px-0 max-xs:justify-center"
        aria-label={translate(locale, "shell.quickSearch")}
        onClick={() => setOpen(true)}
      >
        <span className="w-full flex items-center justify-between gap-3 max-xs:hidden">
          <span className="truncate">{translate(locale, "shell.quickSearch")}</span>
          <kbd className="border border-ui-border rounded px-1.5 py-0.5 bg-ui-surface-sunken text-ui-text-muted font-mono text-xs max-md:hidden">
            {translate(locale, "shell.quickSearchHint")}
          </kbd>
        </span>
      </Button>
      <Dialog
        footer={
          <Button
            type="button"
            variant="ghost"
            className="ui-next-quick-search__footer w-full border-t border-ui-border rounded-none pt-4 justify-start"
            onClick={() => {
              const href = `/app/search${query.trim() ? `?q=${encodeURIComponent(query.trim())}` : ""}`;
              runGuardedNoteNavigation(() => {
                close();
                router.push(href);
              });
            }}
          >
            {translate(locale, "shell.viewAllResults")}
          </Button>
        }
        size="wide"
        open={open}
        onClose={close}
        title={translate(locale, "shell.quickSearch")}
        closeLabel={translate(locale, "common.close")}
      >
        <div className="ui-next-quick-search grid gap-4">
          <input
            autoFocus
            className="ui-next-control"
            value={query}
            placeholder={translate(locale, "shell.quickSearchPlaceholder")}
            aria-label={translate(locale, "shell.quickSearch")}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={choices[selected] ? `${listId}-${selected}` : undefined}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setSelected((value) => Math.min(value + 1, choices.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setSelected((value) => Math.max(value - 1, 0));
              } else if (event.key === "Enter" && choices[selected]) {
                event.preventDefault();
                activate(choices[selected]);
              }
            }}
          />
          <div
            className={
              loading || failed
                ? "ui-next-quick-search__status min-h-[1.25rem] text-sm text-ui-text-secondary"
                : "ui-next-visually-hidden"
            }
            role="status"
            aria-live="polite"
          >
            {loading
              ? translate(locale, "common.loading")
              : failed
                ? translate(locale, "shell.searchFailed")
                : null}
          </div>
          <div
            id={listId}
            tabIndex={-1}
            role="listbox"
            aria-label={translate(
              locale,
              query.trim() ? "shell.searchResults" : "shell.searchCommands",
            )}
            className="ui-next-quick-search__results max-h-[min(24rem,50dvh)] overflow-y-auto grid gap-1"
          >
            {choices.map((choice, index) => (
              <button
                key={choice.key}
                id={`${listId}-${index}`}
                type="button"
                role="option"
                tabIndex={-1}
                aria-selected={selected === index}
                className="ui-next-quick-search__result w-full flex items-center justify-between gap-4 border border-transparent rounded p-3 bg-transparent text-ui-text text-start cursor-pointer hover:border-ui-border hover:bg-ui-surface-sunken aria-selected:border-ui-border aria-selected:bg-ui-surface-sunken min-h-[2.75rem]"
                onMouseEnter={() => setSelected(index)}
                onClick={() => activate(choice)}
              >
                <span className="min-w-0 grid gap-1">
                  <strong className="text-sm font-semibold">{choice.title}</strong>
                  {choice.kind !== "command" ? (
                    <small className="text-xs text-ui-text-muted">{choice.context}</small>
                  ) : null}
                </span>
                <span className="text-xs text-ui-text-muted">
                  {choice.kind === "command" ? (
                    <span aria-hidden="true" className="text-sm">
                      ›
                    </span>
                  ) : (
                    translate(locale, `shell.kind.${choice.kind}`)
                  )}
                </span>
              </button>
            ))}
            {!loading && !failed && query.trim() && !choices.length ? (
              <p className="ui-next-quick-search__empty text-sm text-ui-text-muted">
                {translate(locale, "shell.noSearchResults")}
              </p>
            ) : null}
          </div>
        </div>
      </Dialog>
    </>
  );
}
