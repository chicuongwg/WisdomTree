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

const daysAhead = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString();

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
    // `archived_at IS NULL` matters: archiving leaves `status` alone, so a
    // retired title still answers this query and the loan below would be
    // refused for the right reason at the wrong moment.
    "SELECT id FROM catalog_items WHERE status = 'available' AND archived_at IS NULL ORDER BY item_code LIMIT 1",
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

  // A retired title cannot be borrowed, and the enforcement is the SERVICE,
  // not the screen. Archiving hides the title from every list and 404s its
  // detail page, so the button is gone — but this endpoint went on issuing
  // tickets to anyone with an old tab or a curl command, against a book the
  // library has just declared it no longer holds, on a ticket no screen links
  // to. The item is returned by now, so archiving is allowed; the request that
  // follows must not be.
  const arch = await fetch(`${BASE}/api/catalog/${itemId}/archive`, asUser(huong, { method: "POST" }));
  ok("librarian archive on a returned title → 204", arch.status === 204);
  const afterArchive = await fetch(`${BASE}/api/catalog/${itemId}/loan/request`, asUser(lan, { method: "POST" }));
  const archErr = (await afterArchive.json()) as { code?: string };
  ok(
    "loan request on an archived title → 409 item_archived",
    afterArchive.status === 409 && archErr.code === "item_archived",
    `got ${afterArchive.status} ${archErr.code}`,
  );
  // Put it back, in SQL, because there is deliberately no un-archive endpoint:
  // retiring a title is a decision, not a toggle. Without this the suite eats
  // one title from the catalogue per run and the NEXT run picks the same row —
  // archiving does not change `status`, so a retired title still reads as
  // available to the query above. Found by running the suite twice, which is
  // the only way this kind of fault ever shows up.
  await pg.query("UPDATE catalog_items SET archived_at = NULL WHERE id = $1", [itemId]);

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
  // The dispatcher is fire-and-forget after the mutation tx; poll briefly
  // instead of asserting instantly (the instant assert was flaky on the
  // production server, where the race is slower than under dev hot-reload).
  let undispatchedN = -1;
  for (let i = 0; i < 10; i++) {
    const { rows: undispatched } = await pg.query(
      "SELECT count(*)::int AS n FROM outbox_events WHERE event_type LIKE 'loan.%' AND dispatched_at IS NULL",
    );
    undispatchedN = undispatched[0].n;
    if (undispatchedN === 0) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  ok("loan outbox rows marked dispatched (stub dispatcher)", undispatchedN === 0);

  // ---------- Proof 4: curation to publish ----------
  // assign → corrected text → draft → ready_for_review → publish(verified)
  // creates node + promotion + audit chain + outbox; editor cannot publish
  // (403); stale draft save → 409; merge redirects and archives.
  console.log("Proof 4 — curation to publish");
  const minh = await login("dev:minh");
  const { rows: minhRow } = await pg.query(
    "SELECT id, display_name FROM users WHERE google_sub = 'dev:minh'",
  );
  const minhId = minhRow[0].id;
  const minhName = minhRow[0].display_name as string;
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
  // The dispatcher runs void-async after the mutation returns; give the
  // richer step-3 tick (preferences + deliveries) a moment to land.
  await new Promise((r) => setTimeout(r, 1500));
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

  // ---------- Proof 5: comments, notifications, deadlines ----------
  // Comment on a visible node OK + mention notification; comment on a
  // non-visible source → 404; preferences PATCH changes delivery channels;
  // deadline create member OK / non-member 403; ICS 200 → 404 after revoke;
  // deadline.approaching exactly once per (deadline, offset).
  console.log("Proof 5 — comments, notifications, deadlines");
  const settle = () => new Promise((r) => setTimeout(r, 1500)); // void dispatchOutbox() is async

  // Idempotency: a previous run's preference PATCH must not leak into the
  // default-matrix assertion below — reset stored preferences first.
  await pg.query("DELETE FROM notification_preferences WHERE user_id = $1", [minhId]);

  const { rows: visNode } = await pg.query(
    "SELECT id FROM tree_nodes WHERE slug = 'ket-qua-khao-sat-thuc-dia-2025'",
  );
  const c1 = await fetch(
    `${BASE}/api/comments`,
    asUser(lan, {
      method: "POST",
      headers: json,
      body: JSON.stringify({
        anchorType: "tree_node",
        anchorId: visNode[0].id,
        // Inline mention: the name is typed into the body, the server
        // resolves it. No `mentions` field is sent any more.
        body: `Thảo luận proof 5: @${minhName} cần đối chiếu thêm bản đồ cổ.`,
      }),
    }),
  );
  ok("comment on visible node → 201", c1.status === 201, `got ${c1.status}`);
  const comment1 = (await c1.json()) as { id: string };
  ok("audit comment.create written", (await auditCount("comment.create", comment1.id)) === 1);
  ok("outbox comment.created written", (await outboxCount("comment.created", "commentId", comment1.id)) === 1);
  const clist = await fetch(
    `${BASE}/api/comments?anchorType=tree_node&anchorId=${visNode[0].id}`,
    asUser(lan),
  );
  const clistBody = (await clist.json()) as Array<{ id: string }>;
  ok("comment list includes seeded + new comment", clistBody.length >= 2 && clistBody.some((c) => c.id === comment1.id));

  await settle();
  const { rows: mentionNote } = await pg.query(
    `SELECT id FROM notifications WHERE user_id = $1 AND event_type = 'comment.created'
       AND payload->>'commentId' = $2`,
    [minhId, comment1.id],
  );
  ok("mention notification created for Minh", mentionNote.length === 1, `got ${mentionNote.length}`);
  const { rows: del1 } = await pg.query(
    "SELECT channel, state FROM notification_deliveries WHERE notification_id = $1 ORDER BY channel",
    [mentionNote[0].id],
  );
  ok(
    "default matrix deliveries (in_app + zalo, sent)",
    del1.length === 2 &&
      del1[0].channel === "in_app" &&
      del1[1].channel === "zalo" &&
      del1.every((d: { state: string }) => d.state === "sent"),
    JSON.stringify(del1),
  );

  // Non-visible anchor delegates to the anchor's read scope → 404, not 403.
  const c404 = await fetch(
    `${BASE}/api/comments`,
    asUser(lan, {
      method: "POST",
      headers: json,
      body: JSON.stringify({ anchorType: "source", anchorId: hiddenId, body: "không thấy được" }),
    }),
  );
  ok("comment on non-visible source → 404", c404.status === 404, `got ${c404.status}`);
  ok(
    "comment list on non-visible source → 404",
    (await fetch(`${BASE}/api/comments?anchorType=source&anchorId=${hiddenId}`, asUser(lan))).status === 404,
  );

  // Preferences PATCH: Minh moves comment.created to email only; the next
  // mention must produce exactly one email delivery row.
  const prefPatch = await fetch(
    `${BASE}/api/notifications/preferences`,
    asUser(minh, {
      method: "PATCH",
      headers: json,
      body: JSON.stringify([{ eventType: "comment.created", channels: ["email"] }]),
    }),
  );
  ok("preferences PATCH → 200", prefPatch.status === 200, `got ${prefPatch.status}`);
  const prefBody = (await prefPatch.json()) as Array<{ eventType: string; channels: string[] }>;
  const commentPref = prefBody.find((p) => p.eventType === "comment.created");
  ok("PATCH result reflects override", JSON.stringify(commentPref?.channels) === '["email"]');
  const c2 = await fetch(
    `${BASE}/api/comments`,
    asUser(lan, {
      method: "POST",
      headers: json,
      body: JSON.stringify({
        anchorType: "tree_node",
        anchorId: visNode[0].id,
        body: `Thảo luận proof 5 (lần hai, sau khi đổi kênh) — @${minhName}.`,
        parentCommentId: comment1.id,
      }),
    }),
  );
  ok("threaded reply comment → 201", c2.status === 201, `got ${c2.status}`);
  const comment2 = (await c2.json()) as { id: string; parentCommentId: string };
  ok("reply carries parentCommentId", comment2.parentCommentId === comment1.id);
  await settle();
  const { rows: note2 } = await pg.query(
    `SELECT id FROM notifications WHERE user_id = $1 AND payload->>'commentId' = $2`,
    [minhId, comment2.id],
  );
  ok("second mention notification created", note2.length === 1);
  const { rows: del2 } = await pg.query(
    "SELECT channel, state FROM notification_deliveries WHERE notification_id = $1",
    [note2[0].id],
  );
  ok(
    "deliveries follow the changed preference (email only, sent)",
    del2.length === 1 && del2[0].channel === "email" && del2[0].state === "sent",
    JSON.stringify(del2),
  );

  // Deadlines: member create OK; non-member create → 403 (write rule); the
  // non-member list never shows the other space's deadline (read rule).
  const dlCreate = await fetch(
    `${BASE}/api/deadlines`,
    asUser(lan, {
      method: "POST",
      headers: json,
      body: JSON.stringify({
        spaceId: librarySpace[0].id,
        title: "Hạn nộp bản thảo proof 5",
        type: "report",
        dueAt: daysAhead(30),
      }),
    }),
  );
  ok("deadline create by space member → 201", dlCreate.status === 201, `got ${dlCreate.status}`);
  const dl = (await dlCreate.json()) as { id: string };
  ok("audit deadline.create written", (await auditCount("deadline.create", dl.id)) === 1);
  ok("outbox deadline.created written", (await outboxCount("deadline.created", "deadlineId", dl.id)) === 1);
  const { rows: otherSpace } = await pg.query(
    "SELECT id FROM spaces WHERE name = 'Kho Dự Án Cộng Đồng'",
  );
  const dlForbidden = await fetch(
    `${BASE}/api/deadlines`,
    asUser(lan, {
      method: "POST",
      headers: json,
      body: JSON.stringify({
        spaceId: otherSpace[0].id,
        title: "không được phép",
        type: "report",
        dueAt: daysAhead(30),
      }),
    }),
  );
  ok("deadline create by non-member → 403", dlForbidden.status === 403, `got ${dlForbidden.status}`);
  const lanDeadlines = (await (await fetch(`${BASE}/api/deadlines`, asUser(lan))).json()) as Array<{
    spaceId: string;
  }>;
  ok(
    "non-member deadline list excludes space B",
    lanDeadlines.length > 0 && !lanDeadlines.some((d) => d.spaceId === otherSpace[0].id),
  );

  // ICS feed: token-authenticated, no session; revoked token → 404.
  const { rows: lanRow } = await pg.query("SELECT id FROM users WHERE google_sub = 'dev:lan'");
  const { rows: tokenRow } = await pg.query(
    // Idempotency: un-revoke first — a previous run's revocation check must not
    // leave this run without a live token.
    "UPDATE calendar_tokens SET revoked_at = NULL WHERE user_id = $1 RETURNING token",
    [lanRow[0].id],
  );
  const ics = await fetch(`${BASE}/calendar/${tokenRow[0].token}.ics`);
  ok("ICS URL returns 200 without a session", ics.status === 200, `got ${ics.status}`);
  ok(
    "ICS content type is text/calendar",
    (ics.headers.get("content-type") ?? "").startsWith("text/calendar"),
    ics.headers.get("content-type") ?? "",
  );
  const icsBody = await ics.text();
  ok(
    "ICS body has the seeded deadline as a VEVENT",
    icsBody.includes("BEGIN:VCALENDAR") && icsBody.includes("Báo cáo tổng kết quý III"),
  );
  await pg.query("UPDATE calendar_tokens SET revoked_at = now() WHERE token = $1", [tokenRow[0].token]);
  ok(
    "revoked token → 404",
    (await fetch(`${BASE}/calendar/${tokenRow[0].token}.ics`)).status === 404,
  );

  // Reminder idempotency: the seeded 5-days-out deadline crossed only its
  // "7 days" offset; ticks during this run must have emitted
  // deadline.approaching EXACTLY once for that (deadline, offset).
  const { rows: nearDl } = await pg.query(
    "SELECT id FROM deadlines WHERE title = 'Báo cáo tổng kết quý III'",
  );
  const { rows: reminders } = await pg.query(
    `SELECT "offset"::text AS off FROM deadline_reminders WHERE deadline_id = $1`,
    [nearDl[0].id],
  );
  ok("deadline_reminders dedup row exists (7 days only)", reminders.length === 1 && reminders[0].off === "7 days", JSON.stringify(reminders));
  ok(
    "outbox deadline.approaching exactly once",
    (await outboxCount("deadline.approaching", "deadlineId", nearDl[0].id)) === 1,
  );
  // Another mutation triggers another tick; the count must not grow.
  const c3 = await fetch(
    `${BASE}/api/comments`,
    asUser(lan, {
      method: "POST",
      headers: json,
      body: JSON.stringify({ anchorType: "deadline", anchorId: dl.id, body: "Kiểm tra nhắc hạn không lặp." }),
    }),
  );
  ok("comment on own-space deadline → 201", c3.status === 201, `got ${c3.status}`);
  await settle();
  ok(
    "deadline.approaching still exactly once after another tick",
    (await outboxCount("deadline.approaching", "deadlineId", nearDl[0].id)) === 1,
  );
  const { rows: approachNotes } = await pg.query(
    `SELECT count(*)::int AS n FROM notifications
     WHERE event_type = 'deadline.approaching' AND payload->>'deadlineId' = $1`,
    [nearDl[0].id],
  );
  ok("space members notified of approaching deadline", approachNotes[0].n >= 3, `got ${approachNotes[0].n}`);

  // ---------- Proof 6: export ----------
  // Member render → 202 job → succeeded artifact downloadable (stub HTML or
  // real docx; converter warning surfaced when stub); editor render allowed
  // (all roles); tree export editor 403 / admin 202 → export_jobs succeeded
  // with manifest listing published slugs; bare repo commit verified; outbox
  // export.completed; re-export without content change makes NO new commit.
  console.log("Proof 6 — export");
  const { execFileSync } = await import("node:child_process");
  const gitDir = process.env.EXPORT_REPO_DIR ?? "data/content-repo.git";
  const bareGit = (...args: string[]) =>
    execFileSync("git", [`--git-dir=${gitDir}`, ...args], { encoding: "utf8" }).trim();

  const renderRes = await fetch(
    `${BASE}/api/tree/nodes/${visNode[0].id}/export`,
    asUser(lan, { method: "POST", headers: json, body: JSON.stringify({ format: "docx" }) }),
  );
  ok("member render request → 202", renderRes.status === 202, `got ${renderRes.status}`);
  const renderRef = (await renderRes.json()) as { jobId: string; state: string };

  type JobStatus = {
    state: string;
    result?: { downloadUrl: string; converterWarnings: string[] };
  };
  // Always fetch at least once: an idempotent re-request may return a JobRef
  // that is already succeeded, and the result rides on the status endpoint.
  let renderJob = (await (await fetch(`${BASE}/api/jobs/${renderRef.jobId}`, asUser(lan))).json()) as JobStatus;
  for (let i = 0; i < 20 && renderJob.state !== "succeeded" && renderJob.state !== "failed"; i++) {
    await new Promise((r) => setTimeout(r, 500));
    renderJob = (await (await fetch(`${BASE}/api/jobs/${renderRef.jobId}`, asUser(lan))).json()) as JobStatus;
  }
  ok("render job reaches succeeded", renderJob.state === "succeeded", `got ${renderJob.state}`);
  const artifact = await fetch(`${BASE}${renderJob.result!.downloadUrl}`);
  ok("render artifact downloadable via signed blob URL", artifact.status === 200, `got ${artifact.status}`);
  const artifactType = artifact.headers.get("content-type") ?? "";
  if (artifactType.startsWith("text/html")) {
    ok(
      "stub artifact carries converter warning",
      renderJob.result!.converterWarnings.includes("stub: pandoc unavailable"),
      JSON.stringify(renderJob.result!.converterWarnings),
    );
    ok(
      "stub HTML contains the node content",
      (await artifact.text()).includes("Kết quả khảo sát thực địa 2025"),
    );
  } else {
    ok("real docx artifact has the docx content type", artifactType.includes("officedocument"));
  }
  ok(
    "render is NOT audited (read-style action)",
    (await auditCount("node.export", visNode[0].id)) === 0 &&
      (await auditCount("export.document", visNode[0].id)) === 0,
  );

  const editorRender = await fetch(
    `${BASE}/api/tree/nodes/${visNode[0].id}/export`,
    asUser(minh, { method: "POST", headers: json, body: JSON.stringify({ format: "pdf" }) }),
  );
  ok("editor render allowed (all roles) → 202", editorRender.status === 202, `got ${editorRender.status}`);

  ok(
    "tree export by editor → 403",
    (await fetch(`${BASE}/api/export/tree`, asUser(minh, { method: "POST" }))).status === 403,
  );
  const exportRes = await fetch(`${BASE}/api/export/tree`, asUser(huong, { method: "POST" }));
  ok("tree export by admin → 202", exportRes.status === 202, `got ${exportRes.status}`);
  const exportRef = (await exportRes.json()) as { jobId: string };
  let exportState = "queued";
  for (let i = 0; i < 20 && exportState !== "succeeded" && exportState !== "failed"; i++) {
    await new Promise((r) => setTimeout(r, 500));
    exportState = (
      (await (await fetch(`${BASE}/api/jobs/${exportRef.jobId}`, asUser(huong))).json()) as { state: string }
    ).state;
  }
  ok("export job reaches succeeded", exportState === "succeeded", `got ${exportState}`);

  const { rows: exportRow } = await pg.query("SELECT manifest FROM export_jobs WHERE id = $1", [exportRef.jobId]);
  const manifest = exportRow[0].manifest as {
    commitSha: string;
    changed: boolean;
    files: Array<{ path: string; slug: string; publish: boolean }>;
  };
  const { rows: publishedSlugs } = await pg.query(
    "SELECT slug FROM tree_nodes WHERE publish = true AND verification = 'verified'",
  );
  ok(
    "manifest lists every published node slug",
    publishedSlugs.every((r) => manifest.files.some((f) => f.slug === r.slug && f.publish)),
    JSON.stringify(manifest.files),
  );
  ok(
    "bare repo HEAD matches manifest commit sha",
    bareGit("rev-parse", "HEAD") === manifest.commitSha,
  );
  const treeListing = bareGit("ls-tree", "-r", "--name-only", "HEAD");
  ok(
    "bare repo commit contains the exported files",
    manifest.files.every((f) => treeListing.includes(f.path)),
    treeListing,
  );
  ok("audit export.trigger written", (await auditCount("export.trigger", exportRef.jobId)) === 1);
  ok(
    "outbox export.completed written",
    (await outboxCount("export.completed", "exportJobId", exportRef.jobId)) === 1,
  );

  // Idempotent no-change policy: identical content → NO new commit; the
  // second manifest records changed=false with the same HEAD sha.
  const commitCountBefore = bareGit("rev-list", "--count", "HEAD");
  const rerunRes = await fetch(`${BASE}/api/export/tree`, asUser(huong, { method: "POST" }));
  ok("second tree export → 202", rerunRes.status === 202);
  const rerunRef = (await rerunRes.json()) as { jobId: string };
  let rerunState = "queued";
  for (let i = 0; i < 20 && rerunState !== "succeeded" && rerunState !== "failed"; i++) {
    await new Promise((r) => setTimeout(r, 500));
    rerunState = (
      (await (await fetch(`${BASE}/api/jobs/${rerunRef.jobId}`, asUser(huong))).json()) as { state: string }
    ).state;
  }
  ok("second export succeeded", rerunState === "succeeded", `got ${rerunState}`);
  const { rows: rerunRow } = await pg.query("SELECT manifest FROM export_jobs WHERE id = $1", [rerunRef.jobId]);
  const rerunManifest = rerunRow[0].manifest as { commitSha: string; changed: boolean };
  ok(
    "unchanged content → no new commit, same sha",
    rerunManifest.changed === false &&
      rerunManifest.commitSha === manifest.commitSha &&
      bareGit("rev-list", "--count", "HEAD") === commitCountBefore,
    JSON.stringify(rerunManifest),
  );

  const health = await fetch(`${BASE}/api/admin/health`, asUser(huong));
  ok("admin health → 200", health.status === 200, `got ${health.status}`);
  const healthBody = (await health.json()) as {
    jobCounts: Record<string, Record<string, number>>;
    lastExport: { id: string } | null;
  };
  ok(
    "health reports render + export_tree job counts and last export",
    (healthBody.jobCounts.render?.succeeded ?? 0) >= 1 &&
      (healthBody.jobCounts.export_tree?.succeeded ?? 0) >= 2 &&
      healthBody.lastExport?.id === rerunRef.jobId,
    JSON.stringify(healthBody.jobCounts),
  );
  ok(
    "admin health hidden from editor (404)",
    (await fetch(`${BASE}/api/admin/health`, asUser(minh))).status === 404,
  );

  // ---------- Proof 7: notification links ----------
  // The owner-reported defect: a notification named an event but never
  // opened it. Every matrix event that has an object must resolve to that
  // object's route through the ONE shared resolver both surfaces use, the
  // link text must be the Vietnamese sentence (never a raw event key), and
  // an unmappable event must resolve to null so the UI renders plain text
  // instead of a dead link. Unit-style: the resolver is pure, so this
  // asserts it directly rather than scraping rendered HTML.
  console.log("Proof 7 — notification links");
  const seenRenderedEvents = new Set<string>();
  const { notificationLink } = await import("../src/modules/notify/links");
  const { eventLabel, notificationEventLabel } = await import("../src/lib/vi");

  const linkOf = (
    eventType: string,
    payload: Record<string, unknown>,
    ctx: Parameters<typeof notificationLink>[2] = {},
  ) => notificationLink(eventType, payload, ctx);

  // comment.created → the ANCHOR's route plus the comment fragment.
  const cNode = linkOf("comment.created", {
    commentId: "c-1",
    anchorType: "tree_node",
    anchorId: "n-1",
    authorId: "u-1",
    mentions: ["u-2"],
  });
  ok(
    "comment.created on a node → /tree/node/:id#comment-:id",
    cNode?.href === "/tree/node/n-1#comment-c-1",
    JSON.stringify(cNode),
  );
  ok(
    "comment.created anchored to a loan ticket → no link (loan tickets carry a record, not a discussion)",
    linkOf(
      "comment.created",
      { commentId: "c-2", anchorType: "loan_ticket", anchorId: "t-9" },
      { ticketItemIds: { "t-9": "i-9" } },
    ) === null,
  );
  ok(
    "loan.approved without an itemId still reaches the item via the ticket lookup",
    linkOf("loan.approved", { ticketId: "t-9" }, { ticketItemIds: { "t-9": "i-9" } })?.href ===
      "/catalog/i-9",
  );
  ok(
    "comment.created on a deadline → /deadlines/:id#comment-:id",
    linkOf("comment.created", { commentId: "c-3", anchorType: "deadline", anchorId: "d-3" })
      ?.href === "/deadlines/d-3#comment-c-3",
  );

  // source.assigned → the assignee's workbench, other readers the member view.
  const assignedCtx = { assignedSourceIds: ["s-1"], viewerRole: "editor" as const };
  ok(
    "source.assigned → /source/task/:sourceId for the assignee",
    linkOf(
      "source.assigned",
      { sourceId: "s-1", sourceVersionId: "sv-1", assigneeId: "u-2", uploaderId: "u-1" },
      assignedCtx,
    )?.href === "/source/task/s-1",
  );
  ok(
    "source.assigned without a curation held by the viewer → member /library/:id",
    linkOf("source.assigned", { sourceId: "s-1" }, { viewerRole: "user" })?.href === "/library/s-1",
  );
  ok(
    "source.ready_for_review → Admin/Op Source Detail /source/:id",
    linkOf("source.ready_for_review", { sourceId: "s-7" }, { viewerRole: "admin_op" })?.href ===
      "/source/s-7",
  );

  // loan.* → the catalog item the ticket is for, from itemId or the lookup.
  ok(
    "loan.approved → /catalog/:itemId from the payload",
    linkOf("loan.approved", { ticketId: "t-1", itemId: "i-1", borrowerId: "u-3" })?.href ===
      "/catalog/i-1",
  );
  ok(
    "loan.approved without itemId → /catalog/:itemId resolved from the ticket",
    linkOf("loan.approved", { ticketId: "t-1" }, { ticketItemIds: { "t-1": "i-1" } })?.href ===
      "/catalog/i-1",
  );

  ok(
    "deadline.approaching → /deadlines/:id",
    linkOf("deadline.approaching", { deadlineId: "d-1", spaceId: "sp-1", title: "Hội thảo" })
      ?.href === "/deadlines/d-1",
  );
  ok(
    "tree.node.published → /tree/node/:id",
    linkOf("tree.node.published", { nodeId: "n-2", branchId: "b-1" })?.href === "/tree/node/n-2",
  );

  // Link text is the Vietnamese sentence, never the technical key.
  ok(
    "link label is the Vietnamese event sentence, not the raw key",
    cNode?.label === notificationEventLabel["comment.created"] &&
      !cNode?.label.includes("comment.created"),
    JSON.stringify(cNode?.label),
  );

  // Unmappable → null (plain text), and a missing id never fabricates a route.
  ok(
    "unknown event type → no link",
    linkOf("something.invented", { id: "x" }) === null,
  );
  ok(
    "loan event with neither itemId nor a resolvable ticket → no link",
    linkOf("loan.approved", { ticketId: "t-404" }) === null,
  );
  ok(
    "comment on an unknown anchor type → no link",
    linkOf("comment.created", { commentId: "c-4", anchorType: "galaxy", anchorId: "g-1" }) === null,
  );

  // The label guard: a key the map has not caught up with degrades to neutral
  // Vietnamese, never to "source.ready_for_review" in the middle of the UI.
  const missing = eventLabel("event.not.in.the.map");
  ok(
    "missing label falls back to neutral Vietnamese, not the raw key",
    missing === "Cập nhật mới" && !missing.includes("event.not.in.the.map"),
    missing,
  );
  // Every matrix event that names an object must actually produce a link —
  // this is what stops a future event type from silently landing unlinked.
  const SAMPLE_PAYLOADS: Record<string, Record<string, unknown>> = {
    "source.processing_failed": { sourceId: "s-1" },
    "source.assigned": { sourceId: "s-1" },
    "source.ready_for_review": { sourceId: "s-1" },
    "tree.node.published": { nodeId: "n-1" },
    "loan.approved": { ticketId: "t-1", itemId: "i-1" },
    "loan.borrowed": { ticketId: "t-1", itemId: "i-1" },
    "loan.returned": { ticketId: "t-1", itemId: "i-1" },
    "loan.declined": { ticketId: "t-1", itemId: "i-1" },
    "loan.overdue": { ticketId: "t-1", itemId: "i-1" },
    "deadline.approaching": { deadlineId: "d-1" },
    "comment.created": { commentId: "c-1", anchorType: "tree_node", anchorId: "n-1" },
  };
  const unlinked = Object.keys(SAMPLE_PAYLOADS).filter(
    (k) => linkOf(k, SAMPLE_PAYLOADS[k], { viewerRole: "admin_op" }) === null,
  );
  ok("every matrix event resolves to a link", unlinked.length === 0, unlinked.join(", "));
  const unlabelled = Object.keys(SAMPLE_PAYLOADS).filter(
    (k) => notificationEventLabel[k] === undefined,
  );
  ok("every matrix event type has a Vietnamese label", unlabelled.length === 0, unlabelled.join(", "));

  // Route/HTTP smoke over the pure assertions: the resolver's answer has to
  // survive rendering. For every notification the four required event types
  // actually produced for a real user, the rendered Notification Center must
  // carry an anchor whose href is that notification's resolved target — and
  // the page must never print the raw event key.
  const REQUIRED_EVENTS = [
    "comment.created",
    "source.assigned",
    "loan.approved",
    "deadline.approaching",
  ] as const;
  for (const [who, cookie] of [
    ["minh", minh],
    ["lan", lan],
    ["huong", huong],
  ] as const) {
    const { rows: whoRow } = await pg.query("SELECT id, role FROM users WHERE google_sub = $1", [
      `dev:${who}`,
    ]);
    const { rows: whoNotes } = await pg.query(
      `SELECT event_type, payload FROM notifications
        WHERE user_id = $1 AND event_type = ANY($2::text[])
        ORDER BY created_at DESC LIMIT 100`,
      [whoRow[0].id, [...REQUIRED_EVENTS]],
    );
    if (whoNotes.length === 0) continue;
    const html = await (await fetch(`${BASE}/notifications`, asUser(cookie))).text();
    // Curation assignments and ticket→item are the DB facts the page hydrates.
    const { rows: assignedRows } = await pg.query(
      `SELECT sv.source_id FROM curations c
         JOIN source_versions sv ON sv.id = c.source_version_id
        WHERE c.assigned_to = $1`,
      [whoRow[0].id],
    );
    const { rows: ticketRows } = await pg.query("SELECT id, item_id FROM loan_tickets");
    const ctx = {
      assignedSourceIds: assignedRows.map((r: { source_id: string }) => r.source_id),
      ticketItemIds: Object.fromEntries(
        ticketRows.map((r: { id: string; item_id: string }) => [r.id, r.item_id]),
      ),
      viewerRole: whoRow[0].role as "user" | "editor" | "admin_op",
    };
    for (const eventType of REQUIRED_EVENTS) {
      const note = whoNotes.find((n: { event_type: string }) => n.event_type === eventType);
      if (!note) continue;
      const expected = notificationLink(eventType, note.payload, ctx);
      ok(
        `/notifications renders ${eventType} as an href to its target (${who})`,
        expected !== null && html.includes(`href="${expected.href}"`),
        `expected ${expected?.href}`,
      );
      seenRenderedEvents.add(eventType);
    }
    ok(
      `/notifications never prints a raw event key (${who})`,
      !REQUIRED_EVENTS.some((e) => html.includes(`>${e}<`)),
    );
  }
  ok(
    "all four required event types were proven end-to-end in the rendered page",
    REQUIRED_EVENTS.every((e) => seenRenderedEvents.has(e)),
    `missing ${REQUIRED_EVENTS.filter((e) => !seenRenderedEvents.has(e)).join(", ")}`,
  );

  // ---------- Proof 8: knowledge graph ----------
  // Wiki-links are the authoring surface of the graph, so the proof follows
  // one page through its whole life: a [[link]] written in the content
  // becomes a node_links row in the same save, shows up as a backlink on the
  // target, and disappears when the text does — while an explicitly declared
  // typed link survives that content edit. Plus the two read surfaces the
  // reader actually touches: the preview endpoint and /graph.
  console.log("Proof 8 — knowledge graph");
  const { rows: folkBranch } = await pg.query(
    "SELECT id FROM branches WHERE name = 'Văn Hóa Dân Gian'",
  );
  const targetNodeId = visNode[0].id as string;
  const { rows: targetRow } = await pg.query("SELECT title FROM tree_nodes WHERE id = $1", [
    targetNodeId,
  ]);
  const targetTitle = targetRow[0].title as string;

  // The wiki-link is written WITHOUT diacritics and in lower case: resolution
  // must be as forgiving as search (immutable_unaccent), or authors have to
  // type titles perfectly and nobody links anything.
  const linkedContent =
    "# Trang kiểm chứng liên kết\n\n" +
    "Dẫn lại số liệu trong [[ket qua khao sat thuc dia 2025]] để đối chiếu.\n\n" +
    "Phần này còn thiếu [[Một trang chưa ai viết 4242]].";
  const createRes = await fetch(
    `${BASE}/api/tree/nodes`,
    asUser(minh, {
      method: "POST",
      headers: json,
      body: JSON.stringify({
        branchId: folkBranch[0].id,
        title: "Trang kiểm chứng liên kết",
        contentMd: linkedContent,
      }),
    }),
  );
  ok("editor creates a node carrying a wiki-link → 201", createRes.status === 201, `got ${createRes.status}`);
  const wikiNode = (await createRes.json()) as { id: string; version: number };

  const derived = async (fromId: string, type = "related") =>
    (
      await pg.query(
        "SELECT to_node_id FROM node_links WHERE from_node_id = $1 AND link_type = $2",
        [fromId, type],
      )
    ).rows.map((r: { to_node_id: string }) => r.to_node_id);

  ok(
    "saving [[Tiêu đề]] wrote the node_links row (diacritic-insensitive match)",
    (await derived(wikiNode.id)).length === 1 && (await derived(wikiNode.id))[0] === targetNodeId,
    JSON.stringify(await derived(wikiNode.id)),
  );
  ok(
    "an unresolved [[…]] creates no link row",
    (await derived(wikiNode.id)).length === 1,
  );

  // The target's incoming query (WHERE to_node_id = :id) is what the
  // "Liên kết đến trang này" panel reads.
  type NodeRead = {
    backlinks: Array<{ fromNodeId: string; title: string; context: string; linkType: string }>;
    links: Array<{ toNodeId: string; linkType: string }>;
  };
  const targetRead = (await (
    await fetch(`${BASE}/api/tree/nodes/${targetNodeId}`, asUser(lan))
  ).json()) as NodeRead;
  const backlink = targetRead.backlinks.find((b) => b.fromNodeId === wikiNode.id);
  ok("target's backlink query returns the linking page", backlink !== undefined);
  ok(
    "backlink carries the sentence around the link as context",
    !!backlink && backlink.context.includes("Dẫn lại số liệu"),
    JSON.stringify(backlink?.context),
  );

  // Rendered Node Detail: the resolved link is an anchor, the unresolved one
  // is visibly marked and is NOT a link.
  const wikiHtml = await (await fetch(`${BASE}/tree/node/${wikiNode.id}`, asUser(lan))).text();
  ok(
    "resolved wiki-link renders as an in-app node link",
    wikiHtml.includes(`href="/tree/node/${targetNodeId}"`),
  );
  ok(
    "unresolved wiki-link renders non-link and marked",
    // rendered inside the wiki-missing span, never inside an anchor
    /<span class="wiki-missing"[^>]*>Một trang chưa ai viết 4242<\/span>/.test(wikiHtml) &&
      !/<a[^>]*>[^<]*Một trang chưa ai viết 4242/.test(wikiHtml),
  );
  ok("node detail carries the backlinks panel", wikiHtml.includes("Liên kết đến trang này"));
  // The knowledge page no longer embeds a map: 600px of page to draw two dots
  // that the backlink panels beside it already state in words. It links out to
  // the real map, scoped to this page.
  ok(
    "node detail links out to the map, scoped to this page",
    wikiHtml.includes(`/graph?node=${wikiNode.id}`),
  );

  // Merge rule: 'related' is the wiki-link channel (owned by the content),
  // typed links are the explicit channel (untouched by a content save).
  const explicitPatch = await fetch(
    `${BASE}/api/tree/nodes/${wikiNode.id}`,
    asUser(minh, {
      method: "PATCH",
      headers: json,
      body: JSON.stringify({
        links: [{ toNodeId: targetNodeId, linkType: "supports" }],
        expectedVersion: wikiNode.version,
      }),
    }),
  );
  ok("explicit typed link editor still works → 200", explicitPatch.status === 200, `got ${explicitPatch.status}`);
  const afterExplicit = (await explicitPatch.json()) as { version: number };

  const removePatch = await fetch(
    `${BASE}/api/tree/nodes/${wikiNode.id}`,
    asUser(minh, {
      method: "PATCH",
      headers: json,
      body: JSON.stringify({
        contentMd: "# Trang kiểm chứng liên kết\n\nĐã bỏ liên kết wiki khỏi nội dung.",
        expectedVersion: afterExplicit.version,
      }),
    }),
  );
  ok("editing the content out → 200", removePatch.status === 200, `got ${removePatch.status}`);
  ok(
    "removing the wiki-link removes the derived link row",
    (await derived(wikiNode.id)).length === 0,
    JSON.stringify(await derived(wikiNode.id)),
  );
  ok(
    "explicitly declared typed link survives the content save",
    (await derived(wikiNode.id, "supports")).length === 1,
  );
  const targetAfter = (await (
    await fetch(`${BASE}/api/tree/nodes/${targetNodeId}`, asUser(lan))
  ).json()) as NodeRead;
  ok(
    "the target keeps only the explicit backlink after the removal",
    targetAfter.backlinks.filter((b) => b.fromNodeId === wikiNode.id && b.linkType === "related")
      .length === 0,
  );

  // Preview endpoint: excerpt for a permitted reader, no leak otherwise.
  const previewRes = await fetch(`${BASE}/api/tree/nodes/${targetNodeId}/preview`, asUser(lan));
  ok("preview endpoint → 200 for a permitted user", previewRes.status === 200, `got ${previewRes.status}`);
  const previewBody = (await previewRes.json()) as {
    title: string;
    verification: string;
    excerpt: string;
  };
  ok(
    "preview returns title, verification and an excerpt",
    previewBody.title === targetTitle &&
      previewBody.verification === "verified" &&
      previewBody.excerpt.length > 0 &&
      previewBody.excerpt.length <= 201 &&
      !previewBody.excerpt.includes("[["),
    JSON.stringify(previewBody),
  );
  ok(
    "preview refuses an unauthenticated caller (401)",
    (await fetch(`${BASE}/api/tree/nodes/${targetNodeId}/preview`)).status === 401,
  );
  ok(
    "preview of an unknown node → 404 (no existence leak)",
    (await fetch(
      `${BASE}/api/tree/nodes/00000000-0000-4000-8000-000000000000/preview`,
      asUser(lan),
    )).status === 404,
  );

  // /graph renders marks and edges server-side for every role that can read.
  for (const [who, cookie] of [
    ["thành viên", lan],
    ["quản trị", huong],
  ] as const) {
    const res = await fetch(`${BASE}/graph`, asUser(cookie));
    ok(`/graph → 200 (${who})`, res.status === 200, `got ${res.status}`);
    const html = await res.text();
    ok(`/graph renders node marks (${who})`, (html.match(/class="g-node/g) ?? []).length >= 4);
    ok(`/graph renders edges (${who})`, (html.match(/class="g-edge/g) ?? []).length >= 1);
    ok(`/graph carries the verification legend (${who})`, html.includes("map-legend"));
  }

  // ---------- Proof 9: loan record and inline mentions ----------
  // Owner decision 2026-07-20: a loan ticket carries a FACTUAL RECORD, not a
  // discussion, and members are mentioned by typing @Tên rather than ticking a
  // roster. This proof holds both halves of that ruling to the wall:
  //   (a) an @Tên typed into a comment body still produces exactly the mention
  //       notification the matrix promises — the dispatcher never changed;
  //   (b) the loan_ticket anchor is gone from the contract, so a comment aimed
  //       at one is refused 400 invalid_anchor (the house code for a malformed
  //       request; 404 stays reserved for an anchor the caller may not see,
  //       and there is no such anchor to hide here);
  //   (c) Catalog Item Detail answers "ai đang giữ cuốn này và ai đã duyệt"
  //       on its own: borrower, approver and due date are in the HTML.
  console.log("Proof 9 — loan record and mentions");

  const { rows: huongRow } = await pg.query(
    "SELECT id, display_name FROM users WHERE google_sub = 'dev:huong'",
  );
  const huongId = huongRow[0].id as string;
  const huongName = huongRow[0].display_name as string;

  // (a) inline @Tên → the same mention notification as the old checkbox list.
  const c9 = await fetch(
    `${BASE}/api/comments`,
    asUser(lan, {
      method: "POST",
      headers: json,
      body: JSON.stringify({
        anchorType: "tree_node",
        anchorId: visNode[0].id,
        body: `Proof 9: nhờ @${huongName} xem lại phần chú thích ảnh giúp em.`,
      }),
    }),
  );
  ok("comment with an inline @Tên → 201", c9.status === 201, `got ${c9.status}`);
  const comment9 = (await c9.json()) as { id: string; mentions: string[] };
  ok(
    "the server resolved @Tên into comments.mentions",
    comment9.mentions.length === 1 && comment9.mentions[0] === huongId,
    JSON.stringify(comment9.mentions),
  );
  await settle();
  const { rows: note9 } = await pg.query(
    `SELECT id FROM notifications WHERE user_id = $1 AND event_type = 'comment.created'
       AND payload->>'commentId' = $2`,
    [huongId, comment9.id],
  );
  ok("inline mention notifies the named member", note9.length === 1, `got ${note9.length}`);

  // A name nobody answers to is simply not a mention — never an error.
  const c9b = await fetch(
    `${BASE}/api/comments`,
    asUser(lan, {
      method: "POST",
      headers: json,
      body: JSON.stringify({
        anchorType: "tree_node",
        anchorId: visNode[0].id,
        body: "Proof 9: @KhôngCóAiTênNàyCả vẫn phải gửi được bình luận.",
      }),
    }),
  );
  ok("an unmatched @name still posts → 201", c9b.status === 201, `got ${c9b.status}`);
  ok(
    "an unmatched @name mentions nobody",
    ((await c9b.json()) as { mentions: string[] }).mentions.length === 0,
  );

  // (b) the loan_ticket anchor is refused, not merely hidden in the UI.
  const { rows: activeTicket } = await pg.query(
    `SELECT t.id, t.item_id, t.due_at, b.display_name AS borrower, h.display_name AS handler
       FROM loan_tickets t
       JOIN users b ON b.id = t.borrower_id
       LEFT JOIN users h ON h.id = t.handled_by
      WHERE t.state IN ('requested','approved','borrowed','overdue')
      ORDER BY t.requested_at DESC LIMIT 1`,
  );
  ok("a seeded active loan exists to prove the record against", activeTicket.length === 1);
  const ticket9 = activeTicket[0];
  const cLoan = await fetch(
    `${BASE}/api/comments`,
    asUser(lan, {
      method: "POST",
      headers: json,
      body: JSON.stringify({
        anchorType: "loan_ticket",
        anchorId: ticket9.id,
        body: "Phiếu mượn không còn là nơi thảo luận.",
      }),
    }),
  );
  ok("comment anchored to a loan ticket → 400", cLoan.status === 400, `got ${cLoan.status}`);
  ok(
    "the 400 uses the contract Error shape with code invalid_anchor",
    ((await cLoan.json()) as { code?: string }).code === "invalid_anchor",
  );
  ok(
    "listing comments on a loan ticket → 400",
    (
      await fetch(
        `${BASE}/api/comments?anchorType=loan_ticket&anchorId=${ticket9.id}`,
        asUser(lan),
      )
    ).status === 400,
  );
  const { rows: loanComments } = await pg.query(
    "SELECT count(*)::int AS n FROM comments WHERE anchor_type = 'loan_ticket'",
  );
  ok("no loan-ticket comment rows survive in the database", loanComments[0].n === 0);

  // (c) the record reads on the screen, for the member and the librarian.
  const dueText = new Date(ticket9.due_at).toLocaleDateString("vi-VN");
  for (const [who, cookie] of [
    ["thành viên", lan],
    ["quản trị", huong],
  ] as const) {
    const res = await fetch(`${BASE}/catalog/${ticket9.item_id}`, asUser(cookie));
    ok(`/catalog/:id → 200 (${who})`, res.status === 200, `got ${res.status}`);
    const html = await res.text();
    ok(`loan record names the borrower (${who})`, html.includes(ticket9.borrower));
    ok(`loan record names the approver (${who})`, html.includes(ticket9.handler));
    ok(`loan record prints the due date (${who})`, html.includes(dueText));
    ok(
      `loan record labels borrower and approver in Vietnamese (${who})`,
      html.includes("Người mượn") && html.includes("Duyệt bởi"),
    );
    ok(
      `Catalog Item Detail carries NO comment form (${who})`,
      !html.includes('aria-label="Thảo luận"') && !html.includes("loan_ticket"),
    );
    ok(`past loans appear as a history table (${who})`, html.includes("Các lượt mượn trước"));
  }

  console.log(`\nAll proofs passed (${passed} checks).`);
}

main()
  .then(() => pg.end())
  .catch(async (err) => {
    console.error(`\n${err.message}`);
    await pg.end();
    process.exit(1);
  });
