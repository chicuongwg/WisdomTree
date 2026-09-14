import { APP_TZ, appDayNumber } from "../time";

// State labels (governance: docs/vocabulary-vi.md). Entries marked NEW are
// pending humanities review.
export const extractionLabel: Record<string, string> = {
  pending: "Đang chờ xử lý", // NEW
  processed: "Đã xử lý", // NEW
  unprocessable: "Không xử lý được",
};

export const loanStateLabel: Record<string, string> = {
  requested: "Chờ duyệt", // NEW
  approved: "Đã duyệt", // NEW
  declined: "Từ chối", // NEW
  borrowed: "Đang mượn", // NEW
  overdue: "Quá hạn", // NEW
  returned: "Đã trả", // NEW
};

/**
 * The same four states in two words each, for the catalogue table's Trạng thái
 * column — a column read by scanning down it, where a three-word cell wraps at
 * the widths a phone gives it and stops being scannable. The long forms below
 * stay as they are: they are the vocabulary doc's wording and they are what a
 * detail page, where there is room for a sentence, should say. NEW.
 */
export const itemStatusShort: Record<string, string> = {
  available: "Trên kệ", // NEW
  borrowed: "Đã mượn", // NEW
  lost: "Thất lạc", // NEW
  repair: "Đang sửa", // NEW
};

export const itemStatusLabel: Record<string, string> = {
  available: "Sẵn sàng", // NEW
  borrowed: "Đang được mượn", // NEW
  lost: "Thất lạc", // NEW
  repair: "Đang sửa chữa", // NEW
};

// Verification labels come verbatim from vocabulary-vi.md § Term Map.
export const verificationLabel: Record<string, string> = {
  no_source: "Chưa có nguồn dẫn",
  unverified: "Chưa thẩm định",
  verified: "Đã thẩm định",
  archived: "Đã lưu trữ",
};

export const linkTypeLabel: Record<string, string> = {
  related: "Liên quan", // NEW
  supports: "Bổ trợ", // NEW
  contrasts: "Đối chiếu", // NEW
  part_of: "Thuộc về", // NEW
};

export const deadlineTypeLabel: Record<string, string> = {
  conference: "Hội thảo", // NEW
  funding: "Tài trợ", // NEW
  report: "Báo cáo", // NEW
  milestone: "Cột mốc", // NEW
};

export const taskStateLabel: Record<string, string> = {
  todo: "Cần làm", // NEW
  doing: "Đang làm", // NEW
  done: "Hoàn thành", // NEW
  archived: "Đã lưu trữ",
};

/** Weekday column heads, Monday first — the week a Vietnamese calendar shows. */
export const weekdayShort = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]; // NEW

// One user-facing sentence per notification event type (matrix events).
export const notificationEventLabel: Record<string, string> = {
  "source.processing_failed": "Tư liệu bạn gửi không xử lý được (tệp gốc vẫn được lưu)", // NEW
  "tree.node.published": "Tư liệu bạn gửi đã được xuất bản lên cây tri thức", // NEW
  "loan.requested": "Có yêu cầu mượn sách mới", // NEW
  "loan.approved": "Yêu cầu mượn sách đã được duyệt", // NEW
  "loan.borrowed": "Bạn đã nhận sách; nhớ hạn trả", // NEW
  "loan.returned": "Phiếu mượn đã ghi nhận trả sách", // NEW
  "loan.declined": "Yêu cầu mượn sách bị từ chối", // NEW
  "loan.overdue": "Phiếu mượn đã quá hạn trả", // NEW
  "deadline.approaching": "Sắp đến hạn chót của dự án", // NEW
  "comment.created": "Bạn được nhắc đến trong một thảo luận", // NEW
};

export const roleLabel: Record<string, string> = {
  user: "Thành viên", // NEW
  editor: "Biên tập viên", // NEW
  admin_op: "Quản trị/Vận hành", // NEW
};

