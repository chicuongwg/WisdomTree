// Relative, not "@/": this module is deliberately importable from scripts/
// (scripts/proofs.ts Proof 7) where the bundler alias does not exist.
import { eventLabel } from "../../lib/vi";

// The ONE notification "jump to" resolver: (eventType, payload) → the route of the object the
// notification is about, plus the Vietnamese sentence that becomes the link
// text. Both surfaces that render notifications — the Home panel and
// `/notifications` — call this, so a row can never link to one place on one
// screen and somewhere else on the other.
//
// Deliberately PURE and dependency-free (vi.ts only): no db import, so it is
// unit-testable from scripts/ and safe to pull into a client component. The
// few facts that need a database read (a loan ticket's item, whether the
// viewer holds the curation) are hydrated once per page by
// buildNotificationLinkContext() in ./service and handed in as `ctx`.
//
// An event we cannot map returns null — the caller renders plain text. A dead
// link is worse than no link.

export type NotificationLink = { href: string; label: string; subject?: string };

/** Comment anchors, mirroring comments.anchorType. */
export type AnchorType = "source" | "tree_node" | "deadline" | "activity" | "task";

export type NotificationLinkContext = {
  /**
   * Authorised target paths keyed by "anchorType:anchorId". The target UI
   * owns these paths; an absent entry deliberately renders as text instead of
   * falling back to a removed legacy route.
   */
  anchorHrefs?: Readonly<Record<string, string>>;
  /** Safe current titles keyed by "anchorType:anchorId". */
  anchorTitles?: Readonly<Record<string, string>>;
  /** loan ticket id → source id, for older payloads carrying no sourceId. */
  ticketSourceIds?: Readonly<Record<string, string>>;
  /** The viewer's role — kept for role-aware routes. */
  viewerRole?: "user" | "editor" | "admin_op";
};

type Payload = Record<string, unknown>;

const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);

/**
 * Anchor → route. `comment.created` delegates here so a comment always lands
 * on the same screen the commented object lives on.
 */
export function anchorHref(
  anchorType: string | null,
  anchorId: string | null,
  ctx: NotificationLinkContext = {},
): string | null {
  if (!anchorType || !anchorId) return null;
  return ctx.anchorHrefs?.[`${anchorType}:${anchorId}`] ?? null;
}

/** Anchors whose detail screen renders the shared comment block. */
const ANCHORS_WITH_COMMENTS: ReadonlySet<string> = new Set<AnchorType>([
  "source",
  "tree_node",
  "deadline",
  "activity",
  "task",
]);

function hrefFor(eventType: string, payload: Payload, ctx: NotificationLinkContext): string | null {
  switch (eventType) {
    case "tree.node.published":
      return anchorHref("tree_node", str(payload.nodeId), ctx);

    case "source.processing_failed":
      return anchorHref("source", str(payload.sourceId), ctx);

    case "loan.approved":
    case "loan.borrowed":
    case "loan.returned":
    case "loan.declined":
    case "loan.overdue":
    case "loan.requested": {
      // Payloads from circulation carry sourceId; fall back to the ticket
      // lookup so an older payload still resolves. There is no ticket screen:
      // a loan lives on its Library item detail, where the loan record block
      // names borrower, approver and due date.
      const sourceId = str(payload.sourceId);
      if (sourceId) return anchorHref("source", sourceId, ctx);
      const ticketId = str(payload.ticketId);
      const viaTicket = ticketId ? ctx.ticketSourceIds?.[ticketId] : null;
      return viaTicket ? anchorHref("source", viaTicket, ctx) : null;
    }

    case "deadline.approaching":
    case "deadline.created":
      return anchorHref("deadline", str(payload.deadlineId), ctx);

    case "comment.created": {
      const base = anchorHref(str(payload.anchorType), str(payload.anchorId), ctx);
      if (!base) return null;
      const commentId = str(payload.commentId);
      // The anchor screens all render the shared comment block, which gives
      // every comment an id="comment-<id>" so the browser scrolls to it.
      return commentId && ANCHORS_WITH_COMMENTS.has(str(payload.anchorType) ?? "")
        ? `${base}#comment-${commentId}`
        : base;
    }

    default:
      return null; // unknown event → the caller renders plain text
  }
}

/**
 * The resolver. Returns null when the event has no object we can open, so
 * callers render the label as text instead of a link that goes nowhere.
 */
export function notificationLink(
  eventType: string,
  payload: unknown,
  ctx: NotificationLinkContext = {},
): NotificationLink | null {
  const p: Payload = payload !== null && typeof payload === "object" ? (payload as Payload) : {};
  const href = hrefFor(eventType, p, ctx);
  if (!href) return null;
  // Link text is the event sentence itself ("Bạn được giao việc hiệu đính"),
  // never "bấm vào đây": it reads on its own out of context.
  const anchorType =
    str(p.anchorType) ??
    (eventType === "tree.node.published"
      ? "tree_node"
      : eventType === "source.processing_failed"
        ? "source"
        : eventType.startsWith("deadline.")
          ? "deadline"
          : null);
  const anchorId =
    str(p.anchorId) ??
    (anchorType === "tree_node"
      ? str(p.nodeId)
      : anchorType === "source"
        ? str(p.sourceId)
        : anchorType === "deadline"
          ? str(p.deadlineId)
          : null);
  const subject =
    anchorType && anchorId ? ctx.anchorTitles?.[`${anchorType}:${anchorId}`] : undefined;
  return { href, label: eventLabel(eventType), ...(subject ? { subject } : {}) };
}
