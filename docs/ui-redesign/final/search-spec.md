# Search specification

## One search foundation, two interactions

Quick Search and Full Search consume the same authorized Stage 16 internal research search. They differ in interaction purpose, not indexed content.

| Interaction | Purpose | Persistence |
| --- | --- | --- |
| Quick Search | navigate fast, recent objects, safe commands | transient dialog; query transfers to Full Search on request |
| Full Search | explore/filter authorized research | URL query, type, and Project facet |

## Searchable types

- Projects
- official Project Notes
- Project Materials
- canonical Persons

Never Tasks, Activities, private drafts, legacy/projectless data, extraction candidates, loans, or audit.

## Quick Search

Empty query:

```text
Recent authorized objects
Readable Projects
Commands
```

Query:

```text
[query________________________________]
Projects
  Project title · lens
Notes
  Note title · Project
Materials
  Material title · Project
People
  Person name · visible Projects
──────────────────────────────────────
View all results
```

Recent items are local/convenience state filtered through current authorization before display. No persistent sidebar Recents.

## Full Search

```text
Search research
[query________________________________________________]
[All] [Projects] [Notes] [Materials] [People]
Project: [All readable Projects ▾]
────────────────────────────────────────────────────────
kind · title · summary · visible Project context · score order
```

Baseline filters only: type and Project IDs, matching Stage 16. Purpose, publication state, tags, dates, and Activity are not specified until application search supports them.

Project facet scope is requested IDs intersected with authorized readable confirmed Projects. Inaccessible Project existence is not disclosed.

## Result behavior

- Explicit kind label and icon plus text.
- Title, safe short summary, and Project context.
- Person appears once with only visible contexts.
- Selecting opens canonical object route.
- Wide optional preview preserves results/query; narrow uses full detail navigation with Back restoring query/scroll.
- Stable ordering follows Stage 14 relevance and ID tie-breaker; UI does not rerank client-side.

## Input and states

- Trim whitespace; reject empty and overlong query using stable `invalid_input` copy.
- Special syntax is plain text to the service, never raw SQL/query language.
- Initial Full Search may show guidance, not all research.
- Loading retains prior results with `Updating results…` when safe; first load uses structured rows.
- Zero result gives query/facet-specific guidance and never hints at inaccessible results.
- Search failure retains query and offers retry.

## Privacy

Authorization is applied server-side before results. Core access expands confirmed-Project research only. Core revocation changes the next query scope. Quick Search recents are revalidated. Result DTOs never expose drafts, file tokens, user IDs, audit, evidence details, or circulation data.
