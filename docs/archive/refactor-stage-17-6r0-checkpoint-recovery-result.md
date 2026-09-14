# Stage 17.6R0 — Forensic Checkpoint Recovery Result

## 1. Result

**PASS**

All 17 affected Stage 17.5/17.6 files were recovered exactly from an authoritative local session transcript. The four tracked files were reconstructed from their verified HEAD/index baselines plus the transcript's recorded successful edits; the other 13 files were reconstructed from recorded full writes and subsequent successful edits. No implementation was inferred from prose reports, and no product logic was repaired.

Post-recovery, no zero-byte file remains in the repository when `.git`, `.next`, and `node_modules` are excluded. All required validation commands pass.

## 2. Repository identity

The identity checks were captured before source recovery:

| Property | Value |
| --- | --- |
| Working directory | `/home/will/dev/WisdomTree` |
| Git top level | `/home/will/dev/WisdomTree` |
| Branch | `main` |
| HEAD | `1b75bba44987220d301cf71147bbdfbce680013d` |
| Worktrees | One worktree: `/home/will/dev/WisdomTree`, branch `main` |

The inspected Antigravity session also records work against `/home/will/dev/WisdomTree`. No alternate active WisdomTree worktree or checkout explains the damaged files.

## 3. Forensic snapshot

The pre-mutation snapshot is outside the repository at:

```text
/tmp/wisdomtree-stage17-pre-recovery.Y9faTm
```

It was created at `2026-09-02T15:25:28+07:00` and contains:

```text
repository-identity.txt
git-status-short.txt
git-diff.binary.patch
git-diff-cached.binary.patch
untracked-files.txt
zero-byte-sha256.txt
untracked-size-time-sha256.txt
```

The snapshot records HEAD, branch, worktree identity, status, binary-safe unstaged and staged diffs, all untracked paths, and affected-file sizes and hashes. `git-diff-cached.binary.patch` is empty. The recovery did not clean, reset, stage, or otherwise alter unrelated working-tree changes.

## 4. Zero-byte inventory

The independent pre-recovery scan found exactly these 17 relevant zero-byte files. The first four were tracked modifications; the remaining 13 were untracked files. The index for each tracked file still matched HEAD.

| Path | State before recovery | HEAD/index size | Last tracked baseline |
| --- | --- | ---: | --- |
| `src/modules/application/materials.ts` | tracked, modified, 0 bytes | 2,991 | `f21d714` / blob `e13862f84b821d61e7f153f7574998a4f6346cd0` |
| `src/modules/application/notes.ts` | tracked, modified, 0 bytes | 5,361 | `f21d714` / blob `f3286bc3fd32ac21df333cffce94a13c06d9af1e` |
| `src/modules/knowledge/service-queries.ts` | tracked, modified, 0 bytes | 25,517 | `c60620f` / blob `49e65020049c901d6c024211a1360b1d78fbd7d4` |
| `src/modules/storage/service.ts` | tracked, modified, 0 bytes | 35,807 | `0374eea` / blob `0b72469ad0b6f473e8f7d555272baca7e0f3dd6f` |
| `src/app/app/projects/[projectId]/notes/[noteId]/page.tsx` | untracked, 0 bytes | absent | none |
| `src/app/app/projects/[projectId]/notes/_components/note-inspector.tsx` | untracked, 0 bytes | absent | none |
| `src/app/app/projects/[projectId]/notes/_components/note-workspace.tsx` | untracked, 0 bytes | absent | none |
| `src/app/app/projects/[projectId]/notes/_components/evidence-picker.tsx` | untracked, 0 bytes | absent | none |
| `src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/_lib.ts` | untracked, 0 bytes | absent | none |
| `src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/note-version/route.ts` | untracked, 0 bytes | absent | none |
| `src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/search/route.ts` | untracked, 0 bytes | absent | none |
| `src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/source-version/route.ts` | untracked, 0 bytes | absent | none |
| `src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/versions/route.ts` | untracked, 0 bytes | absent | none |
| `tests/unit/ui-next-notes-editor.test.ts` | untracked, 0 bytes | absent | none |
| `tests/unit/ui-next-evidence-workflow.test.ts` | untracked, 0 bytes | absent | none |
| `docs/refactor-stage-17-6-evidence-workflow-result.md` | untracked, 0 bytes | absent | none |
| `docs/ui-redesign/implementation/stage-17-6-evidence-workflow.md` | untracked, 0 bytes | absent | none |

