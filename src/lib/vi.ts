// User-facing Vietnamese copy, per docs/ui/vocabulary-vi.md — the UI never
// shows a raw internal term. Terms marked NEW are not yet in the vocabulary
// doc and are flagged for humanities review in the step-2 report.

export const T = {
  appName: "WisdomTree",
  home: "Trang chủ",
  space: "Kho",
  library: "Kho tư liệu",
  catalog: "Thư viện",
  catalogItem: "Đầu sách",
  loanTicket: "Phiếu mượn",
  source: "Tư liệu",
  sourceIntake: "Gửi tư liệu",
  mySubmissions: "Tư liệu tôi đã gửi",
  storedItem: "Tư liệu đã lưu",
  librarianDesk: "Bàn thủ thư",
  gapRequest: "Đề xuất bổ sung",
  accessDenied: "Không có quyền truy cập",
  search: "Tìm kiếm",
  download: "Tải xuống",
  signIn: "Đăng nhập",
  signOut: "Đăng xuất",
  requestLoan: "Yêu cầu mượn",
  approve: "Duyệt",
  decline: "Từ chối",
  lend: "Giao sách",
  markReturned: "Đã nhận trả",
  dueDate: "Hạn trả",
  uploader: "Người gửi",
  storedAtLabel: "Lưu lúc",
  title: "Tiêu đề",
  description: "Mô tả",
  file: "Tệp",
  submit: "Gửi",
  loading: "Đang tải…",
  empty: "Chưa có mục nào.",
  notifications: "Thông báo",
  // Knowledge tree terms (vocabulary-vi.md § Term Map)
  tree: "Cây tri thức",
  node: "Trang tri thức",
  branch: "Chuyên đề",
  markdownDraft: "Bản thảo",
  publish: "Xuất bản",
  reviewQueue: "Hàng chờ duyệt",
  publishReview: "Duyệt xuất bản",
  correctedText: "Văn bản đã hiệu đính", // NEW
  rawText: "Văn bản trích xuất", // NEW
  sourceInbox: "Tiếp nhận tư liệu", // NEW
  assignedTask: "Việc được giao", // NEW
  provenance: "Nguồn dẫn", // NEW
  relatedNodes: "Trang liên quan", // NEW
  tags: "Thẻ", // NEW
  branchName: "Tên chuyên đề", // NEW
  createBranch: "Tạo chuyên đề", // NEW
  editNode: "Sửa trang tri thức", // NEW
  save: "Lưu", // NEW
  saveDraft: "Lưu bản thảo", // NEW
  markReady: "Gửi duyệt", // NEW
  assign: "Giao việc", // NEW
  assignee: "Người phụ trách", // NEW
  reject: "Không dùng",
  requestChanges: "Yêu cầu chỉnh sửa", // NEW
  publishVerified: "Xuất bản (Đã thẩm định)", // NEW
  publishUnverified: "Xuất bản (Chưa thẩm định)", // NEW
  archive: "Lưu trữ", // NEW
  merge: "Gộp trang", // NEW
  mergedNotice: "Trang này đã được gộp vào một trang chuẩn.", // NEW
  openCanonical: "Mở trang chuẩn", // NEW
  verificationLabelTitle: "Mức thẩm định", // NEW
  excerpts: "Trích đoạn dẫn chứng", // NEW
  nodeCount: "Số trang tri thức", // NEW
  lastUpdated: "Cập nhật lần cuối", // NEW
  state: "Trạng thái", // NEW
  taskType: "Loại việc", // NEW
  openItem: "Mở", // NEW
  triage: "Tiếp nhận", // NEW
  convertToBranch: "Chuyển thành chuyên đề", // NEW
  contentMd: "Nội dung (Markdown)", // NEW
  suggestedBranch: "Chuyên đề đề xuất", // NEW
  preview: "Xem trước", // NEW
  // Notify + PM terms; Deadline "Hạn chót" and Comment "Thảo luận" come from
  // vocabulary-vi.md § Term Map, the rest are NEW pending humanities review.
  deadline: "Hạn chót",
  comments: "Thảo luận",
  addComment: "Gửi thảo luận", // NEW
  reply: "Trả lời", // NEW
  mentionMembers: "Nhắc đến thành viên", // NEW
  notificationCenter: "Thông báo", // NEW
  markRead: "Đánh dấu đã đọc", // NEW
  unread: "Chưa đọc", // NEW
  notificationPrefs: "Tùy chọn nhận thông báo", // NEW
  board: "Bảng công việc", // NEW
  task: "Công việc", // NEW
  createTask: "Thêm công việc", // NEW
  achievement: "Thành quả", // NEW
  createDeadline: "Tạo hạn chót", // NEW
  editDeadline: "Sửa hạn chót", // NEW
  deadlineType: "Loại hạn chót", // NEW
  dueAtLabel: "Đến hạn", // NEW
  reminderOffsets: "Nhắc trước", // NEW
  checklistAndDocs: "Việc và tài liệu liên quan", // NEW
  myCalendar: "Lịch của tôi", // NEW
  calendarSubscribeHint: "Dán đường dẫn này vào ứng dụng lịch (Google Calendar, Outlook…) để tự động nhận các hạn chót.", // NEW
  project: "Kho dự án", // NEW
  allProjects: "Tất cả kho dự án", // NEW
  noAssignee: "Chưa giao", // NEW
  // Workspace shell terms — NEW pending humanities review
  quickSearch: "Tìm nhanh", // NEW
  openBranch: "Mở chuyên đề", // NEW
  recent: "Gần đây", // NEW
  shortcuts: "Lối tắt", // NEW
  themeToggle: "Đổi giao diện sáng/tối", // NEW
  palettePlaceholder: "Gõ để tìm trang tri thức hoặc mở nhanh một mục…", // NEW
  paletteNoResults: "Không tìm thấy kết quả.", // NEW
  paletteSearching: "Đang tìm…", // NEW
  paletteHintTree: "trang tri thức", // NEW
  paletteHintGo: "mở nhanh", // NEW
  yourSpaces: "không gian", // NEW
  modules: "Mô-đun", // NEW
} as const;