// ---------------------------------------------------------------------------
// Guarded lookups — the UI never shows a raw internal term (ui-principles.md).
//
// `map[key] ?? key` was the old fallback and it LEAKS: a key the map has not
// caught up with (a new event type, a new enum member) renders as
// "source.ready_for_review" in a Vietnamese screen. The guarded accessors
// below make a gap loud in development (console.warn) and neutral in
// production (a Vietnamese fallback), never technical.
// ---------------------------------------------------------------------------

/** Neutral Vietnamese stand-ins, used only when a map has no entry. */
const FALLBACK = {
  event: "Cập nhật mới", // NEW
  state: "Không rõ trạng thái", // NEW
  kind: "Không rõ loại", // NEW
  role: "Chưa rõ vai trò", // NEW
  channel: "Kênh khác", // NEW
} as const;

/** The one lookup: warn loudly in dev, degrade to Vietnamese in production. */
function guarded(
  map: Record<string, string>,
  mapName: string,
  key: string | null | undefined,
  fallback: string,
): string {
  if (key != null) {
    const label = map[key];
    if (label !== undefined) return label;
  }
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[vi] ${mapName} has no Vietnamese label for ${JSON.stringify(key)} — showing "${fallback}". Add the entry to src/lib/vi.ts.`,
    );
  }
  return fallback;
}

/** Notification event → one user-facing Vietnamese sentence. */
export const eventLabel = (eventType: string | null | undefined): string =>
  guarded(notificationEventLabel, "notificationEventLabel", eventType, FALLBACK.event);

export const extractionStateLabel = (v: string | null | undefined): string =>
  guarded(extractionLabel, "extractionLabel", v, FALLBACK.state);
export const loanLabel = (v: string | null | undefined): string =>
  guarded(loanStateLabel, "loanStateLabel", v, FALLBACK.state);
export const itemLabel = (v: string | null | undefined): string =>
  guarded(itemStatusLabel, "itemStatusLabel", v, FALLBACK.state);
/** The two-word form, for the catalogue table. NEW. */
export const itemLabelShort = (v: string | null | undefined): string =>
  guarded(itemStatusShort, "itemStatusShort", v, FALLBACK.state);
export const verificationStateLabel = (v: string | null | undefined): string =>
  guarded(verificationLabel, "verificationLabel", v, FALLBACK.state);
export const taskLabel = (v: string | null | undefined): string =>
  guarded(taskStateLabel, "taskStateLabel", v, FALLBACK.state);
export const deadlineKindLabel = (v: string | null | undefined): string =>
  guarded(deadlineTypeLabel, "deadlineTypeLabel", v, FALLBACK.kind);
export const nodeLinkTypeLabel = (v: string | null | undefined): string =>
  guarded(linkTypeLabel, "linkTypeLabel", v, FALLBACK.kind);
export const userRoleLabel = (v: string | null | undefined): string =>
  guarded(roleLabel, "roleLabel", v, FALLBACK.role);

// ---------------------------------------------------------------------------
// NEW — the audit trail in words.
//
// Every module records a dotted key (`task.update`, `loan.approve`) because
// that is what the guards and the docs call the event. A reader of Nhật ký hệ
// thống is a humanities researcher, not an operator, so the dotted key never
// reaches the screen: this is where it becomes a Vietnamese phrase. The keys
// below are the complete set recorded under src/modules as of 2026-07-21;
// anything added later falls through to `FALLBACK.action`, which is neutral
// Vietnamese and warns in development so the gap gets closed.
// ---------------------------------------------------------------------------

/**
 * tree_node_versions.change_summary → Vietnamese. The BE stores stable
 * English codes (english-internals convention); legacy rows hold Vietnamese
 * sentences and render verbatim through the fallback.
 */
const changeSummaryMap: Record<string, string> = {
  manual_create: "Tạo trang thủ công",
  content_update: "Cập nhật nội dung",
  proposal_approved: "Đề xuất được duyệt",
  published_from_personal: "Xuất bản từ trang cá nhân",
  evolved_from_extraction: "Chuyển từ bản trích xuất",
};
export const changeSummaryLabel = (v: string | null | undefined): string | null =>
  v == null ? null : (changeSummaryMap[v] ?? v);

/** Audit action key → what a person did, said as a phrase. */
export const auditActionLabel: Record<string, string> = {
  // auth
  "user.invite": "Mời thành viên", // NEW
  "user.role.change": "Đổi vai trò thành viên", // NEW
  "user.oidc.bind": "Liên kết tài khoản đăng nhập", // NEW
  "user.profile.update": "Sửa hồ sơ cá nhân", // NEW
  "user.avatar.set": "Đổi ảnh đại diện", // NEW
  "calendar.token.regenerate": "Tạo lại đường dẫn lịch", // NEW
  "notification.preferences.update": "Đổi cài đặt nhận thông báo", // NEW
  // storage — sources, spaces, folders
  "source.upload": "Gửi tư liệu mới", // NEW
  "source.version.add": "Thêm bản mới cho tư liệu", // NEW
  "source.rename": "Đổi tên tư liệu", // NEW
  "source.move": "Chuyển tư liệu sang thư mục khác", // NEW
  "source.withdraw": "Rút tư liệu khỏi kho", // NEW
  "source.restore": "Khôi phục tư liệu", // NEW
  "space.create": "Tạo kho", // NEW
  "space.member.add": "Thêm thành viên vào kho", // NEW
  "space.member.remove": "Bỏ thành viên khỏi kho", // NEW
  "folder.create": "Tạo thư mục", // NEW
  "folder.rename": "Đổi tên thư mục", // NEW
  "folder.delete": "Xoá thư mục", // NEW
  // ocr candidates + change proposals
  "source.extraction.request": "Yêu cầu trích xuất nội dung", // NEW
  "candidate.evolve": "Chuyển bản trích xuất thành trang", // NEW
  "candidate.reject": "Bỏ bản trích xuất", // NEW
  "node.change.propose": "Đề xuất sửa trang chung",
  "node.change.approve": "Duyệt đề xuất sửa trang chung",
  "node.change.rejected": "Từ chối đề xuất sửa trang chung",
  "node.change.changes_requested": "Yêu cầu sửa lại đề xuất",
  // knowledge
  "branch.create": "Tạo nhánh tri thức", // NEW
  "branch.update": "Sửa nhánh tri thức", // NEW
  "branch.archive": "Lưu trữ nhánh tri thức", // NEW
  "node.create": "Tạo trang tri thức", // NEW
  "node.update": "Sửa trang tri thức", // NEW
  "node.archive": "Lưu trữ trang tri thức", // NEW
  "node.merge": "Gộp trang tri thức", // NEW
  "node.verification.change": "Đổi mức thẩm định của trang", // NEW
  "node.verification.downgrade": "Hạ mức thẩm định của trang", // NEW
  "node.publication.submit": "Đề cử trang cá nhân lên cây chung",
  "node.publication.approve": "Duyệt đề cử lên cây chung",
  "node.publication.rejected": "Từ chối đề cử lên cây chung",
  "node.publication.changes_requested": "Yêu cầu sửa đề cử lên cây chung",
  // pm
  "task.create": "Tạo công việc", // NEW
  "task.update": "Sửa công việc", // NEW
  "task.claim": "Nhận công việc", // NEW
  "task.archive": "Lưu trữ công việc", // NEW
  "deadline.create": "Tạo hạn chót", // NEW
  "deadline.update": "Sửa hạn chót", // NEW
  "achievement.log": "Ghi nhận thành quả", // NEW
  // catalog + circulation
  "catalog.item.create": "Thêm đầu sách", // NEW
  "catalog.item.update": "Sửa đầu sách", // NEW
  "loan.request": "Yêu cầu mượn sách", // NEW
  "loan.approve": "Duyệt phiếu mượn", // NEW
  "loan.decline": "Từ chối phiếu mượn", // NEW
  "loan.borrow": "Giao sách cho người mượn", // NEW
  "loan.return": "Ghi nhận trả sách", // NEW
  // notify + export
  "comment.create": "Viết thảo luận", // NEW
  "export.trigger": "Chạy xuất dữ liệu", // NEW
};

/** Audit target type → the kind of thing the row is about. */
export const auditTargetLabel: Record<string, string> = {
  user: "Thành viên", // NEW
  space: "Kho", // NEW
  folder: "Thư mục", // NEW
  source: "Tư liệu", // NEW
  source_version: "Bản tư liệu", // NEW
  extraction_candidate: "Bản trích xuất", // NEW
  node_change_proposal: "Đề xuất sửa trang", // NEW
  tree_node: "Trang tri thức", // NEW
  node_publication_proposal: "Đề cử trang cá nhân",
  branch: "Nhánh tri thức", // NEW
  task: "Công việc", // NEW
  deadline: "Hạn chót", // NEW
  achievement: "Thành quả", // NEW
  comment: "Thảo luận", // NEW
  source_physical: "Đầu sách", // NEW
  loan_ticket: "Phiếu mượn", // NEW
  export: "Lượt xuất dữ liệu", // NEW
};

/** A key inside an audit row's details → the name of that fact in Vietnamese. */
export const auditFieldLabel: Record<string, string> = {
  title: "Tiêu đề", // NEW
  name: "Tên", // NEW
  filename: "Tên tệp", // NEW
  email: "Địa chỉ email", // NEW
  role: "Vai trò", // NEW
  state: "Trạng thái", // NEW
  assignedTo: "Người phụ trách", // NEW
  assigneeId: "Người được giao", // NEW
  userId: "Thành viên", // NEW
  mentions: "Người được nhắc đến", // NEW
  dueAt: "Hạn hoàn thành", // NEW
  startAt: "Bắt đầu làm", // NEW
  notes: "Ghi chú", // NEW
  copies: "Số bản", // NEW
  itemCode: "Mã đầu sách", // NEW
  itemId: "Đầu sách", // NEW
  scope: "Phạm vi", // NEW
  seq: "Lần hiệu đính thứ", // NEW
  version: "Phiên bản", // NEW
  verification: "Mức thẩm định", // NEW
  contentChanged: "Nội dung có thay đổi", // NEW
  excerptChunkIds: "Đoạn trích dẫn", // NEW
  anchorType: "Gắn với", // NEW
  anchorId: "Đối tượng được gắn", // NEW
  prefs: "Cài đặt nhận thông báo", // NEW
  branchId: "Nhánh tri thức", // NEW
  canonicalNodeId: "Trang được gộp vào", // NEW
  spaceId: "Kho", // NEW
  parentId: "Thư mục cha", // NEW
  sourceId: "Tư liệu", // NEW
  sourceVersionId: "Bản tư liệu", // NEW
  versionId: "Bản tư liệu", // NEW
  promotionId: "Lượt xuất bản", // NEW
  from: "Trước", // NEW
  to: "Sau", // NEW
};

/**
 * Enum values that appear INSIDE details, in one table — a details value is a
 * bare string with no column to say which enum it came from, so the lookup is
 * by value. The words are copied from the state maps above; where two enums
 * share a value (`archived`, `rejected`) they already share a Vietnamese word,
 * so the merge loses nothing.
 */
export const auditValueLabel: Record<string, string> = {
  ...taskStateLabel,
  ...loanStateLabel,
  ...verificationLabel,
  ...roleLabel,
  ...auditTargetLabel, // anchorType and targetType-shaped values
  edited: "đã sửa", // NEW — task.update records only that the note changed
  full_tree: "toàn bộ cây tri thức", // NEW — export scope
};

const AUDIT_FALLBACK = {
  action: "Thao tác khác", // NEW
  target: "Đối tượng khác", // NEW
  field: "Thông tin khác", // NEW
} as const;

export const actionLabel = (v: string | null | undefined): string =>
  guarded(auditActionLabel, "auditActionLabel", v, AUDIT_FALLBACK.action);
export const targetKindLabel = (v: string | null | undefined): string =>
  guarded(auditTargetLabel, "auditTargetLabel", v, AUDIT_FALLBACK.target);
export const detailFieldLabel = (v: string | null | undefined): string =>
  guarded(auditFieldLabel, "auditFieldLabel", v, AUDIT_FALLBACK.field);

/**
 * A reminder offset, in words.
 *
 * The wire format is a Postgres interval literal — the dispatcher subtracts it
 * from due_at in SQL — so these values are English and stay English: "7 days".
 * The form that writes them has always had this mapping; the deadline detail
 * screen did not, and printed the literals. A researcher opening their own
 * deadline read "Nhắc trước: 7 days, 1 day".
 *
 * An offset a colleague set outside the three the form offers ("2 days") is
 * shown as written rather than dropped — the same rule the form follows when
 * it edits one.
 */
const REMINDER_WORDS: Record<string, string> = {
  "1 day": "1 ngày trước",
  "3 days": "3 ngày trước",
  "7 days": "1 tuần trước",
};
export const reminderLabel = (v: string): string => REMINDER_WORDS[v] ?? v;

// ---------------------------------------------------------------------------
// Dates. `toLocaleString("vi-VN")` with no options prints seconds — every row
// of every table read `20:26:57 20/7/2026`. Nobody schedules to the second, so
// the app has exactly two shapes: a moment, and a day.
// ---------------------------------------------------------------------------

/** A moment: `20:26 20/7/2026`. For "last updated", "stored at", timestamps. */
export const when = (d: Date | string | null | undefined): string =>
  d
    ? new Date(d).toLocaleString("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: APP_TZ,
      })
    : "—";

/** A day: `20/7/2026`. For due dates and anything a person says out loud. */
export const day = (d: Date | string | null | undefined): string =>
  d ? new Date(d).toLocaleDateString("vi-VN", { timeZone: APP_TZ }) : "—";

/**
 * A number, grouped the way Vietnamese writes them: 12.480, not 12480.
 * Tabular figures in the stylesheet line the columns up; this puts the marks
 * in that make a six-digit count readable at all.
 */
export const num = (n: number): string => n.toLocaleString("vi-VN");

/**
 * A file size a person can judge. Everything was printed in KB, so a 40 MB
 * scan read "40960 KB" — a number nobody can weigh against their own inbox.
 */
export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${num(bytes)} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${num(Math.round(kb))} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} MB`;
  return `${(mb / 1024).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} GB`;
}

