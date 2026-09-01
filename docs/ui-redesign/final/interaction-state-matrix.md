# Interaction-state matrix

## Shared state language

| State | Baseline presentation |
| --- | --- |
| Loading | Structural skeleton only when layout is known; preserve prior content during refresh when safe. |
| Empty | Explain the domain state and show one authorized next action; no false creation affordance. |
| Success | Persist authoritative result inline; toast only for a discrete completed action. |
| Permission-limited | Omit unauthorized actions/data; explain research-only versus work access where useful without exposing raw roles. |
| Error | Stable localized reason, retained input, retry/recovery appropriate to error class. |
| Conflict | Dedicated version/state recovery, never generic failure or silent overwrite. |
| Network/offline | Do not claim persistence; retain local editable state where safe and expose retry/copy. |

## Major surfaces

| Surface | Loading | Empty | Permission-limited | Error/conflict | Network/offline | Success feedback |
| --- | --- | --- | --- | --- | --- | --- |
| TMKT Overview | Skeleton counts/Project rows | No active work or Projects, separately | Research Projects show no operations | Page-level retry; retain shell | Offline notice, cached shell only if clearly stale | No toast |
| Projects | List skeleton | No accessible confirmed Projects | Create omitted unless capability exists | Inline retry | Keep filter/query | Row navigation |
| Project workspace | Header then module skeleton | Module-specific | Unavailable modules omitted; research-only explanation | Non-disclosing not-found/route retry | Do not expose stale actions | No toast |
| Note collection | Group skeleton | No Notes/drafts; authorized `Create Note` | Core sees official only; no private drafts/create | Inline retry | Preserve filters | New draft navigates to editor |
| Note autosave | `Saving…` | N/A | Editing unavailable | `Failed` or dedicated `Conflict` | Preserve local buffer, retry/copy | Quiet `Saved`, no toast |
| Internal Note save | Button pending | N/A | Action absent | Invalid/version state with recovery | Retain draft | Discrete confirmation + reader navigation |
| Evidence attach | Picker row skeleton | No readable matching evidence | Inaccessible items absent | Per-item/transaction error; duplicates explicit | Keep selections, retry | Attached list updates; modest toast optional |
| Material create/upload | Form + per-file progress | N/A | Add/upload/physical actions omitted | Validation inline; upload retry | Retain metadata, reselect file if required | Material detail + completed upload toast |
| Extraction | Durable `Processing` status | No extraction/version | Evolve action absent | Failed/invalid state; supported retry only | Processing remains server state | `Ready`; created draft link |
| Activity collection/detail | Section skeleton | No Activities/relations | Core outsider module absent | Relation/state error inline | Retain form state | Relation appears inline |
| Task mutation | Affected control pending | No Tasks | Core outsider module absent | Revert optimistic state; show conflict | Queueing not assumed; retry | Inline state update |
| My Work | Group skeleton | No assigned Project work | Core-only Projects excluded | Page retry | Retain selected tab | No toast |
| Person list/detail | List/detail skeleton | No visible Persons | Edit/create omitted | Version conflict on edit | Retain form | Canonical update reflected in all contexts |
| Full Search | Result skeleton/retain old | No matches | Unauthorized scope absent | Retain query/facets + retry | Retain query | Results update, no toast |
| Quick Search | Dialog loading row | Guidance/commands/recent | Unauthorized recents/results absent | Compact retry or open Full Search | Commands that need server disabled | Route activation closes/restores focus |
| Publication | Panel pending | Never published is a state | Action absent without Core | Slug/invalid state inline; refresh status | Never optimistic | Revision/state update + discrete toast |
| Circulation | Row pending | No loans in selected state | Operational workspace/actions absent | Refresh invalid transition/version | No optimistic transition | Exact row state + toast |
| Locale change | Trigger pending | N/A | Always current-user action | Retain old locale, inline/menu error | Retain old locale | UI messages rerender; no content mutation |

## Application error mapping

| Error class | UI response |
| --- | --- |
| `not_found` | Non-disclosing unavailable/not-found route or object message; remove stale list item only after refresh confirms. |
| `forbidden` | Same non-disclosing object response where privacy requires; otherwise explain action is unavailable, never raw permission. |
| `invalid_input` | Field-level messages plus summary; retain input and focus first invalid field. |
| `version_conflict` | Dedicated compare/reload/reconcile flow; preserve local edits. |
| `invalid_state` | Refresh authoritative state and explain which workflow transition is no longer available. |
| `internal_error` | Stable generic failure with retry/reference path; no internal/driver messages. |

## Toast policy

Use a toast for a completed discrete action whose result may not otherwise be visible: file uploaded, public state changed, operator revoked, loan transitioned. Use inline status for autosave, validation, extraction, publication state, loan state, and persistent errors. Avoid duplicate toast plus inline announcement.

## Destructive/reversible confirmations

- Confirm: unpublish, archive where consequences are material, operator revoke, irreversible restore/overwrite, destructive delete if ever exposed.
- Contextual confirmation or undo: remove evidence/Activity relation.
- No confirmation: navigation, inspector close, filter change, opening focus mode.
