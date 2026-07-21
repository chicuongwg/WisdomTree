import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, ne, sql } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { ApiError, notFound, versionConflict } from "@/lib/errors";
import type { Principal } from "../auth/dev-auth";
import { authorize, scopedToSpaces } from "../auth/authorize";
import { emitOutbox, recordAudit } from "../audit/service";
import { users } from "../auth/schema";
import { sources, spaceMembers } from "../storage/schema";
import { treeNodes } from "../knowledge/schema";
import { kickDispatch } from "../notify/dispatcher";
import {
  achievements,
  calendarTokens,
  deadlineLinks,
  deadlines,
  tasks,
} from "./schema";

// Module: pm — deadlines with reminder offsets and links, the operational
// board (tasks), achievements, and the token-authenticated ICS feed.
// House rules as everywhere: authorize() first, one db.transaction with
// recordAudit + emitOutbox inside, optimistic locking on versioned rows.

export type DeadlineType = (typeof deadlines.$inferSelect)["type"];
export type LinkTarget = (typeof deadlineLinks.$inferSelect)["targetType"];
export type TaskState = (typeof tasks.$inferSelect)["state"];

const DEADLINE_TYPES: DeadlineType[] = ["conference", "funding", "report", "milestone"];
const LINK_TARGETS: LinkTarget[] = ["task", "source", "tree_node"];
const TASK_STATES: TaskState[] = ["todo", "doing", "done", "archived"];

// Postgres interval[] arrives as text like "7 days"; the API contract says
// "ISO-8601 durations" but we pass the Postgres text form through unchanged
// both ways ("7 days", "1 day") — flagged in the report.
type DeadlineRow = typeof deadlines.$inferSelect;

async function withLinks(rows: DeadlineRow[]) {
  if (rows.length === 0) return [];
  const links = await db
    .select()
    .from(deadlineLinks)
    .where(inArray(deadlineLinks.deadlineId, rows.map((d) => d.id)));
  return rows.map((d) => ({
    ...d,
    links: links
      .filter((l) => l.deadlineId === d.id)
      .map((l) => ({ targetType: l.targetType, targetId: l.targetId })),
  }));
}

/** Deadlines across the caller's project spaces (space-scoped list). */
export async function listDeadlines(actor: Principal, spaceId?: string) {
  // Space-filtered reads authorize against that space (404 out of scope);
  // the unfiltered list is scoped by the one query-layer helper, matching
  // listLibrary in storage/service.ts.
  if (spaceId) authorize(actor, "pm.deadline.read", { spaceId, kind: "read" });
  const visible = scopedToSpaces(actor);
  if (visible && visible.length === 0) return [];
  const rows = await db
    .select()
    .from(deadlines)
    .where(
      and(
        spaceId ? eq(deadlines.spaceId, spaceId) : undefined,
        visible ? inArray(deadlines.spaceId, visible) : undefined,
      ),
    )
    .orderBy(asc(deadlines.dueAt));
  return withLinks(rows);
}

export async function getDeadline(actor: Principal, deadlineId: string) {
  const [row] = await db.select().from(deadlines).where(eq(deadlines.id, deadlineId));
  if (!row) throw notFound();
  authorize(actor, "pm.deadline.read", { spaceId: row.spaceId, kind: "read" });
  const [withL] = await withLinks([row]);
  return withL;
}

type DeadlineInput = {
  spaceId?: string;
  title?: string;
  type?: string;
  dueAt?: string;
  reminderOffsets?: string[];
  links?: Array<{ targetType?: string; targetId?: string }>;
  expectedVersion?: number;
};

function parseLinks(links: DeadlineInput["links"]) {
  if (links === undefined) return undefined;
  if (!Array.isArray(links)) throw new ApiError(400, "invalid_links", "Danh sách liên kết không hợp lệ.");
  return links.map((l) => {
    if (!l?.targetId || !LINK_TARGETS.includes(l.targetType as LinkTarget)) {
      throw new ApiError(400, "invalid_links", "Liên kết phải có loại và mã hợp lệ.");
    }
    return { targetType: l.targetType as LinkTarget, targetId: l.targetId };
  });
}

