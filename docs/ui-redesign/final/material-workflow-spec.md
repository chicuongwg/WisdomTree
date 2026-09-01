# Material and extraction workflow specification

## Product representation

One Material may have metadata, many digital versions, one optional physical representation, extraction state, and research usage. The UI never presents Source, SourceVersion, SourcePhysical, or ExtractionCandidate as separate top-level products.

## Materials collection

Wide table / narrow structured list:

```text
Title | Digital state | Physical state | Extraction | Updated/stored
```

Supported Stage 16 fields:

- title;
- current MIME/storage timestamp;
- extraction status and whether text exists;
- physical item code/status.

Do not invent a category/type ontology. Local search/filter may use only fields or a Project-filtered search boundary that actually exists.

## Material detail hierarchy

```text
Material title
Project · representation summary                         [Actions]
├── Overview
├── Files and versions
├── Physical copy
├── Extraction
└── Research usage
```

These are page sections plus inspector shortcuts, not mandatory nested routes.

### Overview

Title, description, current digital version summary, physical state, extraction state. Edit actions are capability-gated.

### Files and versions

- Current version first: filename, sequence, MIME type, size, stored time, extraction/storage state.
- Version history follows immutable sequence.
- `Add new version` uploads a corrected file/scan without changing Material identity/Project.
- Download action requests a safe token on demand; object keys never enter UI state.

### Physical copy

Show item code, author/location/copies/status when returned by the physical boundary. Attachment/action appears only when Project capability and actor capability permit. A physical-only Material is valid and should not show a fake missing-file error.

### Extraction

States: not requested/available as supported, queued/processing, ready, failed. Ready exposes preview and `Create working Note`; failed exposes retry only if the application boundary supports retry. Do not invent retry before a facade exists.

### Research usage

Show supporting-Note usage only if an authorized read exists. Do not expose Stage 9 internal evidence to users lacking access and do not make it public bibliography.

## Add Material flow

Project → Materials → `Add Material`:

1. **Basics:** title required, description optional.
2. **Representation:** optional digital file; optional physical details only when `library_circulation` and authorized physical action are available.
3. **Review:** Project, metadata, selected representation; submit.

The first step can create metadata-only Material. Do not require a fake file. Progressive enrichment handles versions and physical metadata later.

Outside Project, global `+ New` first chooses Project, then opens the same flow. Project cannot be changed after creation through ordinary editing.

## Upload behavior

- Validate type/size before upload when possible, but server remains authoritative.
- Show file name, size, progress, cancel if transport supports it, and retry.
- Preserve form metadata on upload failure.
- Completion confirms Material and version identity; use a toast only for the discrete completed upload, while persistent state remains inline.
- Navigation during upload warns if cancellation/data loss would occur.

## Scan and extraction flow

```text
Material detail
→ Add new version
→ choose scan/photo/PDF
→ upload progress
→ processing
→ extraction ready
→ Review extracted text
→ Create private Project working Note
```

Extraction review shows Material title, exact source version, extraction state, and extracted content preview. `Create working Note` calls candidate evolution; it never asks for Project, Space, Branch, or scope. The resulting draft visibly belongs to the derived Project and remains author-private.

Original file preservation is expressed as `Original file retained as Version n`; extracted text is a derived review surface, not a replacement file.

## Failure states

- Upload failed: retain selected metadata; retry/reselect file.
- Processing: stable state survives navigation; no indefinite spinner.
- Extraction failed: show failure and supported retry/contact action.
- Candidate already evolved: link to the existing resulting draft rather than create a duplicate.
- Permission changes mid-flow: non-disclosing error, retain local non-file input where safe, no ownership fallback.

## Responsive

Wide: main Material detail plus optional representation inspector. Narrow: sections become accordions or stacked headings; upload/extraction actions use sheets. Never place file preview, metadata, and inspector in three squeezed panes.
