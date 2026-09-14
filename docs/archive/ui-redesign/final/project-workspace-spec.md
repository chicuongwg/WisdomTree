# Project workspace specification

## Workspace shell

Every Project route receives `getProjectWorkspace(actor, projectId)` before rendering local navigation. The UI consumes its modules and named capabilities; it does not infer access from roles.

Project identity remains visible through a ProjectHeader or compact sticky form. Research-only access receives a quiet explanatory label and no operational/create affordances.

## Notes collection

Default: grouped list, not cards or a database-like table.

```text
My private drafts
  Title | purpose | save/working state | updated

Official Notes
  Title | purpose | publication state | version | updated
```

Why list: titles/summaries are research text, draft privacy needs obvious grouping, and a dense table would over-emphasize metadata.

Controls:

- local title filter over the complete returned list;
- local purpose grouping/filter: All, Evidence, Synthesis, Unspecified;
- local state grouping: Drafts and Official;
- local sort: updated descending by default, then stable title/ID.

Stage 16 exposes no Note-list filter/pagination options. These initial controls are client-local only over the complete returned list; server filtering/pagination requires a narrow facade extension before scale demands it. The list DTO also lacks per-note publication status, so publication filtering/badges require a composed narrow read. Until then publication state belongs on Note detail. Do not fabricate it client-side.

Selecting an item opens its canonical detail route. On wide screens an optional preview may preserve list position, but editing always has a stable route. Drafts have a privacy icon plus text `Private draft`; official Notes use no misleading “public” shorthand.

## Materials collection

Default: resource table on wide screens and structured list on narrow screens:

```text
Title | Digital | Physical | Extraction | Updated/Stored
```

Only show fields present in Stage 16 list DTO: current MIME/storage time/extraction state/has-text and physical item code/status. `Type/category` is deferred because no authoritative field is exposed. Stage 16 also exposes no Material-list filter/pagination options; any initial filtering is client-local over the complete returned list.

## Activities collection

Default: locally grouped complete returned list by status `planned`, `active`, `completed`, `cancelled` (cancelled collapsed). Fields: title, free-text type, status, updated. Stage 16 exposes no Activity-list filters/pagination; People/Task counts require detail calls and are not baseline collection columns.

## Tasks collection

- List is baseline because it supports title, state, assignee, due date, Activity context, and accessible quick updates.
- Board is allowed as a client view over the same complete returned Task IDs, grouped only by supported Task state. Stage 16 exposes no server board/filter contract.
- View choice is URL/local preference; mutation still uses the same Task contract and optimistic version.
- No global Board ownership language.

## Project People

Default list of canonical research Persons attached to the Project: display name and summary. This screen never mixes `space_members`, user accounts, access administration, or operational collaborators.

## Project-level states

- Loading: render Project header skeleton only after the confirmed route context is known; module content gets matching structure.
- Permission-limited: unavailable modules are omitted; Project Overview explains research-only access.
- Project status is descriptive. Paused/completed/archived does not cause the UI to invent action locks.
- Unknown/unauthorized Project follows non-disclosing not-found presentation.
