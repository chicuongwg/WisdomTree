// Acceptance proofs from docs/roadmap/demo-brief.md, run against a live app:
//   1. Store-first: uploaded file is in Library and downloadable WHILE
//      extraction_status = 'pending'; a stubbed 'unprocessable' outcome does
//      not remove it.
//   2. Space scoping: a non-member cannot see or download another space's
//      items (API 404), and cannot write into it (403) — not just hidden UI.
//   3. Loan: request → approve → borrow → return updates ticket + item; a
//      second request on an actively loaned item is rejected 409 in the
//      contract Error shape.
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

  console.log(`\nAll proofs passed (${passed} checks).`);
}

main()
  .then(() => pg.end())
  .catch(async (err) => {
    console.error(`\n${err.message}`);
    await pg.end();
    process.exit(1);
  });