## 5. Git/index/HEAD findings

For the four tracked files, `git ls-files -s`, `git show HEAD:<path>`, `git show :<path>`, and path history agreed on the non-zero pre-stage baselines listed above. HEAD and index were authoritative only for the baseline; neither contained the final Stage 17.5/17.6 additions.

The hidden Codex checkpoint tree `bbedc3b2d0a316b97afa11c936ac139f9d3c66ff`, recorded at approximately `2026-09-02 01:49:15+07:00`, independently contains the same four baseline blobs. It does not contain the 13 untracked Stage files.

No tracked file was restored from HEAD alone. Each final tracked file was produced by applying the exact successful transcript edit payloads to its verified HEAD baseline.

## 6. Reflog/stash/worktree findings

- Reflog and `git log --all` contain no reachable Stage 17.5/17.6 checkpoint.
- `git stash list` is empty.
- Branches/refs contain no alternative final checkpoint.
- Only one worktree exists.
- No legitimate second repository copy containing the affected final files was found.

## 7. Object-database findings

`git fsck --full --no-reflogs --unreachable` found unreachable commits, trees, and blobs, but no non-zero Git object with authoritative path provenance for the missing Stage 17.5/17.6 finals.

Two later Git snapshots corroborate the damage:

- dangling root tree `16f0a938d955d1bd33b53940b7114290d0f7b484`, loose-object timestamp approximately `2026-09-02 14:58:47+07:00`;
- hidden Codex capture tree `5b056d8166739701d66fe4d7e9ed900e9fc04715`, captured approximately `2026-09-02 15:20–15:24+07:00`.

Both map all 17 paths to Git's empty blob `e69de29bb2d1d6434b8b29ae775ad8c2e48c5391`. Recent non-zero dangling blobs reverse-map to other surviving Stage files, not these targets. Git therefore supplied reliable tracked baselines and corruption evidence, but not the final Stage implementation bytes.

## 8. Other authoritative recovery sources

The authoritative recovery source is the timestamped Antigravity/Gemini session transcript:

```text
/home/will/.gemini/antigravity-ide/brain/6c2b5b7d-c739-482a-a192-3e6e4097ebd0/.system_generated/logs/transcript_full.jsonl
```

| Property | Value |
| --- | --- |
| Size | 1,693,815 bytes |
| Modified | `2026-09-02 04:26:25.583077904+07:00` |
| SHA-256 | `539e7120baec22a0fb3aefadb5e5f1de2678a6c787db027aa5c69264504443d8` |
| Session ID | `6c2b5b7d-c739-482a-a192-3e6e4097ebd0` |

Its backing SQLite conversation record is:

```text
/home/will/.gemini/antigravity-ide/conversations/6c2b5b7d-c739-482a-a192-3e6e4097ebd0.db
SHA-256: e13ec22ba939e5d67fc0cd64a2f58ab73bcd37771278821e36271f741f841b70
```

The transcript is authoritative because it records the exact code payloads and successful code-action results from the Stage 17.5/17.6 session in this checkout. Ten finals are present as full final `CodeContent`. Three are full writes followed by exact successful replacements. Four are exact successful replacements against byte-verified HEAD/index baselines. Every replacement target matched exactly once during deterministic replay.

Antigravity local-history entries exist for all targets at approximately `04:32:27`, but their stored snapshots are themselves empty and were not used. Generated build output and Gemini prose reports were not used as recovery sources.