/**
 * How far off a deadline is, in words. A date chip that only changes colour
 * says nothing to a reader who cannot see the colour — foundation.css is explicit
 * that a state is never carried by hue alone.
 */
export function untilLabel(due: Date, now: Date): string | null {
  // Whole days apart on the app's calendar, not elapsed milliseconds divided
  // by a day: a deadline at 09:00 tomorrow is "Ngày mai" whether it is read at
  // breakfast or at midnight, and dividing gets that wrong in both directions.
  const days = appDayNumber(due) - appDayNumber(now);
  if (days < 0) return `Quá hạn ${-days} ngày`;
  if (days === 0) return "Hôm nay";
  if (days === 1) return "Ngày mai";
  if (days <= 7) return `Còn ${days} ngày`;
  return null; // far off: the date alone is the whole story
}

/**
 * How long there is to do the work, in words — the owner's "thời gian cho phép
 * để xử lý công việc". A deadline alone says when to stop; a span says how much
 * room the work has, which is what a workload board is read for.
 *
 * Null when there is no span to speak of (no start, or a start after the
 * deadline, which is a data mistake the card must not dress up as a duration).
 *
 * ponytail: whole days by wall-clock difference, and weeks only at exact
 * multiples of seven. "1 tuần 3 ngày" is a precision nobody plans in, and the
 * seven-day rounding a fancier version needs is where off-by-one bugs live.
 */