function parseOffsets(offsets: string[] | undefined): string[] | undefined {
  if (offsets === undefined) return undefined;
  if (!Array.isArray(offsets) || offsets.some((o) => typeof o !== "string" || !o.trim())) {
    throw new ApiError(400, "invalid_reminder_offsets", "Mốc nhắc hạn không hợp lệ.");
  }
  return offsets;
}

/**
 * A deadline may only link what its own space is allowed to see. Of the three
 * link targets only `source` is space-scoped — the board (pm.board.read) and
 * the knowledge tree (knowledge.node.read) are deliberately global — so a
 * source is the one that leaks: without this check a member of space A can
 * link space B's source id and read its title back off the deadline screen.
 */
async function assertLinksVisibleFrom(
  links: Array<{ targetType: LinkTarget; targetId: string }>,
  spaceId: string,
): Promise<void> {
  const wanted = [...new Set(links.filter((l) => l.targetType === "source").map((l) => l.targetId))];
  if (wanted.length === 0) return;
  const found = await db
    .select({ id: sources.id })
    .from(sources)
    .where(and(inArray(sources.id, wanted), eq(sources.spaceId, spaceId)));
  if (found.length !== wanted.length) {
    throw new ApiError(
      400,
      "invalid_links",
      "Chỉ được liên kết tư liệu thuộc cùng kho dự án với hạn chót.",
    );
  }
}

async function replaceLinks(
  tx: Tx,
  deadlineId: string,
  links: Array<{ targetType: LinkTarget; targetId: string }>,
) {
  await tx.delete(deadlineLinks).where(eq(deadlineLinks.deadlineId, deadlineId));
  for (const l of links) {
    await tx.insert(deadlineLinks).values({ deadlineId, ...l });
  }
}

/**
 * Resolve a deadline's links into things worth showing. Lives here rather than
 * in the page because it carries the space rule: `source` is the one
 * space-scoped target, so it is filtered to the deadline's own space. Tasks and
 * tree nodes are global by design (pm.board.read / knowledge.node.read carry no
 * space scope) and need no predicate.
 *
 * Writes are validated by assertLinksVisibleFrom; this is the matching read.
 */
export async function getDeadlineLinks(actor: Principal, deadlineId: string) {
  const deadline = await getDeadline(actor, deadlineId);
  const idsOf = (t: LinkTarget) =>
    deadline.links.filter((l) => l.targetType === t).map((l) => l.targetId);
  const [taskIds, sourceIds, nodeIds] = [idsOf("task"), idsOf("source"), idsOf("tree_node")];

  const [linkedTasks, linkedSources, linkedNodes] = await Promise.all([
    taskIds.length ? db.select().from(tasks).where(inArray(tasks.id, taskIds)) : [],
    sourceIds.length
      ? db
          .select()
          .from(sources)
          .where(and(inArray(sources.id, sourceIds), eq(sources.spaceId, deadline.spaceId)))
      : [],
    nodeIds.length ? db.select().from(treeNodes).where(inArray(treeNodes.id, nodeIds)) : [],
  ]);
  return { deadline, linkedTasks, linkedSources, linkedNodes };
}

export async function createDeadline(actor: Principal, input: DeadlineInput) {
  if (!input.spaceId || !input.title?.trim() || !input.dueAt) {
    throw new ApiError(400, "invalid_deadline", "Vui lòng nhập kho dự án, tiêu đề và hạn chót.");
  }
  if (!DEADLINE_TYPES.includes(input.type as DeadlineType)) {
    throw new ApiError(400, "invalid_deadline_type", "Loại hạn chót không hợp lệ.");
  }
  const dueAt = new Date(input.dueAt);
  if (Number.isNaN(dueAt.getTime())) {
    throw new ApiError(400, "invalid_due_date", "Ngày hạn chót không hợp lệ.");
  }
  // Project members = space members; a non-member write is denied 403.
  authorize(actor, "pm.deadline.edit", { spaceId: input.spaceId, kind: "write" });
  const links = parseLinks(input.links) ?? [];
  const offsets = parseOffsets(input.reminderOffsets);
  await assertLinksVisibleFrom(links, input.spaceId);

  const created = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(deadlines)
      .values({
        spaceId: input.spaceId!,
        title: input.title!.trim(),
        type: input.type as DeadlineType,
        dueAt,
        ...(offsets ? { reminderOffsets: offsets } : {}),
        createdBy: actor.userId,
      })
      .returning();
    await replaceLinks(tx, row.id, links);
    await recordAudit(tx, actor, {
      accountability: "member",
      action: "deadline.create",
      targetType: "deadline",
      targetId: row.id,
      details: { spaceId: row.spaceId, dueAt: row.dueAt.toISOString() },
    });
    await emitOutbox(tx, "deadline.created", {
      deadlineId: row.id,
      spaceId: row.spaceId,
      title: row.title,
      dueAt: row.dueAt.toISOString(),
    });
    return row;
  });

  kickDispatch();
  const [withL] = await withLinks([created]);
  return withL;
}

