# Internal publishing interaction specification

## Boundary

This specification covers internal controls that publish an official Project Note to an immutable public revision. It does not design the public Explore site.

Only explicit current Core publication capability authorizes actions. Project manager, contributor, editor, admin, or Note author labels never imply publication.

## Publication states

| Domain state | Recommended UI | Meaning |
| --- | --- | --- |
| `never_published` | `Never published` | No public identity/revision exists. |
| `published_current` | `Published · Revision n · Up to date` | Current public revision matches current official Note version. |
| `published_with_changes` | `Published · Changes not public` | Public still shows an older immutable revision. |
| `unpublished` | `Unpublished · Previous revision retained` | Public availability is off; history remains. |

Use icon + text; color is secondary.

## Publication panel

Inspector → Publication:

```text
Published · Revision 3
Public content is up to date.
Public URL: /n/stable-slug
[Unpublish]

or

Published · Revision 3
This Note has internal changes not yet public.
[Publish changes]
```

Non-Core readers see state and stable URL where appropriate but no action. Core outside Project membership may publish an eligible official Note but cannot edit it.

## First publish

1. `Publish publicly` opens confirmation describing the immutable snapshot and stable URL.
2. Optional slug input is shown only on first publication if supported by the facade.
3. Submit calls `publishAppNote`.
4. Success updates state/revision; discrete toast may confirm public availability.
5. Repeating publish with no change returns no-change state without fake revision/toast history.

No Proposal or second-person approval step.

## Publish changes

Confirmation states: `The public page currently shows Revision n. Publishing creates the next immutable revision from official Note version v.` Internal draft content is never published directly; the official Note must first be updated.

## Unpublish

Requires confirmation because public availability changes:

```text
Unpublish this Note?
The public page will become unavailable. Publication identity and revision history are retained.
```

Success shows `Unpublished`. Do not imply deletion. Republish unchanged source reactivates the previous revision; changed source creates the next revision according to Stage 13.

## History

Public revision history is secondary inside Publication/History. It shows revision number, publication time, and exact source Note version. Historical revisions are not automatically public links.

## Errors and concurrency

- Core revoked: action disappears on refresh; an attempted action returns permission-limited state, not retry loop.
- Version/invalid state: refresh official/publication status and explain whether internal Note changed.
- Slug collision: inline slug error, preserve the rest of confirmation state.
- Network failure: remain on prior authoritative publication state; never optimistically expose/unexpose public content.
