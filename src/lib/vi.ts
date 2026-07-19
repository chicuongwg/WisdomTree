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

export const roleLabel: Record<string, string> = {
  user: "Thành viên", // NEW
  editor: "Biên tập viên", // NEW
  admin_op: "Quản trị/Vận hành", // NEW
};
