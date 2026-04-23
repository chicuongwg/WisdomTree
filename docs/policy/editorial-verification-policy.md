# Editorial and Verification Policy

## Purpose
- Define the decision rules that make review, publish, verification, reject, merge, and archive outcomes consistent across `Admin/Op` users.
- Prevent trust and quality decisions from depending on personal interpretation.

## In Scope
- Source trust decision rules.
- Node verification decision rules.
- Publish eligibility for source-driven promotion.
- Manual node handling before evidence exists.
- Merge and archive rules from a content quality perspective.
- Common example scenarios for calibration.

## Out of Scope
- UI copy for badges or warnings.
- Full legal or rights-management policy.
- Detailed taxonomy design.

## Decisions
- Source trust and node verification remain separate policies and must not be collapsed into one status.
- `verified` always requires evidence linkage plus `Admin/Op` review.
- `Editor` may prepare corrected text and Markdown drafts only for owned or assigned work.
- `Editor` never changes source trust or node verification state in V1.
- A manual node may exist and remain useful as `no_source`, but it must not be presented as `verified` without reviewed evidence.

## Dependencies
- Shared vocabulary in [`../product/glossary.md`](../product/glossary.md).
- Lifecycle rules in [`../system/data-model-lifecycle.md`](../system/data-model-lifecycle.md).
- Operational flow in [`../flows/admin-op-flows.md`](../flows/admin-op-flows.md).
- Permissions in [`../requirements/permissions-matrix.md`](../requirements/permissions-matrix.md).

## Acceptance Criteria
- Two different `Admin/Op` users can reach the same decision for common publish, reject, and merge cases by following this file.
- Publish and verification decisions can be made without inventing new state meanings.
- The policy is specific enough to support both source-driven promotion and manual tree authoring.

## Decision Principles
- Preserve provenance over polish. Imperfect formatting may still be publishable if the meaning is recoverable and provenance is clear.
- Do not overclaim trust. If the evidence chain or review quality is incomplete, prefer `candidate`, `unverified`, or `no_source` over `trusted` or `verified`.
- Reject only when the source is not fit to support tree publication in V1, not merely because it needs correction work.
- Merge only true duplicates. Related concepts should remain linked, not collapsed into one node.

## Accountability Boundaries
- `User` owns source submission and personal submission tracking.
- `Editor` owns content preparation work on owned or assigned items, including corrected text, Markdown draft refinement, and owned or assigned manual-node updates.
- `Admin/Op` owns trust decisions, verification, publish approval, merge, archive, export, and recovery-sensitive actions.
- The audit trail for any publishable item should expose who uploaded it, who edited or updated it, and which `Admin/Op` approved or published it.

## Branch-gap Request Policy
- `branch-gap requests` are intake items, not source evidence.
- `branch-gap requests` do not carry source trust state.
- `branch-gap requests` do not directly qualify a node for `verified` or `unverified` publication.
- `Admin/Op` may triage a `branch-gap request` into branch work, reject it, or archive it.

## Source Trust Decision Guide

| Source Trust Status | Use when |
| --- | --- |
| `unknown` | The source exists in the system but has not yet received meaningful review. |
| `candidate` | The source is processable and potentially useful, but still needs correction, review, or clearer provenance before being treated as strong evidence. |
| `trusted` | The source is usable evidence for publication and its provenance is sufficiently clear for V1. |
| `rejected` | The source should not produce tree content because meaning cannot be recovered, provenance is too weak, or the item is out of scope for the knowledge base. |
| `archived` | The source is retained in history but should not drive active discovery or new publication work. |

## Node Verification Decision Guide

| Verification Status | Use when |
| --- | --- |
| `no_source` | The node exists without attached reviewed evidence, typically for manual authoring. |
| `unverified` | The node is publishable and useful, but the evidence chain or review depth is not yet strong enough for `verified`. |
| `verified` | The node has evidence linkage to at least one `Source Version`, an `Admin/Op` review decision, and clear provenance visible from the node context. |
| `archived` | The node is retired, merged, or superseded and should not appear as active canonical content. |

## Publish Eligibility: Source-Driven Promotion
All of the following must be true before a source-driven publish is approved:
- The source is not `rejected` or `archived`.
- The corrected text exists and has a visible review history.
- The Markdown draft has been compared against corrected text.
- The target branch or node placement is known.
- Provenance to the `Source Version` and a usable source excerpt or reference are ready to store.
- The accountability chain identifies uploader, any editor/updater, and the approving `Admin/Op`.
- No unresolved conflict, redirect ambiguity, or merge ambiguity remains.

If the source is usable but evidence strength or review depth is still incomplete, `Admin/Op` may publish as `unverified` instead of blocking all publication work.

## Manual Node Policy
- Manual nodes start as `no_source`.
- Manual nodes may be edited and used in branch structure before evidence exists.
- Editors may update only owned or assigned manual nodes in V1.
- Manual nodes stay `no_source` until evidence is attached and reviewed.
- After evidence is attached, `Admin/Op` may keep the node `unverified` until the evidence chain and provenance presentation are complete.
- Manual nodes may become `verified` only after evidence attachment, explicit review, and provenance linkage meet the same minimum standard as source-driven content.

## Reject Criteria for Source
Reject the source when one or more of the following is true:
- Meaning cannot be recovered with reasonable correction effort.
- Provenance is too weak to support a trustworthy tree node.
- The source is outside the intended knowledge scope for V1.
- The source is a duplicate evidence item that adds no meaningful new provenance or correction value.

Do not reject a source only because it requires normal human correction or because it should publish as `unverified` rather than `verified`.

## Merge and Archive Quality Rules
- Merge only when two nodes represent the same canonical concept, not when they are merely related or overlapping.
- Choose the canonical node based on stronger evidence linkage, clearer title and structure, and better branch fit.
- Preserve redirect behavior and audit history for the non-canonical node.
- Archive content when it is superseded, merged, or intentionally retired; do not use archive as a substitute for unresolved review work.

## Example Decision Scenarios

| Scenario | Expected decision |
| --- | --- |
| A source has reviewed corrected text, a reviewed Markdown draft, clear provenance, and stable branch placement. | Publish. Mark the source `trusted` if appropriate and the node `verified` if provenance presentation is complete. |
| A manual node is useful for branch structure but has no evidence yet. | Keep the node `no_source`. Do not mark it `verified`. |
| A source is processable but still needs more review or clearer evidence. | Keep the source `candidate` and publish only as `unverified` if the content is still useful. |
| A source cannot be corrected into reliable meaning. | Mark the source `rejected` and stop publication work from it. |
| Two nodes clearly duplicate the same concept and one has stronger evidence and structure. | Keep the stronger node canonical, archive the duplicate, and create redirect behavior. |
