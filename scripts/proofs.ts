// Acceptance proofs from docs/roadmap/demo-brief.md, run against a live app:
//   1. Store-first: uploaded file is in Library and downloadable WHILE
//      extraction_status = 'pending'; a stubbed 'unprocessable' outcome does
//      not remove it.
//   2. Space scoping: a non-member cannot see or download another space's
//      items (API 404), and cannot write into it (403) — not just hidden UI.
//   3. Loan: request → approve → borrow → return updates ticket + item; a
//      second request on an actively loaned item is rejected 409 in the
//      contract Error shape.
//   4. Curation to publish: assign → corrected text → draft →
//      ready_for_review → publish(verified) creates node + promotion + audit
//      chain (uploader/editor_updater/approver_publisher) + outbox; editor
//      cannot publish (403); stale draft save → 409; merge redirects and
//      archives.
// Plus the gate-1 note: every mutation above must have written audit_events
// and outbox_events rows on the real code path (checked directly in the DB).
//
// Usage: app running on BASE_URL (default http://localhost:3000) with a low
// EXTRACTION_STUB_DELAY_MS; then `npm run proofs`.
import { Client } from "pg";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const pg = new Client({
  connectionString:
    process.env.DATABASE_URL ?? "postgres://wisdomtree:wisdomtree@localhost:5432/wisdomtree",
});

let passed = 0;
function ok(name: string, cond: unknown, detail = "") {
  if (!cond) throw new Error(`PROOF FAILED: ${name} ${detail}`);
  passed++;
  console.log(`  ✓ ${name}`);
}