export async function updateDeadline(actor: Principal, deadlineId: string, input: DeadlineInput) {
  const [existing] = await db.select().from(deadlines).where(eq(deadlines.id, deadlineId));
  if (!existing) throw notFound();
  authorize(actor, "pm.deadline.edit", { spaceId: existing.spaceId, kind: "write" });
  if (input.spaceId && input.spaceId !== existing.spaceId) {
    // Moving a deadline requires membership in the target space too.
    authorize(actor, "pm.deadline.edit", { spaceId: input.spaceId, kind: "write" });
  }
  if (input.type !== undefined && !DEADLINE_TYPES.includes(input.type as DeadlineType)) {
    throw new ApiError(400, "invalid_deadline_type", "Loại hạn chót không hợp lệ.");
  }
  const dueAt = input.dueAt !== undefined ? new Date(input.dueAt) : undefined;
  if (dueAt && Number.isNaN(dueAt.getTime())) {
    throw new ApiError(400, "invalid_due_date", "Ngày hạn chót không hợp lệ.");
  }
  const expectedVersion = input.expectedVersion;
  if (typeof expectedVersion !== "number") throw versionConflict();
  const links = parseLinks(input.links);
  const offsets = parseOffsets(input.reminderOffsets);
  // Against the space the deadline will end up in, not the one it left.
  if (links) await assertLinksVisibleFrom(links, input.spaceId ?? existing.spaceId);

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(deadlines)
      .set({
        ...(input.spaceId ? { spaceId: input.spaceId } : {}),
        ...(input.title?.trim() ? { title: input.title.trim() } : {}),
        ...(input.type ? { type: input.type as DeadlineType } : {}),
        ...(dueAt ? { dueAt } : {}),
        ...(offsets ? { reminderOffsets: offsets } : {}),
        updatedAt: new Date(),
        version: existing.version + 1,
      })
      .where(and(eq(deadlines.id, deadlineId), eq(deadlines.version, expectedVersion)))
      .returning();
    if (!row) throw versionConflict();
    if (links) await replaceLinks(tx, deadlineId, links);
    await recordAudit(tx, actor, {
      accountability: "member",
      action: "deadline.update",
      targetType: "deadline",
      targetId: deadlineId,
      details: { spaceId: row.spaceId, dueAt: row.dueAt.toISOString() },
    });
    return row;
  });

  kickDispatch();
  const [withL] = await withLinks([updated]);
  return withL;
}

// ---------------------------------------------------------------------------
// Board: tasks (Editor: owned-or-assigned updates; Admin/Op: all)
// ---------------------------------------------------------------------------

export async function listBoard(actor: Principal) {
  authorize(actor, "pm.board.read", { kind: "read" });
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      state: tasks.state,
      assignedTo: tasks.assignedTo,
      assigneeName: users.displayName, // additive over the contract Task shape
      dueAt: tasks.dueAt,
      startAt: tasks.startAt,
      targetType: tasks.targetType,
      targetId: tasks.targetId,
      createdBy: tasks.createdBy,
      updatedAt: tasks.updatedAt,
      version: tasks.version,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assignedTo, users.id))
    .where(ne(tasks.state, "archived"))
    .orderBy(desc(tasks.updatedAt));
}

type TaskInput = {
  title?: string;
  state?: string;
  assigneeId?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  dueAt?: string | null;
  startAt?: string | null;
  notes?: string | null;
  expectedVersion?: number;
};

/** ISO date-time or null; anything else is a 400, never a silent Invalid Date. */
function parseMoment(raw: string | null | undefined, code: string, message: string): Date | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new ApiError(400, code, message);
  return d;
}

