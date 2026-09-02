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
      kind: "project" | "note" | "material";
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
  if (result.kind === "person") return `/app/people?personId=${encodeURIComponent(result.id)}`;
  return `/app/projects/${result.project.id}?${result.kind}Id=${encodeURIComponent(result.id)}`;
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
          context: "TMKT",
          href: "/app",
          kind: "command",
        },
        {
          key: "projects",
          title: translate(locale, "nav.projects"),
          context: "TMKT",
          href: "/app/projects",
          kind: "command",
        },
        {
          key: "work",
          title: translate(locale, "nav.myWork"),
          context: "TMKT",
          href: "/app/my-work",
          kind: "command",
        },
        {
          key: "people",
          title: translate(locale, "nav.people"),
          context: "TMKT",
          href: "/app/people",
          kind: "command",
        },
      ];
    }
    return results.map((result) => ({
      key: `${result.kind}:${result.id}`,
      title: result.title,
      context:
        result.kind === "person"
          ? result.projects.map((project) => project.name).join(" · ")
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
        className="ui-next-quick-search-trigger"
        onClick={() => setOpen(true)}
      >
        <span>{translate(locale, "shell.quickSearch")}</span>
        <kbd>{translate(locale, "shell.quickSearchHint")}</kbd>
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title={translate(locale, "shell.quickSearch")}
        closeLabel={translate(locale, "common.close")}
      >
        <div className="ui-next-quick-search">
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
          <div className="ui-next-quick-search__status" role="status" aria-live="polite">
            {loading
              ? translate(locale, "common.loading")
              : failed
                ? translate(locale, "shell.searchFailed")
                : null}
          </div>
          <div
            id={listId}
            role="listbox"
            aria-label={translate(
              locale,
              query.trim() ? "shell.searchResults" : "shell.searchCommands",
            )}
            className="ui-next-quick-search__results"
          >
            {choices.map((choice, index) => (
              <button
                key={choice.key}
                id={`${listId}-${index}`}
                type="button"
                role="option"
                aria-selected={selected === index}
                className="ui-next-quick-search__result"
                onMouseEnter={() => setSelected(index)}
                onClick={() => activate(choice)}
              >
                <span>
                  <strong>{choice.title}</strong>
                  <small>{choice.context}</small>
                </span>
                <span>
                  {choice.kind === "command" ? "↗" : translate(locale, `shell.kind.${choice.kind}`)}
                </span>
              </button>
            ))}
            {!loading && !failed && query.trim() && !choices.length ? (
              <p className="ui-next-quick-search__empty">
                {translate(locale, "shell.noSearchResults")}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
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
        </div>
      </Dialog>
    </>
  );
}
