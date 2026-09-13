# PC2 final capability ledger

Date: 2026-09-13. This is the post-decision ledger for the PC0 capability set. It preserves outcomes that serve traceability, stewardship, and research workflow, and retires only owner-approved legacy structures.

## Resolution status

The historical audit initially listed 36 rows. The password/device-session row was independently checked against pre-cutover routes, history, and tests and was not an evidenced user capability. It is removed from the parity denominator rather than invented, preserved, or retired.

|                  Baseline | PRESERVED | REPLACED | REDESIGNED | EXPLICITLY RETIRED | BACKEND ONLY | MISSING | UNKNOWN |
| ------------------------: | --------: | -------: | ---------: | -----------------: | -----------: | ------: | ------: |
| 35 evidenced capabilities |        15 |        8 |          7 |                  5 |            0 |       0 |       0 |

## PC2 resolutions

|   # | User outcome                                                      | Final classification | Target behavior / decision evidence                                                                                                                                                                       |
| --: | ----------------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  11 | Inspect a Note revision, compare it, and restore a working draft. | REDESIGNED           | Project Note History lists immutable versions, reads a selected version/diff, and restores it only into the authorized contributor's draft.                                                               |
|  12 | Organize knowledge in Tree/Branch hierarchy.                      | EXPLICITLY RETIRED   | Owner rejected hierarchy restoration. Project, links/backlinks, and future tags/collections are the target organization model; no Tree/Branch UI returns.                                                 |
|  13 | Move personal knowledge into shared research.                     | REDESIGNED           | A Personal Note can be copied to an authorized Shared Project working draft with the originating immutable Note version attached as provenance. Legacy proposal architecture is not reused as a workflow. |
|  14 | Formal multilingual translation workflow.                         | EXPLICITLY RETIRED   | Locale and research-language support remain baseline; formal translation author/review flow is not a current requirement.                                                                                 |
|  15 | Follow related notes through links/backlinks/TOC/navigation.      | REDESIGNED           | Project Note reader exposes a heading TOC, same-Project links/backlinks, and previous/next Notes. Cross-Project targets are excluded.                                                                     |
|  16 | Independent maker-checker review queue.                           | EXPLICITLY RETIRED   | Core publication authority remains. The legacy generic second-person queue does not return.                                                                                                               |
|  17 | Produce a whole-Space portable release.                           | REDESIGNED           | Shared Project settings exposes a Project export action using the verified Markdown/XML manifest pipeline without WikiRelease UI. Personal Projects cannot export.                                        |
|  24 | See one's submitted Materials and their state.                    | REDESIGNED           | Account shows My Materials, scoped to caller-visible Project Materials; global non-Project ownership scope is not reintroduced.                                                                           |
|  25 | Correct metadata and withdraw/archive a Material.                 | REDESIGNED           | Material detail permits the submitting/assigned steward to rename metadata and archive a stored version; immutable source bytes/version history remain intact.                                            |
|  26 | Human disposition of extracted candidates.                        | REDESIGNED           | Material detail supports target Project candidate read, evolve to a working Note, or recorded rejection.                                                                                                  |
|  28 | Browse non-Project catalogues/folders.                            | EXPLICITLY RETIRED   | Research Materials belong to Projects. Search can later provide cross-Project discovery; no second ownership catalogue exists.                                                                            |
|  32 | Persist saved Personal Graph groups.                              | EXPLICITLY RETIRED   | Graph remains a secondary visualization scoped by Personal/Shared Project, not a workspace manager.                                                                                                       |
|  35 | View organizational membership from Account.                      | REPLACED             | `/app/projects` separates My Project and Shared Projects and is the complete membership representation. Account does not duplicate it.                                                                    |

## Owner decision closure

| Decision                                                                           | Chosen option             | Consequence                                                                              |
| ---------------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------- |
| DQ-1 history / hierarchy / promotion / translation / navigation / review / release | A / B / A / B / A / B / A | Four target-native research seams delivered; three legacy structures explicitly retired. |
| DQ-2 submissions / lifecycle / candidate review / non-Project browse               | A / A / A / B             | Account and Material seams delivered; non-Project catalogue explicitly retired.          |
| DQ-3 saved Personal Graph groups                                                   | B                         | Explicitly retired; no private Graph persistence added.                                  |
| DQ-4 Account membership visibility                                                 | B                         | Replaced by the canonical Projects list.                                                 |

## Exact implementation batches completed

1. **Research traceability:** Project Note history/read/diff/restore, heading TOC, same-Project links/backlinks/previous-next, and Personal-to-Shared promotion with immutable origin support.
2. **Material stewardship:** Account My Materials; owner/assignee-only metadata update and withdrawal; target candidate rejection alongside the existing evolve-to-working-Note path.
3. **Portable dissemination:** Shared Project export action over the existing verified vault/manifest service, deliberately without legacy WikiRelease presentation.
4. **Decision closure:** no hierarchy, translation workflow, maker-checker queue, non-Project catalogue, saved Graph groups, or duplicate Account membership view was implemented.

## Historical finding

Password/device/session management is **not an evidenced pre-cutover capability**. The final pre-cutover Account routes offered profile, notification preferences, calendar token, My Submissions, and Project navigation; session code identified the current principal only. No password, device, passkey, or session-management route/test was found. It is therefore outside the parity ledger and does not create new product scope.
