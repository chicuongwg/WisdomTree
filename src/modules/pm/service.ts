import { and, asc, desc, eq, inArray, isNull, ne } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { ApiError, notFound, versionConflict } from "@/lib/errors";
import type { Principal } from "../auth/dev-auth";
import { authorize, scopedToSpaces } from "../auth/authorize";
import { emitOutbox, recordAudit } from "../audit/service";
import { users } from "../auth/schema";
import { spaceMembers } from "../storage/schema";
import { dispatchOutbox } from "../notify/dispatcher";
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

  void dispatchOutbox();
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

  void dispatchOutbox();
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
  expectedVersion?: number;
};

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
        createdBy: actor.userId,
      })
      .returning();
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "task.create",
      targetType: "task",
      targetId: row.id,
      details: { state: row.state, assignedTo: row.assignedTo },
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
        updatedAt: new Date(),
        version: existing.version + 1,
      })
      .where(and(eq(tasks.id, taskId), eq(tasks.version, expectedVersion)))
      .returning();
    if (!row) throw versionConflict();
    await recordAudit(tx, actor, {
      accountability: "operator",
      action: "task.update",
      targetType: "task",
      targetId: taskId,
      details: { from: existing.state, to: row.state },
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
