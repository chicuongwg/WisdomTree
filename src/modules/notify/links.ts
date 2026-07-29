// Relative, not "@/": this module is deliberately importable from scripts/
// (scripts/proofs.ts Proof 7) where the bundler alias does not exist.
import { eventLabel } from "../../lib/vi";

// The ONE notification "jump to" resolver (docs/system/notifications.md §
// Notification Center): (eventType, payload) → the route of the object the
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

export type NotificationLink = { href: string; label: string };

/** Comment anchors, mirroring comments.anchorType. */
export type AnchorType = "source" | "tree_node" | "deadline";

export type NotificationLinkContext = {
  /** loan ticket id → catalog item id, for loan payloads carrying no itemId. */
  ticketItemIds?: Readonly<Record<string, string>>;
  /**
   * Source ids on which the VIEWER is the assignee of an existing curation.
   * Presence routes to the editor workbench; absence to the member view.
   */
  assignedSourceIds?: readonly string[];
  /** The viewer's role — decides the Admin/Op-only source routes. */
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
  if (!anchorId) return null;
  switch (anchorType) {
    case "tree_node":
      return `/tree/node/${anchorId}`;
    case "source":
      // Assigned Editor keeps their workbench; everyone else gets the member
      // view (screen-inventory.md: `/source/task/:id` is Assigned Editor +
      // Admin/Op, `/library/:id` is the member Stored Item Detail).
      return (ctx.assignedSourceIds ?? []).includes(anchorId)
        ? `/source/task/${anchorId}`
        : `/library/${anchorId}`;
    case "deadline":
      return `/deadlines/${anchorId}`;
    default:
      return null;
  }
}

/** Anchors whose detail screen renders the shared comment block. */
const ANCHORS_WITH_COMMENTS: ReadonlySet<string> = new Set<AnchorType>([
  "source",
  "tree_node",
  "deadline",
]);

function hrefFor(eventType: string, payload: Payload, ctx: NotificationLinkContext): string | null {
  switch (eventType) {
    case "tree.node.published":
      return anchorHref("tree_node", str(payload.nodeId), ctx);

    case "source.ready_for_review":
      // Recipients are Admin/Op only (dispatcher resolveRecipients). The
      // object is ONE intake item, so we deep-link Source Detail — the
      // Admin/Op screen whose goal is "inspect one intake item in depth"
      // (admin-op-screen-specs.md § Source Detail) and whose actions include
      // "proceed to draft review". `/review` is a queue: it would make the
      // reader hunt for the row this notification is already about.
      // Defensive: a non-admin recipient (preference row edited by hand)
      // falls back to the member view rather than a 404.
      return ctx.viewerRole === "admin_op"
        ? str(payload.sourceId) && `/source/${str(payload.sourceId)}`
        : anchorHref("source", str(payload.sourceId), ctx);

    case "source.assigned":
    case "source.processing_failed":
    case "source.approved":
      return anchorHref("source", str(payload.sourceId), ctx);

    case "loan.approved":
    case "loan.borrowed":
    case "loan.returned":
    case "loan.declined":
    case "loan.overdue":
    case "loan.requested": {
      // Payloads from circulation carry itemId; fall back to the ticket
      // lookup so a payload written without it still resolves.
      const itemId = str(payload.itemId);
      if (itemId) return `/catalog/${itemId}`;
      // There is no ticket screen: a loan lives on its Catalog Item Detail,
      // where the loan record block names borrower, approver and due date.
      const ticketId = str(payload.ticketId);
      const viaTicket = ticketId ? ctx.ticketItemIds?.[ticketId] : null;
      return viaTicket ? `/catalog/${viaTicket}` : null;
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
  return { href, label: eventLabel(eventType) };
}