export function spanLabel(start: Date | string, due: Date | string): string | null {
  const days = Math.round((new Date(due).getTime() - new Date(start).getTime()) / 86_400_000);
  if (days < 0) return null;
  if (days === 0) return "Trong ngày";
  if (days % 7 === 0) return `${days / 7} tuần`;
  return `${days} ngày`;
}

// ---------------------------------------------------------------------------
// Badge tones — the visual half of a state label.
//
// A tone is assigned by MEANING, not one colour per enum value: thirty-odd
// states across nine maps collapse onto five tones, so a reader learns the
// vocabulary once and it holds everywhere.
//
//   waiting   — queued, nothing has happened yet (the quietest chip)
//   active    — someone is working on it right now (chàm indigo)
//   attention — a human must act, or it is at risk (hổ phách amber)
//   done      — finished, and finished well (canopy green)
//   stopped   — ended without succeeding, or withdrawn (son vermilion)
//
// Two states keep their own long-standing treatment instead: `archived` stays
// subdued (archived is subdued, not alarming — never
// vermilion) and `no_source` keeps its dashed unfilled edge, which already
// encodes "incomplete" by shape.
//
// Colour is never the only carrier: the chip still prints the Vietnamese word,
// and foundation.css adds a left bar / ring to separate the tones whose colours
// converge under deuteranopia. Kind, type, role and count chips are NOT states
// and stay on the neutral chip on purpose — tinting them would spend the
// vocabulary on things that have no lifecycle.
// ---------------------------------------------------------------------------

