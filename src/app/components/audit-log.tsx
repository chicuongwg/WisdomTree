"use client";

import { useState } from "react";
import Link from "next/link";
import { Empty } from "./empty";
import {
  T,
  when,
  actionLabel,
  targetKindLabel,
  detailFieldLabel,
  auditValueLabel,
  notificationEventLabel,
  channelLabel,
} from "@/lib/vi";
import { Say } from "./say";

// Admin Console, System section: the audit trail read back, in Vietnamese.
//
// The row as stored is three internal facts — a dotted action key, a table
// name, and a JSON payload — and the owner read all three on screen and said
// the log looked wrong. It was: the reader is a humanities researcher, and
// `task.update` with `{"to":"todo","from":"todo"}` beside it is a database
// dump, not a record of what someone did. This file is the whole translation
// layer: the action becomes a phrase, the object column names the thing and
// links to its page where the app has one, and the payload becomes sentences.
//
// ponytail: no filters; add when the log grows past scrolling.

export type AuditRow = {
  id: string;
  action: string;
  accountability: string;
  actorName: string | null;
  targetType: string | null;
  targetId: string | null;
  details: unknown;
  createdAt: string;
};

/**
 * Where a target type is readable in the app. Only these six have a page; the
 * rest (a folder, a comment, an export job) are named but not linked, because
 * a link that lands on a 404 is worse than plain text.
 */
const TARGET_HREF: Record<string, (id: string) => string> = {
  task: (id) => `/board/task/${id}`,
  tree_node: (id) => `/tree/node/${id}`,
  branch: (id) => `/tree/branch/${id}`,
  source: (id) => `/source/${id}`,
  catalog_item: (id) => `/catalog/${id}`,
  deadline: (id) => `/deadlines/${id}`,
};

/**
 * Which details key carries the object's own name. The modules record one of
 * these beside the id precisely so the log can say what the row is about;
 * whichever is present is lifted into the object column and then left out of
 * the details column, so the name is never printed twice.
 */
const NAME_KEYS = ["title", "name", "filename", "email"] as const;

/** An ISO timestamp as recorded by the services — printed as a moment, not a string. */
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/**
 * The name of one fact inside a payload. Most keys are the fields the modules
 * record; a notification-preferences payload nests event types and channel
 * names, and those already have Vietnamese in the same file, so they are tried
 * before the guarded lookup warns about a key it does not know.
 */
function fieldName(key: string): string {
  return notificationEventLabel[key] ?? channelLabel[key] ?? detailFieldLabel(key);
}

/**
 * One value, in words. Nothing is dropped: a value with no Vietnamese word for
 * it — an id, a file name, a code — is printed as it stands, because a log
 * that hides what it recorded cannot be checked against.
 */
function say(value: unknown): string {
  if (value == null || value === "") return T.auditEmptyValue;
  if (typeof value === "boolean") return value ? T.auditYes : T.auditNo;
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    if (ISO.test(value)) return when(value);
    return auditValueLabel[value] ?? value;
  }
  if (Array.isArray(value)) {
    return value.length === 0 ? T.auditEmptyValue : value.map(say).join(", ");
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    if ("from" in o || "to" in o) {
      return `${T.auditChangeFromTo} ${say(o.from)} ${T.auditChangeTo} ${say(o.to)}`;
    }
    return Object.entries(o)
      .map(([k, v]) => `${fieldName(k)}: ${say(v)}`)
      .join("; ");
  }
  return String(value);
}

/** The payload as a list of readable lines, with the object's name removed. */
function detailLines(details: unknown, usedNameKey: string | null): string[] {
  if (details == null) return [];
  if (typeof details !== "object" || Array.isArray(details)) return [say(details)];
  const rest = { ...(details as Record<string, unknown>) };
  if (usedNameKey) delete rest[usedNameKey];
  const lines: string[] = [];
  // A payload of nothing but `from`/`to` records a value moving, and the field
  // that moved is already named by the action ("Đổi vai trò thành viên"), so
  // the line says the movement rather than repeating the field.
  if ("from" in rest && "to" in rest) {
    lines.push(`${T.auditChange}: ${T.auditChangeFromTo} ${say(rest.from)} ${T.auditChangeTo} ${say(rest.to)}`);
  } else if ("from" in rest) {
    // Half a pair: an archive records what the thing WAS and nothing after,
    // because after it there is nothing. "sang để trống" would have read as
    // though a value was cleared, which is not what happened.
    lines.push(`${T.auditBefore}: ${say(rest.from)}`);
  } else if ("to" in rest) {
    lines.push(`${T.auditAfter}: ${say(rest.to)}`);
  }
  delete rest.from;
  delete rest.to;
  for (const [k, v] of Object.entries(rest)) {
    if (v === undefined) continue;
    lines.push(`${fieldName(k)}: ${say(v)}`);
  }
  return lines;
}

