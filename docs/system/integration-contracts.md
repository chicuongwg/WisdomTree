# Integration Contracts

## Purpose
- Define the module contracts, key endpoints, and event boundaries required to implement V1 without re-deciding interfaces during development.

## In Scope
- App-to-worker job contracts.
- App-facing key endpoints.
- Export and notification triggers.
- Identity and storage integration assumptions.

## Out of Scope
- Full OpenAPI specification.
- Internal library interfaces.
- External automation beyond the current V1 system boundary.

## Decisions
- This file defines key contracts only, not every route.
- Backend is responsible for enforcing authorization on all protected actions.
- Worker contracts are asynchronous and job-based.
- Export remains one-way from app to content repo.
- `branch-gap requests` are intake items, not file-backed `Source` records.
- Storage access (library browse, search, download) is space-scoped and enforced at the API.
- Document export renders node Markdown to `docx`/`pdf` as derived artifacts through a Pandoc-class converter.

## Dependencies
- Module roles in [`module-boundaries.md`](./module-boundaries.md).
- Lifecycle states in [`data-model-lifecycle.md`](./data-model-lifecycle.md).
- Permissions in [`../requirements/permissions-matrix.md`](../requirements/permissions-matrix.md).

## Acceptance Criteria
- Backend and worker implementers can define their APIs and jobs without reopening business-level interface decisions.
- Frontend engineers can identify the major request-response surfaces required for V1.
- Export and notification triggers are explicit enough to implement operational flows.

## Key App Endpoints

### Auth and Session
- `GET /api/session`
- `POST /api/auth/logout`

### Spaces
- `GET /api/spaces`
- `POST /api/spaces`
- `PATCH /api/spaces/:spaceId`
- `POST /api/spaces/:spaceId/members`
- `DELETE /api/spaces/:spaceId/members/:userId`

### Source Repo
- `POST /api/source/upload`
- `POST /api/source/:sourceId/version`
- `POST /api/source/gap-request`
- `GET /api/library`
- `GET /api/source/my-submissions`
- `GET /api/source/:sourceId`
- `GET /api/source/:sourceId/download`
- `GET /api/source/gap-request/:requestId`
- `GET /api/source/:sourceId/version/:versionId`
- `POST /api/source/gap-request/:requestId/triage`
- `POST /api/source/gap-request/:requestId/convert`
- `POST /api/source/gap-request/:requestId/reject`
- `POST /api/source/gap-request/:requestId/archive`
- `POST /api/source/:sourceId/version/:versionId/assign`
- `POST /api/source/:sourceId/version/:versionId/corrected-text`
- `POST /api/source/:sourceId/version/:versionId/mark-ready-for-review`
- `POST /api/source/:sourceId/version/:versionId/reject`

### Review and Publish
- `GET /api/review/queue`
- `GET /api/review/publish/:reviewId`
- `POST /api/source/:sourceId/version/:versionId/md-draft`
- `POST /api/source/:sourceId/version/:versionId/approve`
- `POST /api/source/:sourceId/version/:versionId/publish`

### Knowledge Tree
- `GET /api/tree/search`
- `GET /api/tree/nodes/:nodeId`
- `POST /api/tree/nodes`
- `PATCH /api/tree/nodes/:nodeId`
- `POST /api/tree/nodes/:nodeId/archive`
- `POST /api/tree/nodes/:nodeId/merge`
- `POST /api/tree/branches`
- `PATCH /api/tree/branches/:branchId`
- `POST /api/tree/nodes/:nodeId/export`

### Notifications
- `GET /api/notifications`
- `POST /api/notifications/:notificationId/read`

### Catalog and Circulation
- `GET /api/catalog`
- `POST /api/catalog`
- `POST /api/catalog/import`
- `GET /api/catalog/:itemId`
- `PATCH /api/catalog/:itemId`
- `POST /api/catalog/:itemId/loan/request`
- `POST /api/catalog/loan/:ticketId/approve`
- `POST /api/catalog/loan/:ticketId/decline`
- `POST /api/catalog/loan/:ticketId/borrow`
- `POST /api/catalog/loan/:ticketId/return`

### Board and Operations
- `GET /api/board`
- `POST /api/tasks`
- `PATCH /api/tasks/:taskId`
- `POST /api/achievements`
- `GET /api/admin/health`
- `POST /api/export/tree`

### Google Bridge
- `POST /api/bridge/drive/import`
- `POST /api/bridge/sheet/import`
- `GET /api/bridge/status`
- `GET /calendar/:token.ics`

## Worker Job Contracts

### Source Processing Job
- Input:
  - source id
  - source version id
  - storage object key
  - mime type
- Output:
  - processing outcome
  - raw text reference
  - preview artifact references
  - parser or OCR metadata
  - extraction confidence and warnings

### Markdown Draft Generation Job
- Input:
  - source id
  - source version id
  - corrected text reference
  - target branch or suggested branch context
- Output:
  - Markdown draft text
  - heading structure suggestion
  - tag suggestions
  - link suggestions

### Document Render Job
- Input:
  - node id or Markdown reference
  - target format (`docx` or `pdf`)
- Output:
  - rendered document artifact reference
  - converter warnings

### Search Reindex Job
- Input:
  - changed object type
  - object id
  - action type
- Output:
  - refreshed search projection
  - refreshed graph projection if applicable

### Google Bridge Jobs
- `ImportDriveJob`:
  - input: Drive folder id, target space id
  - output: created source ids, skipped-file report, failure report
- `ImportSheetJob`:
  - input: Sheet id, target module (catalog or metrics), column mapping
  - output: created record ids, validation-failure report
- `PollFormsSheetJob`:
  - input: form-linked Sheet id, target module, last watermark
  - output: ingested rows, new watermark

## Event Triggers
- `source.uploaded`
- `source.stored`
- `source.gap_requested`
- `source.processed`
- `source.processing_failed`
- `source.ready_for_review`
- `source.approved`
- `tree.node.published`
- `tree.node.archived`
- `tree.node.merged`
- `export.completed`
- `export.failed`
- `catalog.item.created`
- `loan.requested`
- `loan.approved`
- `loan.borrowed`
- `loan.overdue`
- `loan.returned`
- `bridge.drive.imported`
- `bridge.sheet.imported`
- `bridge.forms.ingested`
- `bridge.import.failed`

## External Integration Assumptions
- Google OIDC supplies user identity claims consumed by the app.
- Object storage stores original source files and evidence artifacts by opaque object keys.
- Content repo receives export commits from the export service only.
- GitHub Actions validates exported content on push.
- Email provider sends review and operational notifications.
- Google bridge integrations are one-way or outbound only; see [`google-bridge.md`](./google-bridge.md).