export type BadgeTone =
  "waiting" | "active" | "attention" | "done" | "stopped" | "archived" | "no_source";

const TONE_CLASS: Record<BadgeTone, string> = {
  waiting: "badge tone-waiting",
  active: "badge tone-active",
  attention: "badge tone-attention",
  done: "badge tone-done",
  stopped: "badge tone-stopped",
  archived: "badge tone-archived",
  no_source: "badge tone-no-source",
};

/** What an unknown state degrades to — the same neutral chip as before. */
const NEUTRAL_CHIP = "badge muted";

const toneTables = new Map<
  Record<string, string>,
  { name: string; tones: Record<string, BadgeTone> }
>();

/** Bind a label map to its state→tone table, keyed by the map itself. */
function withTones(
  map: Record<string, string>,
  name: string,
  tones: Record<string, BadgeTone>,
): void {
  toneTables.set(map, { name, tones });
}

withTones(extractionLabel, "extractionLabel", {
  pending: "waiting",
  processed: "done",
  unprocessable: "attention",
});

withTones(loanStateLabel, "loanStateLabel", {
  requested: "waiting",
  approved: "done",
  declined: "stopped",
  borrowed: "active",
  overdue: "attention",
  returned: "done",
});

withTones(itemStatusLabel, "itemStatusLabel", {
  available: "done",
  borrowed: "active",
  lost: "stopped",
  repair: "active",
});