/** The object column: what kind of thing it is, its name, and a link if it has a page. */
function target(row: AuditRow): { kind: string; name: string | null; nameKey: string | null; href: string | null } {
  const kind = row.targetType ? targetKindLabel(row.targetType) : null;
  const d = row.details && typeof row.details === "object" ? (row.details as Record<string, unknown>) : {};
  const nameKey = NAME_KEYS.find((k) => typeof d[k] === "string" && (d[k] as string).trim() !== "") ?? null;
  const href = row.targetType && row.targetId ? (TARGET_HREF[row.targetType]?.(row.targetId) ?? null) : null;
  // A row with no target at all keeps the em dash the table used before — the
  // event is about the system, not about a thing that can be named.
  return { kind: kind ?? "—", name: nameKey ? (d[nameKey] as string) : null, nameKey, href };
}

export function AuditLog({ initial }: { initial: AuditRow[] }) {
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A short first page means there is no second page.
  const [done, setDone] = useState(initial.length < 50);
  // The server sent a new first page — a refresh, or back/forward onto this
  // screen. Without this the table kept showing whatever was fetched when the
  // component first mounted, plus any pages loaded by hand since, and a reload
  // changed nothing on screen. (Adjusting state during render, rather than in
  // an effect, is React's own documented answer for "derive from props": it
  // re-renders immediately instead of painting the stale rows first.)
  const [seed, setSeed] = useState(initial);
  if (seed !== initial) {
    setSeed(initial);
    setRows(initial);
    setDone(initial.length < 50);
  }

  async function loadMore() {
    const last = rows[rows.length - 1];
    if (!last) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/audit?before=${encodeURIComponent(last.createdAt)}`);
      if (!res.ok) throw new Error();
      const page = (await res.json()) as AuditRow[];
      setRows((r) => [...r, ...page]);
      if (page.length < 50) setDone(true);
    } catch {
      setError(T.genericError);
    }
    setBusy(false);
  }

  return (
    <>
      {rows.length === 0 ? (
        <Empty title={T.auditEmpty} panel={false} />
      ) : (
        <div className="record-scroll">
          <table className="list">
            <thead>
              <tr>
                <th scope="col">{T.timeColumn}</th>
                <th scope="col">{T.actorColumn}</th>
                <th scope="col">{T.actionColumn}</th>
                <th scope="col">{T.targetColumn}</th>
                <th scope="col">{T.detailsColumn}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const t = target(r);
                const lines = detailLines(r.details, t.nameKey);
                const label = t.name ?? t.kind;
                return (
                  <tr key={r.id}>
                    <td>{when(r.createdAt)}</td>
                    {/* "Hệ thống" = no actor (system job) */}
                    <td>{r.actorName ?? <span className="muted">{T.systemActor}</span>}</td>
                    <td>{actionLabel(r.action)}</td>
                    <td>
                      {t.href ? (
                        <Link href={t.href} title={`${T.auditOpenTarget} ${t.kind.toLowerCase()}`}>
                          {label}
                        </Link>
                      ) : (
                        label
                      )}
                      {t.name && <div className="muted audit-kind">{t.kind}</div>}
                    </td>
                    <td>
                      {lines.length === 0 ? (
                        <span className="muted">{T.auditNoDetails}</span>
                      ) : (
                        // Index in the key: two detail lines can render the same
                        // words (two fields folding to one Vietnamese label),
                        // and duplicate keys make React drop one of them.
                        lines.map((line, i) => (
                          <div key={`${i}-${line}`} className="audit-detail">
                            {line}
                          </div>
                        ))
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Say error={error} />
      {!done && rows.length > 0 && (
        <button type="button" className="secondary" disabled={busy} onClick={() => void loadMore()}>
          {busy ? T.loading : T.loadMore}
        </button>
      )}
    </>
  );
}
