import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { enMessages } from "@/app/components/ui-next/localization/locales/en";
import {
  registerUnsavedNoteNavigationGuard,
  runGuardedNoteNavigation,
  shouldGuardNoteAnchorNavigation,
} from "@/app/components/ui-next/navigation/unsaved-note-navigation";
import { viMessages } from "@/app/components/ui-next/localization/locales/vi";
import {
  applySuccessfulNoteSave,
  hasUnpersistedNoteWork,
  noteSaveRequest,
  type NoteSaveSnapshot,
} from "@/app/app/projects/[projectId]/notes/_components/note-editor-state";
import { parseBlocks, inlineTokens } from "@/lib/markdown-core";

export async function run() {
  // 1. Verify Note Routes Existence
  const collectionRoute = "src/app/app/projects/[projectId]/notes/page.tsx";
  const detailRoute = "src/app/app/projects/[projectId]/notes/[noteId]/page.tsx";
  assert.equal(existsSync(collectionRoute), true, "missing Project Notes collection route");
  assert.equal(existsSync(detailRoute), true, "missing Project Note detail route");

  const collectionSource = readFileSync(collectionRoute, "utf8");
  const detailSource = readFileSync(detailRoute, "utf8");

  // Verify contracts consumed in collection
  assert.match(collectionSource, /listAppProjectNotes\(actor, projectId\)/);
  assert.match(collectionSource, /requireProjectModule\(projectId, "notes"\)/);
  assert.match(
    collectionSource,
    /canCreateNote=\{Boolean\(workspace\.project\.capabilities\.canCreateNote\)\}/,
  );

  // Verify contracts consumed in detail
  assert.match(detailSource, /getAppProjectNote\(actor, projectId, noteId\)/);
  assert.match(detailSource, /getAppNoteWorkingState\(actor, projectId, noteId\)/);
  assert.match(detailSource, /getAppDraft\(actor, noteId\)/);
  assert.match(detailSource, /notFound\(\)/);

  // 2. Verify Delivery / Mutation API routes
  const createApi = "src/app/api/app/projects/[projectId]/notes/route.ts";
  const draftApi = "src/app/api/app/projects/[projectId]/notes/[noteId]/draft/route.ts";
  const publishApi = "src/app/api/app/projects/[projectId]/notes/[noteId]/publish/route.ts";

  assert.equal(existsSync(createApi), true, "missing create note API route");
  assert.equal(existsSync(draftApi), true, "missing draft save API route");
  assert.equal(existsSync(publishApi), true, "missing publish note API route");

  const createApiSource = readFileSync(createApi, "utf8");
  const draftApiSource = readFileSync(draftApi, "utf8");
  const publishApiSource = readFileSync(publishApi, "utf8");

  assert.match(createApiSource, /createAppProjectNote\(actor,/);
  assert.match(draftApiSource, /expectedVersion/);
  assert.match(draftApiSource, /saveAppNoteDraft\(actor,/);
  assert.match(draftApiSource, /updateAppDraft\(actor,/);
  assert.doesNotMatch(draftApiSource, /updateAppDraftPurpose/);
  assert.match(draftApiSource, /Research purpose is invalid/);
  assert.match(createApiSource, /Research purpose is invalid/);
  assert.match(publishApiSource, /publishAppDraft\(actor,/);

  for (const src of [createApiSource, draftApiSource, publishApiSource]) {
    assert.match(src, /toApplicationError/);
    assert.doesNotMatch(src, /@\/db|drizzle|schema\//, "direct DB import in delivery API route!");
  }

  // 3. Verify Note Components Architecture
  const components = [
    "src/app/app/projects/[projectId]/notes/_components/note-list.tsx",
    "src/app/app/projects/[projectId]/notes/_components/note-reader.tsx",
    "src/app/app/projects/[projectId]/notes/_components/note-editor.tsx",
    "src/app/app/projects/[projectId]/notes/_components/note-inspector.tsx",
    "src/app/app/projects/[projectId]/notes/_components/note-workspace.tsx",
    "src/app/app/projects/[projectId]/notes/_components/notes-view.tsx",
  ];

  for (const comp of components) {
    assert.equal(existsSync(comp), true, `missing component: ${comp}`);
    const src = readFileSync(comp, "utf8");
    assert.doesNotMatch(src, /@\/db|drizzle|schema\//, `direct DB import in component: ${comp}`);
    // Brand name safety
    assert.doesNotMatch(src, /"WisdomTree"/, `hardcoded visible brand name in: ${comp}`);
    // No Branch/Space/Team/Personal terminology leakage
    for (const forbidden of [
      "Personal Space",
      "Team Space",
      "WikiRelease",
      "compatibility Branch",
    ]) {
      assert.equal(src.includes(forbidden), false, `legacy term found in ${comp}: ${forbidden}`);
    }
  }

  // 4. Verify Note Reader & Editor Constraints
  const readerSource = readFileSync(
    "src/app/app/projects/[projectId]/notes/_components/note-reader.tsx",
    "utf8",
  );
  assert.match(readerSource, /canEdit/);
  assert.match(readerSource, /ResearchContent/);
  assert.match(readerSource, /MarkdownView/);
  assert.match(readerSource, /dir="auto"/);

  const editorSource = readFileSync(
    "src/app/app/projects/[projectId]/notes/_components/note-editor.tsx",
    "utf8",
  );
  assert.match(editorSource, /SaveStatus/);
  assert.match(editorSource, /saveState/);
  assert.match(editorSource, /version_conflict/);
  assert.match(editorSource, /beforeunload/);
  assert.doesNotMatch(
    editorSource,
    /\b(tiptap|lexical|slate|prosemirror|monaco|codemirror)\b/i,
    "heavy editor dependency found!",
  );

  // Stage 17.6R1 Interaction Verifications:
  // 1. Autosave race safety: a successful response synchronously advances request identity/version.
  assert.match(editorSource, /changeSeqRef/);
  assert.match(
    editorSource,
    /applySuccessfulNoteSave\(saveSnapshotRef\.current, data\.draft, saveSeq\)/,
  );
  assert.match(editorSource, /queuedSaveRef\.current = true/);

  const existingSnapshot: NoteSaveSnapshot = {
    title: "Edit A",
    summary: "",
    contentMd: "A",
    researchPurpose: null,
    draftId: "draft-existing",
    draftVersion: 4,
  };
  const requestA = noteSaveRequest(existingSnapshot);
  assert.equal(requestA.draftVersion, 4);
  existingSnapshot.title = "Edit B";
  existingSnapshot.contentMd = "B";
  applySuccessfulNoteSave(
    existingSnapshot,
    {
      id: "draft-existing",
      noteId: "note-1",
      projectId: "project-1",
      title: "Edit A",
      summary: null,
      contentMd: "A",
      researchPurpose: null,
      version: 5,
      authorPrivate: true,
      status: "editing",
    },
    1,
  );
  const queuedB = noteSaveRequest(existingSnapshot);
  assert.equal(queuedB.draftId, "draft-existing");
  assert.equal(queuedB.draftVersion, 5, "queued save must use the response version");
  assert.equal(queuedB.contentMd, "B");

  const firstDraftSnapshot = { ...existingSnapshot, draftId: null, draftVersion: 0 };
  const firstResult = applySuccessfulNoteSave(
    firstDraftSnapshot,
    {
      id: "draft-created",
      noteId: "note-1",
      projectId: "project-1",
      title: "Edit A",
      summary: null,
      contentMd: "A",
      researchPurpose: null,
      version: 1,
      authorPrivate: true,
      status: "editing",
    },
    1,
  );
  assert.equal(firstResult.draftId, "draft-created");
  assert.equal(noteSaveRequest(firstDraftSnapshot).draftId, "draft-created");
  assert.equal(noteSaveRequest(firstDraftSnapshot).draftVersion, 1);

  // 2. Save-before-internal-publish uses the concrete returned draft identity and sequence.
  assert.match(editorSource, /saved = await executeSave\(\)/);
  assert.match(editorSource, /body: JSON\.stringify\(\{ draftId: saved\.draftId \}\)/);
  assert.match(editorSource, /saved\.savedSequence !== publishSeq/);
  assert.match(editorSource, /changeSeqRef\.current !== publishSeq/);

  // 3. Client SPA and programmatic navigation share one narrow unsaved-Note contract.
  assert.match(
    editorSource,
    /document\.addEventListener\("click", handleCaptureClick, \{ capture: true \}\)/,
  );
  assert.match(editorSource, /handleSafeExitEdit/);
  assert.equal(hasUnpersistedNoteWork(0, 0), false, "untouched editor must be clean");
  assert.equal(hasUnpersistedNoteWork(1, 0), true);
  assert.equal(hasUnpersistedNoteWork(2, 1), true);
  assert.equal(hasUnpersistedNoteWork(2, 2), false);

  const navigationTarget = new EventTarget();
  let navigated = 0;
  let dirty = true;
  const unregister = registerUnsavedNoteNavigationGuard(
    navigationTarget,
    () => dirty,
    () => false,
  );
  assert.equal(
    runGuardedNoteNavigation(() => {
      navigated += 1;
    }, navigationTarget),
    false,
  );
  assert.equal(navigated, 0);
  dirty = false;
  assert.equal(
    runGuardedNoteNavigation(() => {
      navigated += 1;
    }, navigationTarget),
    true,
  );
  assert.equal(navigated, 1);
  unregister();

  const ordinaryAnchor = {
    button: 0,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    target: null,
    download: false,
    href: "https://tmkt.local/app/projects/b",
    currentHref: "https://tmkt.local/app/projects/a/notes/n1",
  };
  assert.equal(shouldGuardNoteAnchorNavigation(ordinaryAnchor), true);
  assert.equal(shouldGuardNoteAnchorNavigation({ ...ordinaryAnchor, ctrlKey: true }), false);
  assert.equal(shouldGuardNoteAnchorNavigation({ ...ordinaryAnchor, metaKey: true }), false);
  assert.equal(shouldGuardNoteAnchorNavigation({ ...ordinaryAnchor, shiftKey: true }), false);
  assert.equal(shouldGuardNoteAnchorNavigation({ ...ordinaryAnchor, button: 1 }), false);
  assert.equal(shouldGuardNoteAnchorNavigation({ ...ordinaryAnchor, target: "_blank" }), false);
  assert.equal(shouldGuardNoteAnchorNavigation({ ...ordinaryAnchor, download: true }), false);
  assert.equal(
    shouldGuardNoteAnchorNavigation({
      ...ordinaryAnchor,
      href: `${ordinaryAnchor.currentHref}#evidence`,
    }),
    false,
  );

  const projectSwitcherSource = readFileSync(
    "src/app/app/projects/[projectId]/_components/project-switcher.tsx",
    "utf8",
  );
  const projectNavigationSource = readFileSync(
    "src/app/app/projects/[projectId]/_components/project-navigation.tsx",
    "utf8",
  );
  const quickSearchSource = readFileSync(
    "src/app/components/ui-next/shell/quick-search.tsx",
    "utf8",
  );
  for (const source of [projectSwitcherSource, quickSearchSource]) {
    assert.match(source, /runGuardedNoteNavigation/);
  }

  assert.match(projectNavigationSource, /<Link[\s\S]*?href={href}/);

  // 4. Version conflict reload confirmation: explicit warning before discarding buffer
  assert.match(editorSource, /notes\.conflict\.confirmReload/);
  assert.match(editorSource, /handleReloadLatest/);

  // 5. Verify Context Inspector & Focus Mode
  const inspectorSource = readFileSync(
    "src/app/app/projects/[projectId]/notes/_components/note-inspector.tsx",
    "utf8",
  );
  assert.match(inspectorSource, /never_published/);
  assert.match(inspectorSource, /published_current/);
  assert.match(inspectorSource, /published_with_changes/);
  assert.match(inspectorSource, /unpublished/);
  assert.match(inspectorSource, /href=\{`\/p\/\$\{publication\.slug\}`\}/);
  assert.match(inspectorSource, /Drawer/);
  // Real evidence section
  assert.match(inspectorSource, /notes\.evidence\.title/);

  const workspaceSource = readFileSync(
    "src/app/app/projects/[projectId]/notes/_components/note-workspace.tsx",
    "utf8",
  );
  assert.match(
    workspaceSource,
    /inspectorOpen,\s*setInspectorOpen\]\s*=\s*useState\(false\)/,
    "Inspector must start closed by default!",
  );
  assert.match(workspaceSource, /focusMode/);
  assert.match(workspaceSource, /Escape/);
  // Double escape prevention: check for open dialog before closing focus mode
  assert.match(workspaceSource, /document\.querySelector\("dialog\[open\]"\)/);

  // 6. Semantic reading width token consistency
  const notesCss = readFileSync("src/app/components/ui-next/notes.css", "utf8");
  assert.match(
    notesCss,
    /\.ui-next-note-reader\s*\{[^}]*max-inline-size:\s*var\(--ui-width-reading\)/,
  );
  assert.match(
    notesCss,
    /\.ui-next-note-editor\s*\{[^}]*max-inline-size:\s*var\(--ui-width-reading\)/,
  );
  assert.match(
    notesCss,
    /\.ui-next-note-workspace--focus \.ui-next-note-workspace__main\s*\{[^}]*max-inline-size:\s*var\(--ui-width-reading\)/,
  );

  // 6. Verify Markdown Parsing & Multilingual Unicode Support
  const sampleMarkdown = `# Nghiên cứu Hán Nôm 漢文
Đây là một đoạn văn bản tiếng Việt có dấu và chữ Hán: 越南 𠀀 𪚥.

:::tip[Ghi chú quan trọng]
Hỗ trợ Unicode tuỳ ý: العربية (العالم العربي), 日本語 (日本語のテキスト), 한국어 (한국어 텍스트).
:::

> Trích dẫn nghiên cứu khoa học.

| Thuộc tính | Giá trị |
| --- | --- |
| Phiên bản | v1.0 |
`;

  const blocks = parseBlocks(sampleMarkdown);
  assert.ok(
    blocks.length >= 4,
    "parsed blocks should contain heading, paragraph, admonition, quote, table",
  );
  assert.equal(blocks[0].type, "heading");
  if (blocks[0].type === "heading") {
    assert.equal(blocks[0].text.includes("漢文"), true, "Unicode preserved in heading");
  }

  const tokens = inlineTokens(
    "Unicode: Tiếng Việt, 漢文, العربية, 日本語, [Safe Link](/docs), `code`",
  );
  assert.ok(tokens.length >= 4);
  const linkToken = tokens.find((t) => t.kind === "link");
  assert.ok(linkToken);

  // 7. Verify Localization & Removal of Stage 17.4
  const requiredKeys = [
    "notes.title",
    "notes.newNote",
    "notes.emptyTitle",
    "notes.emptyDescription",
    "notes.createFirstNote",
    "notes.untitled",
    "notes.state.official",
    "notes.state.draft_changes",
    "notes.state.new_draft",
    "notes.purpose.unspecified",
    "notes.purpose.evidence",
    "notes.purpose.synthesis",
    "notes.purpose.label",
    "notes.publication.never_published",
    "notes.publication.published_current",
    "notes.publication.published_with_changes",
    "notes.publication.unpublished",
    "notes.action.read",
    "notes.action.edit",
    "notes.action.saveInternal",
    "notes.action.preview",
    "notes.action.write",
    "notes.action.focusMode",
    "notes.action.exitFocus",
    "notes.action.inspector",
    "saveStatus.unsaved",
    "saveStatus.saving",
    "saveStatus.saved",
    "saveStatus.failed",
    "saveStatus.conflict",
    "notes.conflict.title",
    "notes.conflict.description",
    "notes.inspector.title",
    "notes.inspector.context",
    "notes.inspector.metadata",
    "notes.inspector.publication",
    "notes.inspector.evidence",
  ] as const;

  for (const key of requiredKeys) {
    assert.ok(viMessages[key], `missing vi key: ${key}`);
    assert.ok(enMessages[key], `missing en key: ${key}`);
  }

  // Cleanup check: no Stage 17.4 in locale strings
  const enJson = JSON.stringify(enMessages);
  const viJson = JSON.stringify(viMessages);
  assert.equal(enJson.includes("Stage 17.4"), false, "Stage 17.4 reference found in enMessages");
  assert.equal(viJson.includes("Stage 17.4"), false, "Stage 17.4 reference found in viMessages");
}
