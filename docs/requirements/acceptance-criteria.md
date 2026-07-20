# Acceptance Criteria

## Purpose
- Define the release-level acceptance criteria that determine whether V1 is implementation-complete and operationally usable.
- Give backend, frontend, product, and operations teams a shared finish line.

## In Scope
- System-level acceptance criteria.
- Module-level acceptance criteria.
- Cross-cutting acceptance requirements for roles, state handling, audit, recovery, and scorecard readiness.

## Out of Scope
- Detailed test case implementation.
- Performance test tooling specifics.
- Phase 1.5 release gates.

## Decisions
- Acceptance is defined at system and module level.
- V1 is considered complete only when source-driven publication and user discovery both work end-to-end.
- Reliability, audit, recovery, and consistency checks are part of release acceptance, not optional hardening.

## Dependencies
- Product goals in [`../product/prd.md`](../product/prd.md).
- Scorecard in [`../product/v1-scorecard.md`](../product/v1-scorecard.md).
- Functional requirements in [`functional-spec.md`](./functional-spec.md).
- NFR in [`non-functional-requirements.md`](./non-functional-requirements.md).
- Recovery procedures in [`../operations/operating-playbook.md`](../operations/operating-playbook.md).
- Verification policy in [`../policy/editorial-verification-policy.md`](../policy/editorial-verification-policy.md).

## Acceptance Criteria
- The criteria in this file are themselves the release gate for V1 readiness.
- Every criterion must be demonstrable through product behavior, integration checks, or operational runbook review.
- There must be no unresolved contradictions with the flow, policy, and UI documents.

## System-Level Release Criteria
- A user can upload a source file into a space and receive a visible processing state.
- A space member can find a stored item through `Library` or search and download the original file immediately after it is `stored`, without any review step.
- A user cannot see, search, or download stored items from spaces they do not belong to.
- A user can create a `branch-gap request` and receive a visible intake state.
- A user can open `My Submissions` and see only their own intake items and statuses.
- The system can produce raw text, corrected text, and a Markdown draft or clearly indicate failure.
- An `Admin/Op` can review a source item, approve it, and publish a Markdown node into the tree.
- A `User` can discover the published node through search, branch navigation, or graph navigation.
- The published node exposes trust state and source excerpt context.
- Audit history exists for upload, correction, publish, merge, archive, export, and restore-related actions.
- Audit history can reconstruct the accountability chain `upload -> edit/update -> approve/publish` for any published node or source item under investigation.
- Export to the content repository works and validation failures are surfaced operationally.
- A published node can be exported to `docx` and `pdf` as derived documents.
- The UI renders completely in both Vietnamese and English, with Vietnamese as the default.
- Daily backup jobs exist and a restore procedure is documented, drillable, and testable.
- The operating playbook covers worker outage, publish failure, full-environment restore, and single-record restore scenarios.
- The active environment has primary and backup `Admin/Op` coverage.
- The V1 scorecard can be computed from system events, audit, or direct queries without a separate analytics platform.

## Module-Level Criteria

### Source Repo
- Supports upload and versioned storage of original files into membership-scoped spaces.
- Supports `Library` browsing, search, and original-file download for space members, available from the `stored` state onward.
- Supports `branch-gap request` intake without creating a source version.
- Supports unified `My Submissions` history across file-backed uploads and `branch-gap requests`.
- Displays source lifecycle state and trust state.
- Preserves raw text as immutable and corrected text as editable.
- Supports `unprocessable` state for unsupported or failed formats.
- Allows authenticated `User` accounts to browse stored items in member spaces while workflow detail stays limited to their own submissions.
- Allows `Admin/Op` to filter `Source Inbox` by `item_type` and triage `branch-gap requests` without sending them into source trust or publish states.
- Prevents `Editor` accounts from modifying unowned and unassigned source work.

### Review and Publish
- Supports approval and rejection decisions.
- Records reviewer identity and timestamps.
- Preserves source-to-node provenance during promotion.
- Publish, reject, and verification decisions align with the editorial verification policy.
- Keeps `branch-gap requests` outside source trust and `Publish Review`; they are resolved through intake triage outcomes instead.
- Ensures only `Admin/Op` can approve corrected text, change trust, approve Markdown drafts, and publish.

### Tree
- Supports branch creation, node creation, node editing, archive, and merge.
- Manual nodes start as `no_source`.
- Verified nodes must have evidence linkage and review history.
- Editor mutation rights are limited to owned or assigned content in V1.

### Search and Graph
- Search supports repository, space, state, and type filters.
- Source-side search results are scoped by space membership.
- Archived items are hidden by default.
- Graph view and relation panels reflect primary branch and cross-link relationships.

### Board and Achievements
- Branch work can be represented with tasks and basic completion status.
- Achievement entries can be recorded and surfaced in branch context.

### Catalog and Circulation
- A librarian can add a book and the system assigns a stable unique identifier.
- The catalog can be bulk-loaded from a spreadsheet, with failed rows reported.
- Library-space members can browse and search the catalog and request a loan on an available copy.
- A loan can move through request, approve, borrow, and return, and overdue loans are visible.
- A digitized source can be linked to its catalog item while both records stay distinct.
- Catalog and circulation actions record actor and timestamps for audit.

### Notifications and Comments
- Relevant events notify the right members through their chosen channels (in-app, email, Zalo OA).
- A member can comment on a source, node, or deadline, and the comment persists with the object.
- A channel outage delays alerts without blocking the triggering workflow.

### Deadlines
- A deadline can be created, linked to a project, and surfaced in that project's calendar feed.
- Members are reminded before a deadline is due.

### Google Bridge
- A Drive folder imports into a space without modifying the Drive originals.
- A spreadsheet imports into the catalog or a metrics table, with failed rows reported.
- The calendar ICS feed is subscribable without per-user Google OAuth.
- A Google outage degrades only the affected bridge and never blocks core workflows.

### Publishing
- Only nodes flagged and approved for publication appear on the public Quartz site; nothing else leaks.

### Operations and Recovery
- Operational surfaces expose failed jobs, queue age, backup status, and publish failures clearly enough for `Admin/Op`.
- Restore drill results can be reviewed against the `1 business day` and `4h` recovery targets.
- Degraded modes are visible and do not depend on undocumented operator memory.

### Auth and Permissions
- All screens and actions align with the `User`, `Editor`, and `Admin/Op` role model.
- Unauthorized actions are rejected by backend authorization.
- Screen visibility and API enforcement must agree on the accountability split between uploader, editor/updater, and approver/publisher.

## Cross-Cutting Criteria
- State names are consistent between UI, API responses, worker outputs, and documentation.
- Permission boundaries are consistent across navigation, pages, and backend actions.
- Role-specific empty, loading, error, and access-denied states are present in the UI specs.
- There are no undefined transitions in the source, node, review, or conflict lifecycle.
- There is no contradiction between role docs, permissions, flows, policy, and screen inventory for source intake, own submissions, or assigned edit work.
- Recovery targets, scorecard definitions, and quality policies do not contradict the canonical flow or lifecycle docs.
