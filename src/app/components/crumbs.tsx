import Link from "next/link";
import { T } from "@/lib/vi";

/**
 * The way back to the list this record came from.
 *
 * Six detail screens dropped the reader on a bare <h1> — a page whose only
 * exit was the browser's back button, which is no exit at all for someone who
 * arrived from a notification, a search result or a pasted link. The library
 * had a trail through its folders and nothing else did.
 *
 * One line, above the title, in the reading column. Deliberately not a
 * multi-level path: every one of these screens is exactly one step from a
 * list, and inventing a hierarchy ("Tri thức / Chuyên đề / Trang") would be
 * furniture rather than information.
 */
export function Crumbs({ items }: { items: Array<{ label: string; href: string }> }) {
  return (
    <nav className="crumbs" aria-label={T.breadcrumbLabel}>
      {items.map((c, i) => (
        <span key={c.href}>
          {i > 0 && <span aria-hidden="true"> / </span>}
          <Link href={c.href}>{c.label}</Link>
        </span>
      ))}
    </nav>
  );
}
