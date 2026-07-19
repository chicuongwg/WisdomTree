# Intake Constraints

## Purpose
- Define the concrete limits and safety rules for file intake, so upload behavior is predictable and the store-first guarantee is bounded.
- Give backend and UI a single source for size limits, accepted formats, and upload safety handling.

## In Scope
- Maximum file size and per-upload limits.
- Accepted and unsupported format handling.
- Upload safety scanning and quarantine behavior.

## Out of Scope
- Extraction quality per format, covered in [`../system/data-model-lifecycle.md`](../system/data-model-lifecycle.md).
- Object storage configuration, covered in [`../system/deployment-topology.md`](../system/deployment-topology.md).
- Legal or rights policy for stored content.

## Decisions
- Storage is store-first, but intake is bounded: a file must pass size and safety checks before it becomes `stored`.
- Broad formats are accepted for storage even when extraction is not supported; unsupported extraction ends in `unprocessable`, and the file stays stored.
- A file that fails a safety scan is quarantined, not stored, and reported to the uploader.

## Dependencies
- Storage model in [`../system/two-repository-architecture.md`](../system/two-repository-architecture.md).
- Lifecycle states in [`../system/data-model-lifecycle.md`](../system/data-model-lifecycle.md).
- Security baseline in [`non-functional-requirements.md`](./non-functional-requirements.md).

## Acceptance Criteria
- Uploads above the size limit are rejected with a clear message and never partially stored.
- Accepted formats become `stored`; unsupported-for-extraction formats are still stored and marked `unprocessable` after processing.
- A file failing the safety scan is quarantined and reported, never silently stored or dropped.

## Size Limits
- Default maximum single-file size is `100 MB` for V1; larger files require an operator-configured exception.
- One upload action carries one file in V1; batch import of many files uses the Drive or Sheets bridge paths.
- The size limit is enforced at the API before the file is committed to storage.

## Accepted Formats
- Documents: `pdf`, `doc`, `docx`, `odt`, `rtf`, `txt`, `md`.
- Spreadsheets and slides: `xls`, `xlsx`, `csv`, `ppt`, `pptx`.
- Images: `jpg`, `png`, `tiff`, `webp`.
- Other formats may be stored as evidence but are not guaranteed extraction.
- Parser-first extraction applies to text-native formats; OCR applies to image-based or weakly extractable input.

## Unsupported and Failed Extraction
- A format WisdomTree cannot extract in V1 is still stored and, after processing, marked `unprocessable`; the original file stays available in `Library`.
- `unprocessable` is an extraction outcome, not a storage failure, and never removes the stored file.

## Upload Safety
- Every upload is scanned before it is committed to `stored`.
- A file that fails the scan is quarantined: not stored, not extractable, and reported to the uploader with a safe next step.
- Original-file download remains scoped by space membership and Admin/Op, per the security baseline.