## 9. Recovered files

Each file was restored mechanically from the transcript replay candidate and compared byte-for-byte after writing.

| Path | Transcript operation(s) | Restored bytes | SHA-256 |
| --- | --- | ---: | --- |
| `src/modules/application/materials.ts` | step 671 | 3,072 | `764daf1ca670c147151f1bdb75177650dd70a1265883762b385c4bb17680de10` |
| `src/modules/application/notes.ts` | step 679 | 5,448 | `f379f0a2905ceb58001f48160ead016365e5f5dd2a0b9c14a0434072f19113cf` |
| `src/modules/knowledge/service-queries.ts` | steps 655, 659, 665 | 26,589 | `e56b0556f69d3ef3d49b7299a27382040de8c48399531edb9c6ce8957736b18c` |
| `src/modules/storage/service.ts` | step 649 | 36,618 | `c09de56fe0fab7da2311be3efb42f1d8eb9cdf5bd9fdd42203d795f1000b77e3` |
| `src/app/app/projects/[projectId]/notes/[noteId]/page.tsx` | final write step 713 | 2,299 | `1b6a0ded6242e69f34a18826440cc817e6a10a611d708d0b4ad67765588df257` |
| `src/app/app/projects/[projectId]/notes/_components/note-inspector.tsx` | final write step 705 | 11,959 | `1a0054bbfbaf0ca985d80b5ff21854b99bafca4dd9472e03730d4d261feec882` |
| `src/app/app/projects/[projectId]/notes/_components/note-workspace.tsx` | final write step 709 | 8,861 | `4307a306e83f915b2d246c11f305019aae18ec6e0b245349bd1ebccf4292c119` |
| `src/app/app/projects/[projectId]/notes/_components/evidence-picker.tsx` | step 701 | 14,270 | `f1bdaa0b802b22b18f26358d42aed79d2cdd722c05f16928d1b37786793827a0` |
| `src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/_lib.ts` | step 689 | 1,562 | `158f323a1e9ad66e717f400e5efe4b6893caf3bce1aff44811ab447e37631f7c` |
| `src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/note-version/route.ts` | step 697 | 2,334 | `7edce82e1236643dbf054fda1911da8a0d315c24a705e6a0516d32fca6571136` |
| `src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/search/route.ts` | steps 691, 723 | 2,667 | `f0f2402badabd17f7326ddcad22f86183d811402d781cf270959dc92f96a83a1` |
| `src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/source-version/route.ts` | step 695 | 2,376 | `bea3fb9e5b41effcfa707aed1e3ade9fb2d236d19471af8ebeb232b31529c97e` |
| `src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/versions/route.ts` | steps 693, 727 | 1,750 | `df1962725e892b17ea93117c5863be34894431468bbab7072530906624153f15` |
| `tests/unit/ui-next-notes-editor.test.ts` | final edit step 742 | 9,996 | `b02d20d7d2f13668b21b7c538d1047779f6c8f864cde3f2250107ba1c9b4d668` |
| `tests/unit/ui-next-evidence-workflow.test.ts` | step 736 | 9,373 | `77fafd6a50dcf5fbd93ec6514fd90ba86289f8202e211c64b633e25f5fa5feb2` |
| `docs/refactor-stage-17-6-evidence-workflow-result.md` | step 766 | 8,230 | `778f08e7d901fcad16adad4a38d860606d1e33558b390795cd56ac26dfbc99f3` |
| `docs/ui-redesign/implementation/stage-17-6-evidence-workflow.md` | successful write step 764 | 4,854 | `0cb414b89ed34d9b6af1e41b31fbcf9c04fe8a611cc06e422ca51a2b8e02eb5d` |

All files had an original recovery-input size of 0 bytes.

## 10. Unrecoverable files

None. No affected file is classified as `UNRECOVERABLE_STAGE_IMPLEMENTATION`.

## 11. Recovery classification table