const parseDueAt = (raw: string | null | undefined) =>
  parseMoment(raw, "invalid_due_at", "Thời hạn không hợp lệ.");
const parseStartAt = (raw: string | null | undefined) =>
  parseMoment(raw, "invalid_start_at", "Ngày bắt đầu không hợp lệ.");

/**
 * One task with everything its own page shows. Gated on board READ, not on
 * manage: every approved member can already see the whole board, so a detail
 * page they cannot open would only hide what the card beside it announces.
 */
export async function getTask(actor: Principal, taskId: string) {
  authorize(actor, "pm.board.read", { kind: "read" });
  const [row] = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      state: tasks.state,
      assignedTo: tasks.assignedTo,
      assigneeName: users.displayName,
      dueAt: tasks.dueAt,
      startAt: tasks.startAt,
      notes: tasks.notes,
      targetType: tasks.targetType,
      targetId: tasks.targetId,
      createdBy: tasks.createdBy,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      version: tasks.version,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assignedTo, users.id))
    .where(eq(tasks.id, taskId));
  if (!row) throw notFound();
  return row;
}

/**
 * Take an unassigned task from the shared pool — the guild-board move (owner
 * decision 2026-07-21). Gated on its own key rather than manage, because the
 * claimer by definition does not own the task yet; the WHERE clause is the
 * real guard: only a still-unassigned, still-open task can be claimed, so two
 * simultaneous claims resolve to one winner and one 409.
 */
export async function claimTask(actor: Principal, taskId: string) {
  authorize(actor, "pm.task.claim", { kind: "write" });
  const claimed = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(tasks)
      .set({ assignedTo: actor.userId, updatedAt: new Date() })
      .where(and(eq(tasks.id, taskId), isNull(tasks.assignedTo), ne(tasks.state, "archived")))
      .returning();
    if (!row) return null;
    await recordAudit(tx, actor, {
      accountability: "member",
      action: "task.claim",
      targetType: "task",
      targetId: taskId,
      // The title, so the log names the work rather than an opaque id.
      details: { title: row.title },
    });
    return row;
  });
  if (!claimed) {
    const [exists] = await db.select({ id: tasks.id }).from(tasks).where(eq(tasks.id, taskId));
    if (!exists) throw notFound();
    throw new ApiError(409, "already_claimed", "Việc này đã có người nhận.");
  }
  return claimed;
}

/**
 * Archive: off the board, still in the record. For finished lanes that have
 * served their purpose and for tasks created by mistake — the two cases the
 * owner named. Owned-or-assigned (creator or holder), admin by role.
 */
export async function archiveTask(actor: Principal, taskId: string) {
  const [target] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!target) throw notFound();
  authorize(actor, "pm.task.archive", {
    ownerIds: [target.createdBy, target.assignedTo],
    kind: "write",
  });
  if (target.state === "archived") return; // already true
  await db.transaction(async (tx) => {
    await tx
      .update(tasks)
      .set({ state: "archived", updatedAt: new Date(), version: target.version + 1 })
      .where(eq(tasks.id, taskId));
    await recordAudit(tx, actor, {
      accountability: "member",
      action: "task.archive",
      targetType: "task",
      targetId: taskId,
      details: { title: target.title, from: target.state },
    });
  });
}

/**
 * One month (or week) of scheduled work: tasks by due_at plus the project
 * deadlines already living in this module — the calendar draws both, because
 * "what is this team carrying" is one question, not two screens.
 */
export async function listSchedule(actor: Principal, range: { from: Date; to: Date }) {
  authorize(actor, "pm.board.read", { kind: "read" });
  const [taskRows, deadlineRows] = await Promise.all([
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        state: tasks.state,
        assigneeName: users.displayName,
        dueAt: tasks.dueAt,
        startAt: tasks.startAt,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedTo, users.id))
      // A task occupies the span [start_at, due_at], and a span belongs to a
      // week if it OVERLAPS it — a fortnight of work must appear on both weeks
      // it crosses, not only the one its deadline lands in. With no start the
      // span collapses to the deadline itself, which is the old behaviour.
      .where(
        and(
          ne(tasks.state, "archived"),
          sql`${tasks.dueAt} >= ${range.from} AND COALESCE(${tasks.startAt}, ${tasks.dueAt}) < ${range.to}`,
        ),
      )
      .orderBy(asc(tasks.dueAt)),
    db
      .select({ id: deadlines.id, title: deadlines.title, dueAt: deadlines.dueAt, type: deadlines.type })
      .from(deadlines)
      .where(sql`${deadlines.dueAt} >= ${range.from} AND ${deadlines.dueAt} < ${range.to}`)
      .orderBy(asc(deadlines.dueAt)),
  ]);
  return { tasks: taskRows, deadlines: deadlineRows };
}

