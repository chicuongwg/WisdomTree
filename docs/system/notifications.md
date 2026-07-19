# Notifications and Comments

## Purpose
- Specify how the platform reaches the team where it already is, and how discussion attaches to work objects, without building or hosting a chat product.
- Deliver the communication pillar as outbound notifications plus object-anchored comments.

## In Scope
- Notification channels: in-app, email, and Zalo Official Account.
- The event-to-notification matrix and per-user channel preferences.
- The `Comment` entity anchored to work objects, and the `personal` space for private notes.

## Out of Scope
- Real-time chat, presence, or direct messaging; these stay on Messenger and Zalo.
- Self-hosting any chat server.
- Video, voice, or file-sharing conversation features.

## Decisions
- WisdomTree does not build a chat product and does not self-host a chat server; both would force new accounts and lose adoption.
- Real-time messaging stays on Facebook Messenger and Zalo; the platform pushes outbound alerts to a Zalo Official Account and email, plus an in-app center.
- Durable discussion attaches to objects as comments, so context becomes part of the record instead of scrolling away in a chat app.
- Private notes are a `personal` space in the storage model, not a separate notes feature.
- Notifications are best-effort and additive: a channel outage never blocks the underlying workflow.

## Dependencies
- Communication pillar in [`../platform/platform-context.md`](../platform/platform-context.md).
- Module ownership in [`../platform/module-map.md`](../platform/module-map.md).
- Events in [`integration-contracts.md`](./integration-contracts.md).
- Objects that carry comments in [`data-model-lifecycle.md`](./data-model-lifecycle.md).

## Acceptance Criteria
- A member receives a notification through their chosen channels when an event relevant to them occurs.
- A member can comment on a source, node, loan ticket, or deadline, and the comment persists with the object.
- A member can keep private notes in a personal space that no one else can see.
- A Zalo or email outage delays alerts but never blocks the workflow that triggered them.

## Channels
- In-app: a notification center listing unread and recent notifications.
- Email: for members who prefer email or are not reachable on Zalo.
- Zalo Official Account: outbound messages to members who have connected their Zalo, matching where the team already communicates.
- Each member sets per-event channel preferences; the default favors Zalo and in-app for a Vietnamese team.

## Event-to-Notification Matrix

| Event | Recipient | Default channels |
| --- | --- | --- |
| `source.processing_failed` | Uploader | In-app, Zalo |
| Submission state changed | Uploader | In-app, Zalo |
| Correction or draft assigned | Assigned editor | In-app, email, Zalo |
| `source.ready_for_review` | Admin/Op | In-app, email |
| `tree.node.published` | Uploader and contributors | In-app |
| `loan.approved` | Borrower | In-app, Zalo |
| `loan.overdue` | Borrower and librarian | In-app, Zalo, email |
| `deadline.approaching` | Project members | In-app, Zalo, email |
| Comment mentioning a member | Mentioned member | In-app, Zalo |

## Comments
- A `Comment` is anchored to exactly one work object: a `Source`, a `Tree Node`, a `Loan Ticket`, or a `Deadline`.
- Comments are threaded and preserved as part of the object's history; they are not a chat channel.
- A comment may mention a member to notify them.
- Comment visibility follows the anchor object's permission scope: only those who can see the object can see its comments.
- Comments never mutate the anchor object's canonical state.

## Personal Notes
- Private notes are stored in a `personal` space, one per member, visible only to that member.
- A personal space reuses the storage model, so notes can hold files and text like any space, without a separate feature.

## Delivery and Reliability
- The `notify` module observes events from any module and owns only notification and comment records; it never mutates another module's canonical state.
- Delivery is best-effort with retry; a failed channel is retried and, if still failing, left visible in the in-app center.
- Zalo OA and email are outbound adapters; if either is unavailable, the triggering workflow still completes and the alert is retried.