| Path | Classification | Basis |
| --- | --- | --- |
| `src/modules/application/materials.ts` | `RECOVERED_EXACT` | verified HEAD baseline + transcript step 671 |
| `src/modules/application/notes.ts` | `RECOVERED_EXACT` | verified HEAD baseline + transcript step 679 |
| `src/modules/knowledge/service-queries.ts` | `RECOVERED_EXACT` | verified HEAD baseline + transcript steps 655/659/665 |
| `src/modules/storage/service.ts` | `RECOVERED_EXACT` | verified HEAD baseline + transcript step 649 |
| `src/app/app/projects/[projectId]/notes/[noteId]/page.tsx` | `RECOVERED_EXACT` | final full transcript write step 713 |
| `src/app/app/projects/[projectId]/notes/_components/note-inspector.tsx` | `RECOVERED_EXACT` | final full transcript write step 705 |
| `src/app/app/projects/[projectId]/notes/_components/note-workspace.tsx` | `RECOVERED_EXACT` | final full transcript write step 709 |
| `src/app/app/projects/[projectId]/notes/_components/evidence-picker.tsx` | `RECOVERED_EXACT` | full transcript write step 701 |
| `src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/_lib.ts` | `RECOVERED_EXACT` | full transcript write step 689 |
| `src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/note-version/route.ts` | `RECOVERED_EXACT` | full transcript write step 697 |
| `src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/search/route.ts` | `RECOVERED_EXACT` | transcript write/edit steps 691/723 |
| `src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/source-version/route.ts` | `RECOVERED_EXACT` | full transcript write step 695 |
| `src/app/api/app/projects/[projectId]/notes/[noteId]/evidence/versions/route.ts` | `RECOVERED_EXACT` | transcript write/edit steps 693/727 |
| `tests/unit/ui-next-notes-editor.test.ts` | `RECOVERED_EXACT` | transcript write/edit chain ending step 742 |
| `tests/unit/ui-next-evidence-workflow.test.ts` | `RECOVERED_EXACT` | full transcript write step 736 |
| `docs/refactor-stage-17-6-evidence-workflow-result.md` | `RECOVERED_EXACT` | full transcript write step 766 |
| `docs/ui-redesign/implementation/stage-17-6-evidence-workflow.md` | `RECOVERED_EXACT` | full successful transcript write step 764 |

Classification totals:

```text
RECOVERED_EXACT: 17
RECOVERED_PRE_STAGE_BASELINE: 0
UNRECOVERABLE_STAGE_IMPLEMENTATION: 0
NOT_ACTUALLY_CORRUPT: 0
```

## 12. Root-cause evidence

**Root cause not proven.**

Observable facts:

- the session transcript records successful non-zero writes/edits;
- all 17 working files were later truncated within an approximately 51 ms cluster at `2026-09-02 04:32:27.493–04:32:27.544+07:00`;
- Antigravity local-history snapshots created at that time are also zero bytes;
- contemporaneous IDE logs include maximum-token/context-limit errors;
- no checkout, reset, alternate worktree, or Git commit explains the truncation.

The timing and IDE errors are correlation only. They do not establish whether the event was an editor fault, tool write/truncation failure, or another filesystem action.

## 13. Post-recovery git status

The working tree remains intentionally dirty with the pre-existing Stage 17.2–17.6 work. The recovery changed only the 17 affected files plus this R0 report. The four tracked recovered modules appear as modified; recovered Stage UI/API/test/report files remain untracked as they were before corruption. No file was staged.

`git status --short` at report preparation:

