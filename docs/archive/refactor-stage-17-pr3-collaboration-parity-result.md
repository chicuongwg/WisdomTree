# Stage 17.PR3 — Collaboration Parity result

## 1. Verdict

PARTIAL. The target restores the complete collaboration loop for retained, safe
anchors: a Shared Project member can comment on a Note or Material, select an
authorized User mention, notify that User, open the target context at the exact
comment, reply, and see context presence. The retained schema has no anchors
for Activities or Tasks, so their comment surfaces are intentionally not
invented in this stage. No migration or second collaboration architecture was
introduced.

## 2. Worker usage

Codex Terra Extra High implemented and validated the work. Three read-only
Luna scouts audited the retained comment domain, authorization/privacy model,
and target integration points.

## 3. Existing collaboration model reused

- `comments` remains the one append-only model, with existing `source`,
  `tree_node`, and `deadline` anchors, author User, timestamp, body, mentions,
  and one-level reply parent.
- Existing mention parsing resolves enabled User IDs at write time; display
  names are only input/display text.
- Existing `notifications`, notification fan-out, and notification preferences
  remain the sole in-app notification system.
- Existing presence storage and 45-second heartbeat / 90-second expiry remain
  the sole presence mechanism.
- No schema migration, generic event bus, realtime transport, rich-text
  system, or package was added.

## 4. Comments

- Target Note comments use the existing `tree_node` anchor.
- Target Material comments use the existing `source` anchor.
- Existing deadline comments now have a target Calendar deadline detail route,
  so the retained deadline capability is not silently abandoned.
- The restrained target discussion section shows author, time, body, rendered
  mentions, replies, accessible composer, and context presence.
- Normal comments remain valid and do not notify all Project members.

## 5. @Mentions

- The composer provides keyboard-selectable `@` candidates drawn only from
  enabled current Project members.
- Creation persists resolved User IDs through the existing parser; Unicode
  content is preserved.
- A User who cannot open the context cannot be offered or resolved as a
  mention, and no notification is used as an access grant.
- Existing one-level replies are restored. Comment edit/delete was not added:
  the retained model exposes no such behavior.

## 6. Notifications

- `/app/notifications` lists the current User's notifications with semantic
  unread/read state and per-notification mark-read control.
- The target shell has a bell affordance and existing unread count.
- Mention notifications are created through existing `comment.created`
  fan-out and honor existing `comment.created` preferences.
- Target link hydration never falls back to removed legacy Tree, Library, or
  deadline routes.

## 7. Presence

- Note, Material, and target deadline discussion sections heartbeat through
  explicit target presence endpoints backed by the retained service.
- Presence is advisory, excludes disabled users, and only returns viewers who
  have passed the same target-context authorization.
- Core research-read alone does not expose operational collaboration presence.

## 8. Personal/Shared Project authorization

- Shared Project collaboration is current operational membership, not merely
  Core research-read access.
- Personal Project collaboration remains owner-only under the present sharing
  model; unrelated users cannot read its comments, candidates, or presence.
- The target facade enforces Project policy before delegating to retained
  comment, notification, and presence services.

## 9. Target routes/UI

- Notes: `/app/projects/:projectId/notes/:noteId`
- Materials: `/app/projects/:projectId/materials/:materialId`
- Retained deadline comments: `/app/calendar/deadlines/:deadlineId`
- Notification center: `/app/notifications`
- Note and Material mention notifications deep-link to the canonical target
  detail route and `#comment-:id` when the retained comment ID supports it.
- Public `/p/:slug` remains a public Note projection and has no comments,
  mentions, presence, or notification data.

## 10. Browser smoke

Temporary Nix Chromium ran against the production standalone build and the
isolated `wisdomtree_test_pr3_20260912` database.

- 1440×900: User A opened a Shared Project Note, selected User B via `@`, and
  submitted Unicode comment text.
- 768×1024: User B opened `/app/notifications`, opened the exact target comment
  link, saw User A in presence, and replied.
- 390×844: User A opened a Material and submitted a normal comment.
- Existing generic production E2E smoke also passed (3 tests).

Activity and Task comment browser smoke is not applicable: neither has a safe
retained comment anchor.

## 11. Security/privacy

The collaboration integration test covers authorized creation, Unicode,
ordering/replies, resolved author and target IDs, valid notification and exact
link, mark-read ownership, preference opt-out, outsider denial, Personal
Project isolation, Core-only denial of operational collaboration, and disabled
User removal from candidates/presence. The existing privacy suite also passed.
The public projection retains no collaboration imports.

## 12. Validation

Fresh migrated and seeded isolated PostgreSQL database:
`wisdomtree_test_pr3_20260912`.

- PASS `npm run test:unit` — 20 files
- PASS `npm run test:integration` — 27 files, including PR3 collaboration
- PASS `npm run test:usecase` — 3 files
- PASS `npm run test:privacy` — 2 files
- PASS `npm test`
- PASS `npm run build`
- PASS `git diff --check`
- PASS `npm run test:boundaries` — 254 delivery files, no direct DB access
- PASS `npm run test:e2e` with temporary Nix Chromium — 3 tests
- PASS targeted Chromium collaboration smoke at all three required viewports

## 13. Files changed

PR3 adds target collaboration adapters and UI under `src/modules/application`,
`src/app/api/app`, `src/app/app`, and `src/app/components/ui-next`; hardens the
retained presence and notification link adapters; adds the PR3 integration and
unit coverage; and corrects one stale activity test expectation that treated
the accepted PR2 Personal Project as a non-Project context. Existing dirty
worktree changes from earlier accepted stages were preserved.

## 14. Remaining parity gaps

- Activity and Task comments, mentions, notifications, and presence are
  BLOCKED by the retained `comments.anchor_type` constraint
  (`source | tree_node | deadline`). Adding either would require a new
  persistence model or migration, prohibited pending coordinator review.
- The retained notification domain has no mark-all-read operation; the target
  exposes its supported per-notification mark-read behavior.
- No new comment edit/delete behavior was introduced because the retained
  backend does not expose it.