async function login(googleSub: string): Promise<string> {
  const { rows } = await pg.query("SELECT id FROM users WHERE google_sub = $1", [googleSub]);
  const res = await fetch(`${BASE}/api/auth/dev-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: rows[0].id }),
  });
  if (!res.ok) throw new Error(`login failed for ${googleSub}`);
  const cookie = res.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("no session cookie");
  return cookie;
}

const asUser = (cookie: string, init?: RequestInit): RequestInit => ({
  ...init,
  headers: { ...(init?.headers ?? {}), cookie },
});

async function auditCount(action: string, targetId: string): Promise<number> {
  const { rows } = await pg.query(
    "SELECT count(*)::int AS n FROM audit_events WHERE action = $1 AND target_id = $2 AND outcome = 'success'",
    [action, targetId],
  );
  return rows[0].n;
}

async function outboxCount(eventType: string, idField: string, id: string): Promise<number> {
  const { rows } = await pg.query(
    `SELECT count(*)::int AS n FROM outbox_events WHERE event_type = $1 AND payload->>'${idField}' = $2`,
    [eventType, id],
  );
  return rows[0].n;
}

async function main() {
  await pg.connect();
  const lan = await login("dev:lan");
  const huong = await login("dev:huong");

  // ---------- Proof 1: store-first ----------
  console.log("Proof 1 — store-first");
  const { rows: librarySpace } = await pg.query(
    "SELECT id FROM spaces WHERE name = 'Thư Viện Cộng Đồng'",
  );
  const form = new FormData();
  form.set("file", new Blob([Buffer.from("PK\x03\x04 fake zip bytes")], { type: "application/zip" }), "chung-cu.zip");
  form.set("spaceId", librarySpace[0].id);
  form.set("title", "Bằng chứng nén (proof store-first)");
  const upload = await fetch(`${BASE}/api/source/upload`, asUser(lan, { method: "POST", body: form }));
  ok("upload returns 201 (stored)", upload.status === 201, `got ${upload.status}`);
  const source = (await upload.json()) as { id: string; currentVersion: { id: string; extractionStatus: string } };
  ok("extraction still pending at return", source.currentVersion.extractionStatus === "pending");

  const lib1 = (await (await fetch(`${BASE}/api/library`, asUser(lan))).json()) as Array<{ sourceId: string }>;
  ok("item visible in Library while pending", lib1.some((i) => i.sourceId === source.id));
  const dl1 = await fetch(`${BASE}/api/source/${source.id}/download`, asUser(lan));
  ok("download works while pending", dl1.status === 200 && (await dl1.text()).includes("fake zip"));

  ok("audit source.upload written in mutation tx", (await auditCount("source.upload", source.id)) === 1);
  ok("outbox source.uploaded written", (await outboxCount("source.uploaded", "sourceId", source.id)) === 1);
  ok("outbox source.stored written", (await outboxCount("source.stored", "sourceId", source.id)) === 1);

  process.stdout.write("  … waiting for extraction stub");
  let status = "pending";
  for (let i = 0; i < 30 && status === "pending"; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const detail = (await (await fetch(`${BASE}/api/source/${source.id}`, asUser(lan))).json()) as {
      currentVersion: { extractionStatus: string };
    };
    status = detail.currentVersion.extractionStatus;
  }
  console.log("");
  ok("zip ends unprocessable", status === "unprocessable", `got ${status}`);
  const lib2 = (await (await fetch(`${BASE}/api/library`, asUser(lan))).json()) as Array<{ sourceId: string }>;
  ok("unprocessable item NOT removed from Library", lib2.some((i) => i.sourceId === source.id));
  const dl2 = await fetch(`${BASE}/api/source/${source.id}/download`, asUser(lan));
  ok("unprocessable item still downloadable", dl2.status === 200);

  // ---------- Proof 2: space scoping ----------
  console.log("Proof 2 — space scoping (404/403, not hidden UI)");
  const { rows: hidden } = await pg.query(
    `SELECT s.id, s.space_id FROM sources s JOIN spaces sp ON sp.id = s.space_id
     WHERE sp.name = 'Kho Dự Án Cộng Đồng' LIMIT 1`,
  );
  const hiddenId = hidden[0].id;
  ok("non-member read → 404", (await fetch(`${BASE}/api/source/${hiddenId}`, asUser(lan))).status === 404);
  ok(
    "non-member download → 404",
    (await fetch(`${BASE}/api/source/${hiddenId}/download`, asUser(lan))).status === 404,
  );
  const lanLib = (await (await fetch(`${BASE}/api/library`, asUser(lan))).json()) as Array<{ sourceId: string }>;
  ok("non-member list excludes space B", !lanLib.some((i) => i.sourceId === hiddenId));
  const badForm = new FormData();
  badForm.set("file", new Blob(["x"], { type: "text/plain" }), "x.txt");
  badForm.set("spaceId", hidden[0].space_id);
  badForm.set("title", "không được phép");
  ok(
    "non-member write into space B → 403",
    (await fetch(`${BASE}/api/source/upload`, asUser(lan, { method: "POST", body: badForm }))).status === 403,
  );
  ok(
    "admin_op read of same item → 200 (global scope)",
    (await fetch(`${BASE}/api/source/${hiddenId}`, asUser(huong))).status === 200,
  );

  // ---------- Proof 3: loan lifecycle + 409 ----------
  console.log("Proof 3 — loan lifecycle and 409");
  const { rows: borrowed } = await pg.query(
    "SELECT id FROM catalog_items WHERE status = 'borrowed' LIMIT 1",
  );
  const conflict = await fetch(`${BASE}/api/catalog/${borrowed[0].id}/loan/request`, asUser(lan, { method: "POST" }));
  ok("request on borrowed item → 409", conflict.status === 409, `got ${conflict.status}`);
  const conflictBody = (await conflict.json()) as { code?: string; message?: string };
  ok(
    "409 body matches openapi Error shape",
    typeof conflictBody.code === "string" && typeof conflictBody.message === "string",
  );

  const { rows: free } = await pg.query(
    "SELECT id FROM catalog_items WHERE status = 'available' ORDER BY item_code LIMIT 1",
  );
  const itemId = free[0].id;
  const req = await fetch(`${BASE}/api/catalog/${itemId}/loan/request`, asUser(lan, { method: "POST" }));
  ok("request on available item → 201", req.status === 201, `got ${req.status}`);
  const ticket = (await req.json()) as { id: string };

  const dup = await fetch(`${BASE}/api/catalog/${itemId}/loan/request`, asUser(lan, { method: "POST" }));
  ok("second request while active → 409 (index-mapped)", dup.status === 409, `got ${dup.status}`);
  const dupBody = (await dup.json()) as { code?: string };
  ok("409 code is loan_already_active", dupBody.code === "loan_already_active", `got ${dupBody.code}`);

  const approve = await fetch(`${BASE}/api/catalog/loan/${ticket.id}/approve`, asUser(huong, { method: "POST" }));
  ok("librarian approve → 200", approve.status === 200);
  const borrow = await fetch(
    `${BASE}/api/catalog/loan/${ticket.id}/borrow`,
    asUser(huong, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dueAt: new Date(Date.now() + 7 * 86_400_000).toISOString() }),
    }),
  );
  ok("librarian borrow → 200", borrow.status === 200);
  const midItem = (await (await fetch(`${BASE}/api/catalog/${itemId}`, asUser(lan))).json()) as { status: string };
  ok("item status flips to borrowed", midItem.status === "borrowed");

  const ret = await fetch(`${BASE}/api/catalog/loan/${ticket.id}/return`, asUser(huong, { method: "POST" }));
  ok("librarian return → 200", ret.status === 200);
  const endItem = (await (await fetch(`${BASE}/api/catalog/${itemId}`, asUser(lan))).json()) as {
    status: string;
    activeLoan: unknown;
  };
  ok("item back to available, no active loan", endItem.status === "available" && endItem.activeLoan === null);
  const { rows: endTicket } = await pg.query("SELECT state, returned_at FROM loan_tickets WHERE id = $1", [ticket.id]);
  ok("ticket state is returned with returned_at", endTicket[0].state === "returned" && endTicket[0].returned_at);

  for (const action of ["loan.request", "loan.approve", "loan.borrow", "loan.return"]) {
    ok(`audit ${action} written`, (await auditCount(action, ticket.id)) === 1);
  }
  for (const event of ["loan.requested", "loan.approved", "loan.borrowed", "loan.returned"]) {
    ok(`outbox ${event} written`, (await outboxCount(event, "ticketId", ticket.id)) === 1);
  }
  const { rows: notes } = await pg.query(
    "SELECT count(*)::int AS n FROM notifications WHERE payload->>'ticketId' = $1",
    [ticket.id],
  );
  ok("in-app notifications recorded for borrower", notes[0].n >= 3, `got ${notes[0].n}`);
  const { rows: undispatched } = await pg.query(
    "SELECT count(*)::int AS n FROM outbox_events WHERE event_type LIKE 'loan.%' AND dispatched_at IS NULL",
  );
  ok("loan outbox rows marked dispatched (stub dispatcher)", undispatched[0].n === 0);

  // ---------- Proof 4: curation to publish ----------
  // assign → corrected text → draft → ready_for_review → publish(verified)
  // creates node + promotion + audit chain + outbox; editor cannot publish
  // (403); stale draft save → 409; merge redirects and archives.
  console.log("Proof 4 — curation to publish");
  const minh = await login("dev:minh");
  const { rows: minhRow } = await pg.query("SELECT id FROM users WHERE google_sub = 'dev:minh'");
  const minhId = minhRow[0].id;
  const { rows: branchRow } = await pg.query(
    "SELECT id FROM branches WHERE name = 'Lịch Sử Địa Phương'",
  );
  const branchId = branchRow[0].id;

  const p4form = new FormData();
  p4form.set(
    "file",
    new Blob([Buffer.from("Tư liệu gốc cho quy trình hiệu đính và xuất bản.\n\nĐoạn hai của tư liệu.")], {
      type: "text/plain",
    }),
    "hieu-dinh.txt",
  );
  p4form.set("spaceId", librarySpace[0].id);
  p4form.set("title", "Tư liệu proof 4 — hiệu đính và xuất bản");
  const p4upload = await fetch(`${BASE}/api/source/upload`, asUser(lan, { method: "POST", body: p4form }));
  ok("p4 upload returns 201", p4upload.status === 201, `got ${p4upload.status}`);
  const p4source = (await p4upload.json()) as { id: string; currentVersion: { id: string } };
  const p4versionId = p4source.currentVersion.id;

  process.stdout.write("  … waiting for extraction stub");
  let p4status = "pending";
  for (let i = 0; i < 30 && p4status === "pending"; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const detail = (await (await fetch(`${BASE}/api/source/${p4source.id}`, asUser(lan))).json()) as {
      currentVersion: { extractionStatus: string };
    };
    p4status = detail.currentVersion.extractionStatus;
  }
  console.log("");
  ok("p4 text file processed", p4status === "processed", `got ${p4status}`);

  const vbase = `${BASE}/api/source/${p4source.id}/version/${p4versionId}`;
  const json = { "Content-Type": "application/json" };

  // Editor cannot assign; admin assigns Minh.
  ok(
    "editor cannot assign (403)",
    (
      await fetch(`${vbase}/assign`, asUser(minh, { method: "POST", headers: json, body: JSON.stringify({ assigneeId: minhId }) }))
    ).status === 403,
  );
  const assign = await fetch(
    `${vbase}/assign`,
    asUser(huong, { method: "POST", headers: json, body: JSON.stringify({ assigneeId: minhId }) }),
  );
  ok("admin assign → 200 (curation under_correction)", assign.status === 200, `got ${assign.status}`);
  const curation = (await assign.json()) as { state: string };
  ok("curation state is under_correction", curation.state === "under_correction");
  ok("audit source.assign written", (await auditCount("source.assign", p4source.id)) === 1);
  ok("outbox source.assigned written", (await outboxCount("source.assigned", "sourceVersionId", p4versionId)) === 1);

  // Assigned editor appends corrected text; a non-assigned user cannot.
  ok(
    "non-assigned user corrected-text → 403",
    (
      await fetch(`${vbase}/corrected-text`, asUser(lan, { method: "POST", headers: json, body: JSON.stringify({ content: "x" }) }))
    ).status === 403,
  );
  const corrected = await fetch(
    `${vbase}/corrected-text`,
    asUser(minh, {
      method: "POST",
      headers: json,
      body: JSON.stringify({ content: "Bản hiệu đính đầy đủ của tư liệu proof 4." }),
    }),
  );
  ok("corrected-text append → 201", corrected.status === 201, `got ${corrected.status}`);
  ok(
    "audit corrected_text.append written",
    (await auditCount("corrected_text.append", p4versionId)) === 1,
  );

  // Draft save (optimistic-locked), then a stale save → 409.
  const draft1 = await fetch(
    `${vbase}/md-draft`,
    asUser(minh, {
      method: "POST",
      headers: json,
      body: JSON.stringify({ contentMd: "# Bản thảo proof 4\n\nNội dung xuất bản.", suggestedBranchId: branchId }),
    }),
  );
  ok("draft create → 200", draft1.status === 200, `got ${draft1.status}`);
  const draftBody = (await draft1.json()) as { id: string; version: number };
  const draft2 = await fetch(
    `${vbase}/md-draft`,
    asUser(minh, {
      method: "POST",
      headers: json,
      body: JSON.stringify({
        contentMd: "# Bản thảo proof 4\n\nNội dung xuất bản, đã rà soát.",
        expectedVersion: draftBody.version,
      }),
    }),
  );
  ok("draft update with expectedVersion → 200", draft2.status === 200);
  const stale = await fetch(
    `${vbase}/md-draft`,
    asUser(minh, {
      method: "POST",
      headers: json,
      body: JSON.stringify({ contentMd: "bản cũ ghi đè", expectedVersion: draftBody.version }),
    }),
  );
  ok("stale draft save → 409", stale.status === 409, `got ${stale.status}`);
  const staleBody = (await stale.json()) as { code?: string };
  ok("409 code is version_conflict", staleBody.code === "version_conflict", `got ${staleBody.code}`);

  // Ready for review → publish task queued.
  const ready = await fetch(`${vbase}/mark-ready-for-review`, asUser(minh, { method: "POST" }));
  ok("mark-ready-for-review → 200", ready.status === 200, `got ${ready.status}`);
  ok(
    "outbox source.ready_for_review written",
    (await outboxCount("source.ready_for_review", "sourceVersionId", p4versionId)) === 1,
  );
  const { rows: publishTask } = await pg.query(
    "SELECT id, state FROM review_tasks WHERE task_type = 'publish' AND target_id = $1",
    [p4versionId],
  );
  ok("publish review task queued", publishTask.length === 1 && publishTask[0].state === "queued");

  // Editor cannot publish (403); the review workbench serves the admin.
  const { rows: p4chunks } = await pg.query(
    "SELECT id FROM text_chunks WHERE source_version_id = $1 ORDER BY position",
    [p4versionId],
  );
  const publishPayload = JSON.stringify({
    branchId,
    verification: "verified",
    excerptChunkIds: p4chunks.map((c: { id: string }) => c.id),
  });
  ok(
    "editor publish → 403",
    (await fetch(`${vbase}/publish`, asUser(minh, { method: "POST", headers: json, body: publishPayload }))).status === 403,
  );
  const workbench = await fetch(`${BASE}/api/review/publish/${publishTask[0].id}`, asUser(huong));
  ok("publish-review workbench → 200", workbench.status === 200, `got ${workbench.status}`);
  const wb = (await workbench.json()) as { draft: { contentMd: string } | null; correctedText: unknown };
  ok("workbench payload has draft + corrected text", !!wb.draft && !!wb.correctedText);

  const publish = await fetch(
    `${vbase}/publish`,
    asUser(huong, { method: "POST", headers: json, body: publishPayload }),
  );
  ok("admin publish(verified) → 201", publish.status === 201, `got ${publish.status}`);
  const node = (await publish.json()) as { id: string; verification: string };
  ok("node published as verified", node.verification === "verified");

  const { rows: nodeVersions } = await pg.query(
    "SELECT id FROM tree_node_versions WHERE node_id = $1",
    [node.id],
  );
  ok("tree_node_versions snapshot appended", nodeVersions.length === 1);
  const { rows: promo } = await pg.query(
    "SELECT excerpt_chunk_ids FROM promotions WHERE source_version_id = $1",
    [p4versionId],
  );
  ok("promotion row created with excerptChunkIds", promo.length === 1 && promo[0].excerpt_chunk_ids?.length === p4chunks.length);
  const { rows: curationEnd } = await pg.query(
    "SELECT state FROM curations WHERE source_version_id = $1",
    [p4versionId],
  );
  ok("curation promoted", curationEnd[0].state === "promoted");

  // Accountability chain across the flow (uploader / editor_updater / approver_publisher).
  const { rows: chain } = await pg.query(
    `SELECT action, accountability FROM audit_events
     WHERE (action = 'source.upload' AND target_id = $1)
        OR (action = 'corrected_text.append' AND target_id = $2)
        OR (action = 'draft.save' AND target_id = $3)
        OR (action = 'node.publish' AND target_id = $4)`,
    [p4source.id, p4versionId, draftBody.id, node.id],
  );
  const acc = new Map(chain.map((r: { action: string; accountability: string }) => [r.action, r.accountability]));
  ok("audit chain: uploader", acc.get("source.upload") === "uploader");
  ok("audit chain: editor_updater (corrected text)", acc.get("corrected_text.append") === "editor_updater");
  ok("audit chain: editor_updater (draft)", acc.get("draft.save") === "editor_updater");
  ok("audit chain: approver_publisher (publish)", acc.get("node.publish") === "approver_publisher");
  ok("outbox tree.node.published written", (await outboxCount("tree.node.published", "nodeId", node.id)) === 1);
  const { rows: uploaderNote } = await pg.query(
    `SELECT count(*)::int AS n FROM notifications
     WHERE event_type = 'tree.node.published' AND payload->>'nodeId' = $1`,
    [node.id],
  );
  ok("uploader notified in-app of publish", uploaderNote[0].n === 1, `got ${uploaderNote[0].n}`);

  // Idempotent republish: same node, still exactly one promotion.
  const republish = await fetch(
    `${vbase}/publish`,
    asUser(huong, { method: "POST", headers: json, body: publishPayload }),
  );
  ok("republish is idempotent (201, same node)", republish.status === 201);
  const renode = (await republish.json()) as { id: string };
  ok("republish returns the same node", renode.id === node.id);
  const { rows: promoCount } = await pg.query(
    "SELECT count(*)::int AS n FROM promotions WHERE source_version_id = $1",
    [p4versionId],
  );
  ok("still exactly one promotion", promoCount[0].n === 1);

  // Merge: a manual duplicate archives and redirects to the canonical node.
  const dupRes = await fetch(
    `${BASE}/api/tree/nodes`,
    asUser(minh, {
      method: "POST",
      headers: json,
      body: JSON.stringify({
        branchId,
        title: "Bản trùng lặp proof 4",
        contentMd: "# Bản trùng lặp\n\nSẽ được gộp vào trang chuẩn.",
      }),
    }),
  );
  ok("editor creates manual node → 201 (no_source)", dupRes.status === 201, `got ${dupRes.status}`);
  const dupNode = (await dupRes.json()) as { id: string; verification: string };
  ok("manual node enters no_source", dupNode.verification === "no_source");
  const merge = await fetch(
    `${BASE}/api/tree/nodes/${dupNode.id}/merge`,
    asUser(huong, { method: "POST", headers: json, body: JSON.stringify({ canonicalNodeId: node.id }) }),
  );
  ok("merge → 200", merge.status === 200, `got ${merge.status}`);
  const merged = (await (await fetch(`${BASE}/api/tree/nodes/${dupNode.id}`, asUser(lan))).json()) as {
    verification: string;
    canonicalNodeId: string | null;
  };
  ok(
    "merged node archived with canonical redirect",
    merged.verification === "archived" && merged.canonicalNodeId === node.id,
  );
  ok("audit node.merge written", (await auditCount("node.merge", dupNode.id)) === 1);
  ok("outbox tree.node.merged written", (await outboxCount("tree.node.merged", "nodeId", dupNode.id)) === 1);

  console.log(`\nAll proofs passed (${passed} checks).`);
}

main()
  .then(() => pg.end())
  .catch(async (err) => {
    console.error(`\n${err.message}`);
    await pg.end();
    process.exit(1);
  });
