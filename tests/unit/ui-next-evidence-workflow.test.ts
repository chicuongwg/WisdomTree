import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { enMessages } from "@/app/components/ui-next/localization/locales/en";
import { viMessages } from "@/app/components/ui-next/localization/locales/vi";
import {
  draftSupportNoteVersions,
  draftSupportSourceVersions,
  nodeDrafts,
} from "@/modules/knowledge/schema";

export async function run() {
  // 1. Verify Evidence Delivery Routes Existence
  const routes = [
    "src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/_lib.ts",
    "src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/search/route.ts",
    "src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/versions/route.ts",
    "src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/source-version/route.ts",
    "src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/note-version/route.ts",
  ];

  for (const route of routes) {
    assert.equal(existsSync(route), true, `missing route: ${route}`);
    const src = readFileSync(route, "utf8");
    // Boundary check: no direct DB access in delivery routes
    assert.doesNotMatch(src, /@\/db|drizzle-orm/, `direct DB import in delivery route: ${route}`);
  }

  // 2. Verify resolveExistingTargetDraft Invariant: GET never creates drafts
  const libSource = readFileSync(
    "src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/_lib.ts",
    "utf8",
  );
  assert.match(libSource, /export async function resolveExistingTargetDraft/);
  assert.doesNotMatch(
    libSource,
    /saveAppNoteDraft|createAppProjectNote|insert\(/,
    "resolveExistingTargetDraft must NEVER create a draft!",
  );
  assert.match(libSource, /throw new ApiError\(404, "not_found"/);

  // 3. Verify Target Draft Mutation Authorization on Search and Versions
  const searchApi = readFileSync(
    "src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/search/route.ts",
    "utf8",
  );
  assert.match(
    searchApi,
    /await resolveExistingTargetDraft\(actor, projectId, noteId\)/,
    "search route must authorize target draft mutation access first!",
  );

  const versionsApi = readFileSync(
    "src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/versions/route.ts",
    "utf8",
  );
  assert.match(
    versionsApi,
    /await resolveExistingTargetDraft\(actor, projectId, noteId\)/,
    "versions route must authorize target draft mutation access first!",
  );

  // 4. Verify Search Excludes All Private Drafts
  assert.match(
    searchApi,
    /const officialNotes = notesData\.notes;/,
    "empty-query search must take official notes only and ignore private drafts!",
  );
  assert.doesNotMatch(
    searchApi,
    /notesData\.drafts/,
    "private drafts must NEVER be returned in evidence search!",
  );

  // 5. Verify No Version-List N+1: Versions API loads for a single selected ID only
  assert.match(versionsApi, /const id = request\.nextUrl\.searchParams\.get\("id"\)/);
  assert.match(versionsApi, /const type = request\.nextUrl\.searchParams\.get\("type"\)/);

  // 6. Verify Exact Immutable Version Attach/Detach
  const sourceVerApi = readFileSync(
    "src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/source-version/route.ts",
    "utf8",
  );
  assert.match(sourceVerApi, /addAppDraftSupportingSourceVersion\(actor,/);
  assert.match(sourceVerApi, /removeAppDraftSupportingSourceVersion\(actor,/);
  assert.match(sourceVerApi, /sourceVersionId/);

  const noteVerApi = readFileSync(
    "src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/note-version/route.ts",
    "utf8",
  );
  assert.match(noteVerApi, /addAppDraftSupportingNoteVersion\(actor,/);
  assert.match(noteVerApi, /removeAppDraftSupportingNoteVersion\(actor,/);
  assert.match(noteVerApi, /noteVersionId/);

  // 7. Verify Domain Support Schema: Exact Version Keys, No Mutable Parent Relations
  assert.ok(
    draftSupportSourceVersions.sourceVersionId,
    "draftSupportSourceVersions must reference sourceVersionId UUID",
  );
  assert.ok(
    draftSupportNoteVersions.noteVersionId,
    "draftSupportNoteVersions must reference noteVersionId UUID",
  );

  // 8. Verify Concurrency: Evidence Mutations do NOT Bump nodeDrafts.version
  const supportDomainSrc = readFileSync("src/modules/knowledge/support.ts", "utf8");
  // Check that addDraftSupportingSourceVersion and addDraftSupportingNoteVersion insert into support tables only
  const addSourceMatch = supportDomainSrc.match(
    /addDraftSupportingSourceVersion[\s\S]*?return \{ created/,
  );
  assert.ok(addSourceMatch);
  assert.doesNotMatch(
    addSourceMatch[0],
    /nodeDrafts\.draftVersion|nodeDrafts\.version|\bupdate\s*\(\s*nodeDrafts\s*\)/,
    "addDraftSupportingSourceVersion must not bump draft version!",
  );

  const addNoteMatch = supportDomainSrc.match(
    /addDraftSupportingNoteVersion[\s\S]*?return \{ created/,
  );
  assert.ok(addNoteMatch);
  assert.doesNotMatch(
    addNoteMatch[0],
    /nodeDrafts\.draftVersion|nodeDrafts\.version|\bupdate\s*\(\s*nodeDrafts\s*\)/,
    "addDraftSupportingNoteVersion must not bump draft version!",
  );

  const removeSourceMatch = supportDomainSrc.match(
    /removeDraftSupportingSourceVersion[\s\S]*?return \{ removed/,
  );
  assert.ok(removeSourceMatch);
  assert.doesNotMatch(
    removeSourceMatch[0],
    /nodeDrafts\.draftVersion|nodeDrafts\.version|\bupdate\s*\(\s*nodeDrafts\s*\)/,
    "removeDraftSupportingSourceVersion must not bump draft version!",
  );

  const removeNoteMatch = supportDomainSrc.match(
    /removeDraftSupportingNoteVersion[\s\S]*?return \{ removed/,
  );
  assert.ok(removeNoteMatch);
  assert.doesNotMatch(
    removeNoteMatch[0],
    /nodeDrafts\.draftVersion|nodeDrafts\.version|\bupdate\s*\(\s*nodeDrafts\s*\)/,
    "removeDraftSupportingNoteVersion must not bump draft version!",
  );

  // 9. Verify Detach Semantics: Deletes Relation Only, Preserves Underlying Object
  assert.match(
    supportDomainSrc,
    /delete\(draftSupportSourceVersions\)[\s\S]*?eq\(draftSupportSourceVersions\.draftId, input\.draftId\)[\s\S]*?eq\(draftSupportSourceVersions\.sourceVersionId, input\.sourceVersionId\)/,
  );
  assert.match(
    supportDomainSrc,
    /delete\(draftSupportNoteVersions\)[\s\S]*?eq\(draftSupportNoteVersions\.draftId, input\.draftId\)[\s\S]*?eq\(draftSupportNoteVersions\.noteVersionId, input\.noteVersionId\)/,
  );

  // 10. Verify Cross-Project Authorization Checks in Domain Read Services
  const storageSrc = readFileSync("src/modules/storage/service.ts", "utf8");
  assert.match(
    storageSrc,
    /export async function listSourceVersions[\s\S]*?await requireProjectResearchRead\(actor, source\.spaceId\)/,
  );

  const serviceQueriesSrc = readFileSync("src/modules/knowledge/service-queries.ts", "utf8");
  assert.match(
    serviceQueriesSrc,
    /export async function listProjectNoteVersions[\s\S]*?await requireProjectResearchRead\(actor, node\.projectId\)/,
  );
  assert.match(
    serviceQueriesSrc,
    /ne\(treeNodes\.verification, "archived"\)/,
    "listProjectNoteVersions must exclude archived notes",
  );

  // 11. Verify Frontend Inspector & Workspace Evidence State Discipline
  const workspaceSrc = readFileSync(
    "src/app/app/projects/[projectId]/notes/_components/note-workspace.tsx",
    "utf8",
  );
  // Separate officialEvidence vs draftEvidence without blind merge
  assert.match(workspaceSrc, /officialEvidenceState/);
  assert.match(workspaceSrc, /draftEvidenceState/);
  assert.match(
    workspaceSrc,
    /const activeEvidence = isDraft \? draftEvidenceState : officialEvidenceState;/,
    "Workspace must switch between official vs draft evidence without merging!",
  );
  // Narrow viewport drawer suspension before opening EvidencePicker
  assert.match(
    workspaceSrc,
    /if \(isNarrow \|\| focusMode\) \{\s*setInspectorOpen\(false\);\s*\}/,
    "Must close drawer before opening EvidencePicker on narrow viewports!",
  );

  // 12. Verify Note Detail Page Loads Support Sets Conditionally
  const pageSrc = readFileSync("src/app/app/projects/[projectId]/notes/[noteId]/page.tsx", "utf8");
  assert.match(
    pageSrc,
    /listAppNoteVersionSupportingResearch\([\s\S]*?officialNote\.currentVersionId/,
  );
  assert.match(pageSrc, /listAppDraftSupportingResearch\(actor, draft\.id\)/);
  // Verify standalone drafts do not read an official immutable version snapshot.
  assert.doesNotMatch(pageSrc, /listAppNoteVersionSupportingResearch\(actor, standaloneDraft/);

  // 13. Verify Localization Completeness
  const requiredEvidenceKeys = [
    "notes.evidence.title",
    "notes.evidence.materials",
    "notes.evidence.notes",
    "notes.evidence.empty",
    "notes.evidence.historyUnknown",
    "notes.evidence.add",
    "notes.evidence.remove",
    "notes.evidence.removing",
    "notes.evidence.attaching",
    "notes.evidence.exactVersion",
    "notes.evidence.fromProject",
    "notes.evidence.scope.project",
    "notes.evidence.scope.all",
    "notes.evidence.searchPlaceholder",
    "notes.evidence.searchPrompt",
    "notes.evidence.noResults",
    "notes.evidence.selectItemPrompt",
    "notes.evidence.chooseVersion",
    "notes.evidence.backToResults",
    "notes.evidence.attachAction",
    "notes.evidence.closePicker",
    "notes.evidence.attachFailed",
    "notes.evidence.detachFailed",
  ];

  for (const key of requiredEvidenceKeys) {
    assert.ok(key in enMessages, `missing EN key: ${key}`);
    assert.ok(key in viMessages, `missing VI key: ${key}`);
  }
}
