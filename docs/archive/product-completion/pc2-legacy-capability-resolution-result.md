# PC2 — Legacy Capability Resolution Result

## Result

**PC2 COMPLETE.** The owner closed DQ-1 through DQ-4, the non-evidenced password/device UNKNOWN was removed from the baseline, and the approved target-native seams were implemented without restoring legacy screens or architecture.

## Delivered

- Note history list/read/diff/restore-to-draft; heading TOC, same-Project links/backlinks/previous-next; Personal Note promotion into a Shared Project working draft with immutable origin provenance.
- Account My Materials; Material steward metadata update and withdrawal; recorded candidate rejection alongside the existing evolve-to-working-Note flow.
- Shared Project export using the verified bundle/manifest service, surfaced as Project export rather than WikiRelease.
- Explicit owner retirement of hierarchy, formal translation, maker-checker review, non-Project catalogue/folders, and saved Personal Graph groups.
- Account membership is intentionally replaced by the canonical Projects list.

## Authorization and privacy boundaries

- Note history reads require Project read; restore requires Project contributor write; out-of-Project access remains not-found.
- Promotion requires the caller to own the Personal source, to read the source Note, and to have access to a Shared target. The destination is a private working draft and stores source-version support.
- Note navigation emits only same-Project visible links/backlinks and adjacent Notes; its TOC is derived only from the current Note's rendered headings.
- Material lifecycle routes re-check Project/Material ownership and the storage steward authorization server-side. Candidate review remains target Project-scoped; outsiders receive not-found.
- Project export uses existing Project manager authorization and denies Personal Projects. No public route exposes these target collaboration/stewardship metadata.

## Final gate

```text
BACKEND ONLY = 0
MISSING      = 0
UNKNOWN      = 0
```

PC3 was not started.

The separate [simplicity and maintainability audit](pc2-simplicity-maintainability-audit.md) found no PC2 blocker. It records retained compatibility complexity and the next bounded maintenance concerns without authorizing cleanup.
