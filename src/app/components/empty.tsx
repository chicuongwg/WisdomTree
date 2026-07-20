import type { ReactNode } from "react";
import Link from "next/link";

// An empty screen is an invitation to act, not a gap in the page. The pattern
// was already here — .empty-state in globals.css, used well on three screens —
// while seventeen other places printed a bare "Chưa có mục nào." with nothing
// to do next. This is that pattern, cheap enough that the bare paragraph has
// no excuse left.
//
// `hint` is the second line; `action` is the one emphasised thing on the
// screen. A list that is empty because a filter matched nothing wants a link
// out of the filter, not a create button — pass a plain <Link> for that.

export function Empty({
  title,
  hint,
  action,
  panel = true,
}: {
  title: string;
  hint?: string;
  /** A label + href renders the primary button; a node is used as-is. */
  action?: { label: string; href: string } | ReactNode;
  /** False when the caller is already inside a .panel (a board lane, a card). */
  panel?: boolean;
}) {
  const isLink = (v: unknown): v is { label: string; href: string } =>
    !!v && typeof v === "object" && "href" in (v as object);

  return (
    <div className={panel ? "panel empty-state" : "empty-state"}>
      <p>{title}</p>
      {hint && <p className="muted">{hint}</p>}
      {isLink(action) ? (
        <Link className="button" href={action.href}>
          {action.label}
        </Link>
      ) : (
        (action as ReactNode)
      )}
    </div>
  );
}
