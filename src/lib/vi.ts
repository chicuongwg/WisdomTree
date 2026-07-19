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

export const roleLabel: Record<string, string> = {
  user: "Thành viên", // NEW
  editor: "Biên tập viên", // NEW
  admin_op: "Quản trị/Vận hành", // NEW
};