```text
 M scripts/start-e2e.mjs
 M src/app/api/app/locale/route.ts
 M src/app/api/app/search/route.ts
 M src/app/app/_lib/request-context.ts
 M src/app/components/command-palette.tsx
 M src/app/components/ui-next/index.ts
 M src/app/components/ui-next/localization/locales/en.ts
 M src/app/components/ui-next/localization/locales/vi.ts
 M src/modules/application/materials.ts
 M src/modules/application/notes.ts
 M src/modules/knowledge/service-queries.ts
 M src/modules/storage/service.ts
?? docs/refactor-stage-17-2-app-shell-result.md
?? docs/refactor-stage-17-3-overview-projects-result.md
?? docs/refactor-stage-17-4-project-workspace-shell-result.md
?? docs/refactor-stage-17-5-notes-editor-result.md
?? docs/refactor-stage-17-5-to-17-6-codex-audit-result.md
?? docs/refactor-stage-17-5a-notes-verification-result.md
?? docs/refactor-stage-17-6-evidence-workflow-result.md
?? docs/refactor-stage-17-6r0-checkpoint-recovery-result.md
?? docs/ui-redesign/implementation/stage-17-2-app-shell.md
?? docs/ui-redesign/implementation/stage-17-3-overview-projects.md
?? docs/ui-redesign/implementation/stage-17-4-project-workspace-shell.md
?? docs/ui-redesign/implementation/stage-17-5-notes-editor.md
?? docs/ui-redesign/implementation/stage-17-6-evidence-workflow.md
?? src/app/api/app/projects/
?? src/app/app/_components/
?? src/app/app/error.tsx
?? src/app/app/layout.tsx
?? src/app/app/loading.tsx
?? src/app/app/my-work/
?? src/app/app/page.tsx
?? src/app/app/people/
?? src/app/app/projects/
?? src/app/app/search/
?? src/app/components/ui-next/notes.css
?? src/app/components/ui-next/overview-projects.css
?? src/app/components/ui-next/project-workspace.css
?? src/app/components/ui-next/shell.css
?? src/app/components/ui-next/shell/
?? src/app/components/ui-next/typography/markdown-view.tsx
?? tests/unit/ui-next-app-shell.test.ts
?? tests/unit/ui-next-evidence-workflow.test.ts
?? tests/unit/ui-next-notes-editor.test.ts
?? tests/unit/ui-next-overview-projects.test.ts
?? tests/unit/ui-next-project-workspace.test.ts
```

Because Git collapses untracked directories, this status is not a one-line-per-recovered-file manifest; Sections 9 and 11 are authoritative for the recovery set.

## 14. Validation results

| Command | Result |
| --- | --- |
| `npm run test:unit` | PASS — 14 test files |
| `npm test` | PASS — lint, typecheck, 14 unit files, boundaries, signing, time-zone, legacy contrast, and UI-next contrast checks |
| `npm run build` | PASS — Next.js production build completed; 37 static pages generated |
| `git diff --check` | PASS — no output |
| `npm run test:boundaries` | PASS — 282 delivery files, no direct database access |

The build emitted the existing informational warning that the Next.js ESLint plugin is not detected. It did not fail the build.

## 15. Known correctness defects deliberately left untouched

Recovery deliberately did not repair:

- queued autosave may reuse a stale `expectedVersion`;
- first-save draft ID propagation is not proven correct;
- content and research-purpose saving is not atomic;
- programmatic navigation may bypass dirty-work confirmation;
- official evidence provenance is keyed to current Note identity rather than immutable target Note version, so historical evidence sets are not reconstructable.

Evidence authorization, Evidence-picker behavior, RTL refinements, and every other Stage 17.6 correctness concern also remain outside R0.

## 16. Recommendation for Stage 17.6R1

Stage 17.6R1 may begin from this recovered checkpoint. R1 should validate and repair the five known correctness defects with focused tests, including a deliberate version-scoped official-provenance migration if accepted. It must preserve the recovered source as the forensic baseline and distinguish repairs from recovery.

Do not begin Stage 17.7 from the uncorrected checkpoint.

## 17. Whether any product implementation may resume

Recovery work is closed: every affected file is exact and the repository is structurally complete. Product implementation may resume only with Stage 17.6R1 correctness repair. Downstream Stage 17.7 work should remain paused until R1 establishes its acceptance gates.