withTones(verificationLabel, "verificationLabel", {
  no_source: "no_source",
  unverified: "attention",
  verified: "done",
  archived: "archived",
});

withTones(taskStateLabel, "taskStateLabel", {
  todo: "waiting",
  doing: "active",
  done: "done",
  archived: "archived",
});

/**
 * The class list for a state badge: `badgeClass(loanStateLabel, state)`.
 *
 * Mirrors `guarded()` above — a state the tone table has not caught up with
 * is loud in development and neutral in production, never a broken chip.
 */
export function badgeClass(map: Record<string, string>, value: string | null | undefined): string {
  const table = toneTables.get(map);
  if (table && value != null) {
    const tone = table.tones[value];
    if (tone !== undefined) return TONE_CLASS[tone];
  }
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      table
        ? `[vi] ${table.name} has no badge tone for ${JSON.stringify(value)} — showing the neutral chip. Add the state to the tone table in src/lib/vi.ts.`
        : `[vi] badgeClass was given a label map with no tone table — showing the neutral chip. Register it with withTones() in src/lib/vi.ts.`,
    );
  }
  return NEUTRAL_CHIP;
}

/**
 * The same chips for the few badges whose tone is derived rather than looked
 * up from an enum (an overdue date, a published flag). Keeps the class strings
 * in this module so no component hardcodes one.
 */
export const badgeToneClass = (tone: BadgeTone): string => TONE_CLASS[tone];
