# People specification

## Product meaning

A Person is a canonical research identity. A Person may be a research subject, historical figure, collaborator, or community member and may have no application account.

The default UI does not show account linkage. Project People is not Project member/access administration.

## Global People

Global People shows canonical Persons visible through at least one readable confirmed Project.

Default representation: searchable list with:

- display name;
- short summary;
- visible Project contexts.

A Person linked to multiple readable Projects appears once. Project contexts are authorization-filtered. Core may see Persons across confirmed Projects; ordinary users see only their readable contexts.

Search may use the Stage 16 Person/search facade. No fuzzy deduplication or merge suggestions.

## Project People

Project People shows Persons attached to that Project. It supports:

- list/search;
- create Person in Project context when `canManagePeople`;
- attach an existing accessible Person when permitted;
- open canonical Person detail.

It must not show User roles, Project membership controls, email/account state, or a `Members` title.

## Person detail

```text
Display name                                             [Edit]
Summary
──────────────────────────────────────────────────────────────
Project contexts
  Project A · research context
  Project B · research context

Activities
  Only Activities actor may operationally read

Research context
  Future/available authorized references; do not invent links
```

Stage 16 `getAppPerson` currently returns Project IDs, not names or Activities. The initial detail must compose authorized Project references and Activity data only through safe server reads; otherwise show summary and Project context links only. Do not promise a research-reference graph not yet implemented.

## Editing

- Canonical edits affect the Person across Projects; state this in confirmation/helper text.
- Fields: display name and optional summary; optimistic version required.
- Duplicate names are valid and no warning implies they are duplicates.
- Edit action is shown only from a server-computed or safely derived mutation capability; current Person detail DTO does not expose `canEdit`, so Stage 17 needs a narrow capability addition or must omit editing from this surface.

## Natural Person ≠ User communication

Use contextual copy rather than technical banners:

- `People represented in this research`
- `Project contexts`
- `Add a person to this Project`

Avoid `User`, `account`, or `member` unless an explicit future administration surface is opened.

## Privacy

Do not expose hidden Project names, account linkage, raw user IDs, activity participation in inaccessible Projects, or public profile language. Person search applies authorization before results.
