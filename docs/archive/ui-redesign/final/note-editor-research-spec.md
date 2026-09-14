# Note reader and editor specification

## One Note surface, explicit modes

The canonical Note route has two primary modes:

- **Reader:** official internal Note content and current version.
- **Editor:** the current actor's author-private Project draft, created or resolved through Stage 16 working-state services.

The UI never edits mutable official Note content directly and never asks for Branch or Personal/Team scope.

## Reader layout

```text
Project / Notes
Title                                             [Edit] [Inspector]
Purpose · Internal/publication state · Version
Summary
──────────────────────────────────────────────────────────────
Constrained multilingual reading canvas
──────────────────────────────────────────────────────────────
```

- Main body uses safe Markdown rendering.
- Purpose and publication state are concise labels, not dominant banners.
- `Edit` appears only when `capabilities.canEdit`.
- `Publish` actions appear in the Publication inspector only when `canPublish`.
- Evidence, history, and metadata live in the inspector.

## Editor layout

```text
Project / Notes / Working draft
Title                                               Saved · [Focus]
Private draft · Purpose: Synthesis                   [Inspector]
Summary
──────────────────────────────────────────────────────────────
Markdown editor                                   [Preview toggle]
──────────────────────────────────────────────────────────────
```

### Fields and behavior

- Title required according to service validation.
- Summary optional.
- Content Markdown uses one universal Unicode-preserving editor.
- Purpose optional: Unspecified, Evidence, Synthesis.
- Tags may be edited only where the Stage 16 draft contract accepts them; they are secondary metadata.
- Preview is a toggle or split view on wide screens; never force a permanent split.
- Editor shows `Private draft` continuously. Project ownership remains visible.

## Save/autosave contract

Stable states near the title/editor toolbar:

| State | Display | Behavior |
| --- | --- | --- |
| Unsaved | `Unsaved changes` | Schedule autosave; no toast. |
| Saving | `Saving…` | `aria-live="polite"`; editing remains possible. |
| Saved | `Saved` | Quiet inline state; no repeated toast. |
| Failed | `Save failed · Retry` | Persistent inline action; retain local buffer. |
| Conflict | `Changes conflict` | Stop autosave loop; open conflict recovery. |

Autosave should debounce approximately as current behavior permits; exact interval remains implementation-tuned. Navigation with a pending/failed local buffer prompts the actor. Navigation after confirmed save does not.

## Conflict recovery

`version_conflict` is a dedicated dialog/screen:

1. Explain that the draft changed elsewhere.
2. Preserve the actor's unsaved text.
3. Offer `Compare changes`, `Reload latest`, and `Copy my changes`/reapply workflow.
4. Never silently overwrite or discard.
5. Restore focus to the conflicted field/editor after resolution.

Where a true merge UI is not ready, safe fallback is side-by-side read-only latest versus local content plus explicit copy/reload—not a misleading automatic merge.

## Draft to official internal Note

The primary action is `Save as internal Note` / `Update internal Note`, not `Publish publicly`. It calls the Stage 16 draft publication boundary, atomically preserving purpose/evidence/candidate lineage. Confirm only when consequences need clarification; routine internal save should not require second-person approval.

## Inspector integration

Closed by default. Sections:

1. Context — Project, draft/official identity, purpose.
2. Evidence — attached exact Material/Note versions and `Add evidence`.
3. Metadata — summary/tags where appropriate.
4. History — official current/previous versions, compare/restore if supported.
5. Publication — stable public state/actions.

The selected section may be remembered per Note surface. Direct links may encode a section such as `?panel=history`; open/closed presentation need not be canonical URL state.

## Focus mode

Entering Focus mode:

- collapses global sidebar and Project tabs;
- closes the inspector but remembers its section/state;
- retains compact Project identity, private/official status, save state, `Evidence (n)`, and `Exit focus`;
- uses a comfortable maximum reading width rather than browser full-screen.

Escape first closes transient dialogs/drawers, not Focus mode unexpectedly. Exit button is always visible; an optional shortcut may be added after editor shortcut testing. On exit, the previous shell/inspector state is restored.

## Navigation warnings

- Saved or clean: navigate normally.
- Saving: wait briefly or allow navigation only after persistence acknowledgement.
- Failed/offline with local changes: confirm leaving and offer retry/copy.
- Conflict: warn that reconciliation is required; never discard on route change.

## Reading/editor wireframes

```text
NORMAL READER
┌──────────────┬──────────────────────────────────────┬───────────┐
│ Global nav   │ Project / Notes · Official v3       │ Inspector │
│              │ Title                        [Edit]  │ (optional)│
│ Project tabs │ content…                            │ Evidence  │
└──────────────┴──────────────────────────────────────┴───────────┘

FOCUS EDITOR
┌───────────────────────────────────────────────────────────────┐
│ Project · Private draft · Saved · Evidence (4) · Exit focus  │
│                                                               │
│                 multilingual Markdown editor                  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```
