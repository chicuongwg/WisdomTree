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

### Source Repo
- `POST /api/source/upload`
- `GET /api/source/my-submissions`
- `GET /api/source/:sourceId`
- `GET /api/source/:sourceId/version/:versionId`
- `POST /api/source/:sourceId/version/:versionId/assign`
- `POST /api/source/:sourceId/version/:versionId/corrected-text`
- `POST /api/source/:sourceId/version/:versionId/mark-ready-for-review`
- `POST /api/source/:sourceId/version/:versionId/reject`

### Markdown Draft and Publish
- `GET /api/publish-queue`
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

### Board and Operations
- `GET /api/board`
- `POST /api/tasks`
- `PATCH /api/tasks/:taskId`
- `POST /api/achievements`
- `GET /api/admin/health`
- `POST /api/export/tree`

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

### Search Reindex Job
- Input:
  - changed object type
  - object id
  - action type
- Output:
  - refreshed search projection
  - refreshed graph projection if applicable

## Event Triggers
- `source.uploaded`
- `source.processed`
- `source.processing_failed`
- `source.ready_for_review`
- `source.approved`
- `tree.node.published`
- `tree.node.archived`
- `tree.node.merged`
- `export.completed`
- `export.failed`

## External Integration Assumptions
- Google OIDC supplies user identity claims consumed by the app.
- Object storage stores original source files and evidence artifacts by opaque object keys.
- Content repo receives export commits from the app or export service.
- GitHub Actions validates exported content on push.
- Email provider sends review and operational notifications.