export async function createTask(actor: Principal, input: TaskInput) {
  // Creation is board management of one's own task: the creator is the owner.
  authorize(actor, "pm.board.manage", { ownerIds: [actor.userId], kind: "write" });
  if (!input.title?.trim()) {
    throw new ApiError(400, "invalid_task", "Vui lòng nhập tiêu đề công việc.");
  }
  const state = input.state ?? "todo";
  if (!TASK_STATES.includes(state as TaskState)) {
    throw new ApiError(400, "invalid_task_state", "Trạng thái công việc không hợp lệ.");
  }
  const created = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(tasks)
      .values({
        title: input.title!.trim(),
        state: state as TaskState,
        assignedTo: input.assigneeId ?? null,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        dueAt: parseDueAt(input.dueAt),
        startAt: parseStartAt(input.startAt),
        notes: input.notes?.trim() || null,
        createdBy: actor.userId,
      })
      .returning();
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "task.create",
      targetType: "task",
      targetId: row.id,
      details: { title: row.title, state: row.state, assignedTo: row.assignedTo },
    });
    return row;
  });
  return created;
}

export async function updateTask(actor: Principal, taskId: string, input: TaskInput) {
  const [existing] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!existing) throw notFound();
  // Editor: owned or assigned; Admin/Op: global (authorize role bypass).
  authorize(actor, "pm.board.manage", {
    ownerIds: [existing.createdBy, existing.assignedTo],
    kind: "write",
  });
  if (input.state !== undefined && !TASK_STATES.includes(input.state as TaskState)) {
    throw new ApiError(400, "invalid_task_state", "Trạng thái công việc không hợp lệ.");
  }
  const expectedVersion = input.expectedVersion;
  if (typeof expectedVersion !== "number") throw versionConflict();

  const updated = await db.transaction(async (tx) => {
    const [row] = await tx
      .update(tasks)
      .set({
        ...(input.title?.trim() ? { title: input.title.trim() } : {}),
        ...(input.state ? { state: input.state as TaskState } : {}),
        ...(input.assigneeId !== undefined ? { assignedTo: input.assigneeId } : {}),
        // Absent key = leave the schedule alone; explicit null = unschedule.
        ...(input.dueAt !== undefined ? { dueAt: parseDueAt(input.dueAt) } : {}),
        ...(input.startAt !== undefined ? { startAt: parseStartAt(input.startAt) } : {}),
        // Same rule for the body: absent leaves it, empty clears it.
        ...(input.notes !== undefined ? { notes: input.notes?.trim() || null } : {}),
        updatedAt: new Date(),
        version: existing.version + 1,
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.version, expectedVersion)))
      .returning();
    if (!row) throw versionConflict();
    // What actually changed, not what the columns happen to hold. This used to
    // record {from: state, to: state} on every edit, so renaming a task or
    // writing a note produced the line {"from":"todo","to":"todo"} — an entry
    // that proves something happened and refuses to say what. An audit log
    // that cannot answer "what changed" is a log nobody can investigate with.
    const changed: Record<string, unknown> = { title: row.title };
    if (row.state !== existing.state) changed.state = { from: existing.state, to: row.state };
    if (row.assignedTo !== existing.assignedTo) {
      changed.assignedTo = { from: existing.assignedTo, to: row.assignedTo };
    }
    if (row.dueAt?.getTime() !== existing.dueAt?.getTime()) changed.dueAt = row.dueAt;
    if (row.startAt?.getTime() !== existing.startAt?.getTime()) changed.startAt = row.startAt;
    // The note's TEXT never enters the log: an audit trail is a record of who
    // did what, and copying the body into it would quietly build a second,
    // unreadable, undeletable copy of every note in the system.
    if (row.notes !== existing.notes) changed.notes = "edited";
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "task.update",
      targetType: "task",
      targetId: taskId,
      details: changed,
    });
    return row;
  });
  return updated;
}