// State labels. `unprocessable`, trust `candidate/trusted/rejected` come from
// the vocabulary doc; the rest are NEW pending humanities review.
export const extractionLabel: Record<string, string> = {
  pending: "Đang chờ xử lý", // NEW
  processed: "Đã xử lý", // NEW
  unprocessable: "Không xử lý được",
};

export const trustLabel: Record<string, string> = {
  unknown: "Chưa đánh giá", // NEW
  candidate: "Chờ thẩm định",
  trusted: "Đáng tin",
  rejected: "Không dùng",
  archived: "Đã lưu trữ",
};

export const gapStateLabel: Record<string, string> = {
  submitted: "Đã gửi", // NEW
  triaged: "Đã tiếp nhận", // NEW
  converted_to_branch: "Đã chuyển thành chuyên đề", // NEW
  rejected: "Không dùng",
  archived: "Đã lưu trữ",
};

export const loanStateLabel: Record<string, string> = {
  requested: "Chờ duyệt", // NEW
  approved: "Đã duyệt", // NEW
  declined: "Từ chối", // NEW
  borrowed: "Đang mượn", // NEW
  overdue: "Quá hạn", // NEW
  returned: "Đã trả", // NEW
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

export const curationStateLabel: Record<string, string> = {
  under_correction: "Đang hiệu đính", // NEW
  ready_for_review: "Chờ duyệt xuất bản", // NEW
  promoted: "Đã xuất bản", // NEW
  rejected: "Không dùng",
};

export const reviewStateLabel: Record<string, string> = {
  queued: "Đang chờ", // NEW
  assigned: "Đã giao", // NEW
  in_review: "Đang duyệt", // NEW
  changes_requested: "Cần chỉnh sửa", // NEW
  approved: "Đã duyệt", // NEW
  rejected: "Không dùng",
};

export const reviewTaskTypeLabel: Record<string, string> = {
  correction: "Hiệu đính", // NEW
  gap_triage: "Tiếp nhận đề xuất", // NEW
  publish: "Xuất bản",
  merge: "Gộp trang", // NEW
  archive: "Lưu trữ", // NEW
  operational: "Vận hành", // NEW
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

export const channelLabel: Record<string, string> = {
  in_app: "Trong ứng dụng", // NEW
  email: "Email", // NEW
  zalo: "Zalo", // NEW
};

// One user-facing sentence per notification event type (matrix events).
export const notificationEventLabel: Record<string, string> = {
  "source.processing_failed": "Tư liệu bạn gửi không xử lý được (tệp gốc vẫn được lưu)", // NEW
  "source.assigned": "Bạn được giao việc hiệu đính", // NEW
  "source.ready_for_review": "Có tư liệu chờ duyệt xuất bản", // NEW
  "tree.node.published": "Tư liệu bạn gửi đã được xuất bản lên cây tri thức", // NEW
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
export const trustStateLabel = (v: string | null | undefined): string =>
  guarded(trustLabel, "trustLabel", v, FALLBACK.state);
export const gapLabel = (v: string | null | undefined): string =>
  guarded(gapStateLabel, "gapStateLabel", v, FALLBACK.state);
export const loanLabel = (v: string | null | undefined): string =>
  guarded(loanStateLabel, "loanStateLabel", v, FALLBACK.state);
export const itemLabel = (v: string | null | undefined): string =>
  guarded(itemStatusLabel, "itemStatusLabel", v, FALLBACK.state);
export const verificationStateLabel = (v: string | null | undefined): string =>
  guarded(verificationLabel, "verificationLabel", v, FALLBACK.state);
export const curationLabel = (v: string | null | undefined): string =>
  guarded(curationStateLabel, "curationStateLabel", v, FALLBACK.state);
export const reviewLabel = (v: string | null | undefined): string =>
  guarded(reviewStateLabel, "reviewStateLabel", v, FALLBACK.state);
export const taskLabel = (v: string | null | undefined): string =>
  guarded(taskStateLabel, "taskStateLabel", v, FALLBACK.state);
export const reviewTypeLabel = (v: string | null | undefined): string =>
  guarded(reviewTaskTypeLabel, "reviewTaskTypeLabel", v, FALLBACK.kind);
export const deadlineKindLabel = (v: string | null | undefined): string =>
  guarded(deadlineTypeLabel, "deadlineTypeLabel", v, FALLBACK.kind);
export const nodeLinkTypeLabel = (v: string | null | undefined): string =>
  guarded(linkTypeLabel, "linkTypeLabel", v, FALLBACK.kind);
export const userRoleLabel = (v: string | null | undefined): string =>
  guarded(roleLabel, "roleLabel", v, FALLBACK.role);
export const notifyChannelLabel = (v: string | null | undefined): string =>
  guarded(channelLabel, "channelLabel", v, FALLBACK.channel);
