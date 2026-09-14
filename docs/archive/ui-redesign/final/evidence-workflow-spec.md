# Evidence workflow specification

## Purpose

Attach immutable supporting research to a Project draft without leaving the writing context. The UI represents `SourceVersion` as a Material version and `TreeNodeVersion` as a Note version.

Internal supporting research is not automatically a public citation or bibliography.

## Entry points

- Note Inspector → Evidence → `Add evidence`.
- Focus mode compact bar → `Evidence (n)` → drawer → `Add`.
- Existing attached evidence → expand or remove.

Only an actor with target-draft mutation authority sees add/remove controls.

## Evidence Picker

Desktop: large modal or right-side workspace drawer wide enough for search + preview. Narrow: full-height sheet.

```text
Add supporting research
[Current Project] [Across readable Projects]
[Materials] [Notes]
[Search title or content…]
──────────────────────────────────────────────────────────────
□ Material · Bản đồ Huế 1924             Project X · Version 2
□ Note · Field Note: Nhà rường            Project Y · Version 3
──────────────────────────────────────────────────────────────
Selected: 2                              [Cancel] [Attach 2]
```

### Scope

- Default: target Note's current Project.
- Cross-Project toggle: available when readable research exists elsewhere; it never expands authorization.
- Inaccessible Projects/items are absent, not disabled discoverable results.
- Legacy/projectless research is absent from this target picker.

### Tabs and search

- Materials tab searches Material identities, then shows the current/selectable exact SourceVersion.
- Notes tab searches official Project Notes, then shows exact immutable versions.
- The Picker may use a narrow Stage 16 search/read composition; it must not pretend the current generic search result already contains version choices.
- Search is parameterized and uses authorized scope before exposure.

### Selection

- Each row includes type, title, Project, exact version number/date where available, and a preview action.
- Already-attached exact versions show `Attached` and cannot be duplicated.
- Different versions of the same object are distinct evidence choices, but the UI warns when another version is already attached.
- Selection survives switching Material/Note tabs during the current Picker session.
- `Cancel` changes nothing. `Attach n` performs explicit mutations and reports partial/failed results without losing successful selections.

## Preview

Collection-preserving preview shows enough metadata/content excerpt to identify evidence. It must not return full inaccessible bodies, file tokens, storage keys, or operational metadata. Preview preserves Picker selection and focus.

## Attached evidence display

Simple default:

```text
Material · Bản đồ Huế 1924
Note · Field Note: Nhà rường
```

Expanded provenance:

```text
Material
Bản đồ Huế 1924
Version 2 · Project X
[Open Material] [Remove]

Note
Field Note: Nhà rường
Version 3 · Project Y
[Open Note version] [Remove]
```

Version identity is always discoverable. Cross-Project ownership is shown but never changed.

## Removal and duplicates

- Removal affects only the support relation, not the Material/Note/version.
- A simple relation removal is immediately reversible during the local draft session or confirmed only when the domain action cannot be readily undone.
- Duplicate attach is idempotent or returns a clear `Already attached` inline result.
- Direct self-support is blocked with `This Note cannot support itself.`

## Publication/edit lifecycle

- Draft evidence remains author-private with the draft.
- Internal Note publication transfers support atomically.
- Editing an existing Note begins with its effective support set; add/remove changes publish with the edited draft.
- Candidate extraction lineage remains separate and is not automatically listed as supporting evidence unless deliberately attached.

## Errors

- Evidence becomes inaccessible before attach: non-disclosing inline message and remove it from selection.
- Version disappears/invalid state: `This version is no longer available for attachment.`
- Target draft conflict: preserve selections, resolve draft conflict first, then retry.
- Network failure: keep the Picker open and selected items locally; never claim attachment.
