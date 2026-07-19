# Google Bridge

## Purpose
- Specify how WisdomTree links with the Google products the team still relies on, so the platform augments the team's existing tools instead of forcing a full migration.
- Keep every bridge one-way or outbound and low-risk, so a Google outage never blocks core storage workflows.

## In Scope
- Drive import of legacy files into space-scoped storage.
- Sheets import of the book inventory and metrics tables.
- Forms ingestion through the form's linked response Sheet.
- Calendar publishing through an outbound ICS feed.
- Credential model, sync cadence, quotas, and failure modes.

## Out of Scope
- Two-way sync with any Google product.
- Replacing Google Docs, Sheets, or Drive as authoring surfaces.
- Real-time push from Google; all bridges poll or export on a schedule.

## Decisions
- The team cannot reach full digital conversion, so Google Forms, Sheets, Calendar, and Drive stay in use and are bridged, not displaced.
- Every bridge is one-way into WisdomTree or outbound from it; nothing WisdomTree owns is written back into Google in V1.
- Bridges are additive: if a bridge is down or throttled, core storage, catalog, and knowledge workflows continue unaffected.
- Calendar integration is an outbound ICS feed subscribed to by each member, not the Calendar API, to avoid OAuth-per-user and sync conflicts.
- All imports run as worker jobs and write into owning modules through their normal creation paths, so lifecycle, audit, and permission rules always apply.

## Dependencies
- Platform strategy in [`../platform/platform-context.md`](../platform/platform-context.md).
- Module ownership in [`../platform/module-map.md`](../platform/module-map.md).
- Storage model in [`two-repository-architecture.md`](./two-repository-architecture.md).
- Catalog import target in [`catalog-circulation.md`](./catalog-circulation.md).
- Contracts in [`integration-contracts.md`](./integration-contracts.md).

## Acceptance Criteria
- A legacy Drive folder can be imported into a chosen space, producing stored sources without touching the originals in Drive.
- A spreadsheet of books can be imported into the catalog, and a metrics sheet can be linked for reporting.
- Google Form responses appear as intake items or project data without manual re-entry.
- Each member can subscribe a project's deadlines into their own Google Calendar through a feed URL, with no per-user OAuth.
- Every bridge fails visibly and never corrupts or blocks canonical WisdomTree data.

## Bridge 1: Drive Import
- Direction: one-way, read-only, Google Drive into `storage`.
- Mechanism: an `ImportDriveJob` walks a mapped Drive folder and creates a `Source` per file in the target space, storing a copy in object storage; the Drive originals are never modified.
- Mapping: one Drive folder maps to one space; nested folders may map to tags or subpaths.
- Idempotency: re-running an import updates the mapping record and skips files already imported by Drive file id.
- Priority: highest, because seeding real data before inviting the team is the adoption lever.

## Bridge 2: Sheets Import
- Direction: one-way, Google Sheets into `catalog` and `pm`.
- Book inventory: an `ImportSheetJob` maps title, author, and location columns into `Catalog Item` records; see [`catalog-circulation.md`](./catalog-circulation.md).
- Metrics tables: a metrics sheet can be linked for funding and reporting figures, imported on demand rather than continuously synced.
- Validation: rows that fail validation are reported and skipped; a failed row never partially creates a record.

## Bridge 3: Forms Ingestion
- Direction: one-way, Google Forms into `storage` or `pm`.
- Mechanism: a `PollFormsSheetJob` reads the response Sheet that a Form is linked to, rather than integrating the Forms API or webhooks.
- Output: new responses become intake items or project data, tagged with the source form and response timestamp.
- Cadence: polled on a schedule; new rows since the last watermark are ingested.

## Bridge 4: Calendar Publishing
- Direction: outbound, WisdomTree into Google Calendar.
- Mechanism: `GET /calendar/:token.ics` returns a per-project or per-user ICS feed of deadlines and milestones; members subscribe the URL in their own Google Calendar.
- Rationale: an ICS feed needs no per-user OAuth and cannot create sync conflicts, unlike the Calendar API.
- Security: the feed URL carries an unguessable token scoped to the subscriber's visibility; revoking the token stops the feed.

## Credential and Access Model
- A single Op-owned Google OAuth client or service account holds the read scopes for Drive, Sheets, and Forms response sheets.
- Credentials live in server configuration, never in the browser, and are used only by worker jobs.
- The ICS feed requires no Google credentials; it is served by WisdomTree.

## Sync, Quota, and Failure Modes
- Imports and polls run on a schedule with backoff and respect Google API quotas; a throttled call retries later without failing the batch.
- Freshness targets and the rule that a bridge outage never blocks core workflows live in [`../requirements/non-functional-requirements.md`](../requirements/non-functional-requirements.md).
- A Google API outage degrades only the affected bridge; see the degraded mode in [`../operations/operating-playbook.md`](../operations/operating-playbook.md).
- Import failures surface as operational follow-up items and never leave partial or corrupt records.