export async function logAchievement(
  actor: Principal,
  input: { title?: string; branchId?: string; achievedAt?: string },
) {
  authorize(actor, "pm.board.manage", { ownerIds: [actor.userId], kind: "write" });
  if (!input.title?.trim()) {
    throw new ApiError(400, "invalid_achievement", "Vui lòng nhập tiêu đề thành quả.");
  }
  const achievedAt = input.achievedAt ? new Date(input.achievedAt) : new Date();
  if (Number.isNaN(achievedAt.getTime())) {
    throw new ApiError(400, "invalid_achievement_date", "Ngày ghi nhận không hợp lệ.");
  }
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(achievements)
      .values({
        title: input.title!.trim(),
        branchId: input.branchId ?? null,
        loggedBy: actor.userId,
        achievedAt,
      })
      .returning();
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "achievement.log",
      targetType: "achievement",
      targetId: row.id,
      details: { branchId: row.branchId },
    });
    return row;
  });
}

// ---------------------------------------------------------------------------
// ICS feed — token-authenticated, no session (calendar_tokens)
// ---------------------------------------------------------------------------

/** The caller's active subscribe token (page display: "Lịch của tôi"). */
export async function myCalendarToken(actor: Principal) {
  const [row] = await db
    .select()
    .from(calendarTokens)
    .where(and(eq(calendarTokens.userId, actor.userId), isNull(calendarTokens.revokedAt)));
  return row ?? null;
}

/**
 * Cut the old subscribe link and mint a fresh one, atomically: the token is
 * a bearer credential (anyone holding the URL reads the feed), so "my link
 * leaked" must be one act that both revokes and replaces — a revoke without
 * a replacement would strand the member with no feed at all.
 */
export async function regenerateCalendarToken(actor: Principal) {
  const token = randomBytes(24).toString("base64url"); // same entropy as the seed's tokens
  await db.transaction(async (tx) => {
    await tx
      .update(calendarTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(calendarTokens.userId, actor.userId), isNull(calendarTokens.revokedAt)));
    await tx.insert(calendarTokens).values({ token, userId: actor.userId });
    await recordAudit(tx, actor, {
      accountability: "member",
      action: "calendar.token.regenerate",
      targetType: "user",
      targetId: actor.userId,
      // Never the token itself: the audit log must not become a place the
      // credential can be read back from.
      details: {},
    });
  });
  return token;
}

const icsEscape = (s: string) =>
  s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

const icsDate = (d: Date) =>
  d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

/**
 * Resolve a calendar token (404 when unknown or revoked) and render the ICS
 * body of deadlines visible to that subscriber's spaces — no session, no
 * Google credentials (database-schema.md § calendar_tokens).
 */
export async function renderCalendarFeed(token: string): Promise<string> {
  const [row] = await db.select().from(calendarTokens).where(eq(calendarTokens.token, token));
  if (!row || row.revokedAt) throw notFound();
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, row.userId), isNull(users.disabledAt)));
  if (!user) throw notFound();

  let visible: string[] | null;
  if (row.spaceId) {
    visible = [row.spaceId]; // optional per-project narrowing
  } else if (user.role === "admin_op") {
    visible = null; // global scope
  } else {
    visible = await memberSpaceIds(row.userId);
  }

  const rows =
    visible && visible.length === 0
      ? []
      : await db
          .select()
          .from(deadlines)
          .where(visible ? inArray(deadlines.spaceId, visible) : undefined)
          .orderBy(asc(deadlines.dueAt));

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//WisdomTree//PM//VI",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${icsEscape(`WisdomTree — Hạn chót (${user.displayName})`)}`,
  ];
  for (const d of rows) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${d.id}@wisdomtree`,
      `DTSTAMP:${icsDate(d.updatedAt)}`,
      `DTSTART:${icsDate(d.dueAt)}`,
      `SUMMARY:${icsEscape(d.title)}`,
      `CATEGORIES:${icsEscape(d.type)}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

async function memberSpaceIds(userId: string): Promise<string[]> {
  const memberships = await db
    .select({ spaceId: spaceMembers.spaceId })
    .from(spaceMembers)
    .where(eq(spaceMembers.userId, userId));
  return memberships.map((m) => m.spaceId);
}
