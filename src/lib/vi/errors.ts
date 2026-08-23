// FE half of the English-internals convention: the BE speaks English and a
// stable `code`; the reader sees Vietnamese. One table, keyed by ApiError
// code; messages that need values take them from `details`. An unknown code
// falls back to the server's (English) message so nothing is ever swallowed.

type Details = Record<string, unknown> | undefined;

const num = (d: Details, k: string): number | null =>
  d && typeof d[k] === "number" ? (d[k] as number) : null;
const str = (d: Details, k: string): string | null =>
  d && typeof d[k] === "string" && d[k] ? (d[k] as string) : null;

const STATIC: Record<string, string> = {
  // lib/errors.ts builtins + handleApi
  unauthorized: "Bạn cần đăng nhập để tiếp tục.",
  forbidden: "Không có quyền truy cập.",
  not_found: "Không tìm thấy nội dung này.",
  version_conflict: "Nội dung vừa được người khác cập nhật. Vui lòng tải lại và thử lại.",
  internal_error: "Có lỗi xảy ra. Vui lòng thử lại sau.",
  // auth / admin
  invalid_invite: "Thông tin mời thành viên không hợp lệ.",
  invalid_user: "Vui lòng chọn thành viên.",
  invalid_user_change: "Thông tin thay đổi thành viên không hợp lệ.",
  invalid_role: "Vai trò không hợp lệ.",
  invalid_email: "Vui lòng nhập địa chỉ email hợp lệ.",
  invalid_name: "Vui lòng nhập tên hiển thị.",
  invalid_profile: "Thông tin hồ sơ không hợp lệ.",
  email_taken: "Email này đã có tài khoản.",
  last_admin: "Không thể bỏ quản trị viên cuối cùng.",
  self_disable: "Không thể tự vô hiệu hoá tài khoản của mình.",
  separation_of_duties: "Người tạo hoặc sửa không được tự duyệt.",
  invalid_cursor: "Mốc thời gian không hợp lệ.",
  // uploads / files / library
  invalid_upload: "Vui lòng chọn tệp và kho.",
  missing_file: "Hãy chọn tệp.",
  not_an_image: "Ảnh phải là PNG, JPEG hoặc WebP.",
  image_too_large: "Ảnh vượt quá dung lượng cho phép.",
  file_too_large: "Tệp vượt quá giới hạn 100 MB. Vui lòng chọn tệp nhỏ hơn.",
  format_not_allowed: "Định dạng tệp này không được chấp nhận.",
  invalid_title: "Tên tư liệu không được để trống.",
  not_stored: "Tư liệu không ở trạng thái phù hợp cho thao tác này.",
  not_archived: "Tư liệu này không ở trạng thái đã thu hồi.",
  source_in_use:
    "Không thể thu hồi: đã có nội dung xuất bản dựa trên tư liệu này. Liên hệ quản trị viên.",
  unknown_folder: "Thư mục không tồn tại.",
  folder_other_space: "Thư mục này thuộc kho khác.",
  folder_exists: "Đã có thư mục trùng tên tại đây.",
  folder_not_empty: "Thư mục vẫn còn mục bên trong.",
  invalid_folder: "Tên thư mục không được để trống.",
  invalid_space: "Vui lòng nhập tên kho.",
  unknown_user: "Người dùng không tồn tại.",
  invalid_method: "Hãy chọn Pandoc hoặc OCR.",
  candidate_exists: "Tệp này đã có bản Markdown chờ xử lý.",
  // physical books + loans
  invalid_item: "Vui lòng nhập tên và chọn kho cho đầu sách.",
  invalid_copies: "Số lượng phải là số nguyên từ 1 trở lên.",
  item_archived: "Đầu sách này đã được lưu trữ, không thể mượn.",
  item_unavailable: "Đầu sách này hiện không thể mượn.",
  loan_already_active: "Bạn đang có phiếu mượn cho đầu sách này.",
  invalid_due_date: "Vui lòng chọn hạn trả hợp lệ.",
  // knowledge
  invalid_branch: "Vui lòng nhập tên chuyên đề.",
  invalid_node: "Vui lòng nhập chuyên đề, tiêu đề và nội dung.",
  invalid_link_type: "Loại liên kết không hợp lệ.",
  invalid_links: "Danh sách liên kết không hợp lệ.",
  invalid_merge: "Không thể gộp trang: vui lòng chọn trang chuẩn hợp lệ.",
  invalid_query: "Vui lòng nhập từ khóa tìm kiếm.",
  invalid_state: "Trạng thái hiện tại không cho phép thao tác này.",
  submission_required: "Nội dung chung phải đi qua kiểm chéo.",
  review_required: "Trang đã lên cây chung chỉ thay đổi qua đề xuất được duyệt.",
  live_editable: "Trang cá nhân sửa trực tiếp, không cần đề xuất.",
  invalid_review: "Quyết định kiểm chéo không hợp lệ.",
  invalid_target_branch: "Chuyên đề chung đích không hợp lệ.",
  publication_pending: "Trang này đã có đề cử đang chờ duyệt.",
  publication_unchanged: "Phiên bản hiện tại đã được duyệt lên cây chung.",
  review_note_required: "Vui lòng ghi lý do cho quyết định này.",
  review_stale: "Nội dung đã thay đổi sau khi gửi duyệt. Hãy yêu cầu gửi lại đề xuất mới.",
  missing_verification: "Thiếu mức thẩm định.",
  source_required: "Trang không có tư liệu nguồn chỉ được xuất bản ở mức chưa thẩm định.",
  vault_missing: "Không tìm thấy kho tri thức.",
  branch_exists: "Tên chuyên đề đã tồn tại trong kho này.",
  // comments / notifications / presence
  invalid_anchor: "Mục này không nhận thảo luận.",
  invalid_comment: "Vui lòng nhập nội dung thảo luận.",
  invalid_parent_comment: "Bình luận gốc không thuộc mục này.",
  unknown_event_type: "Loại sự kiện thông báo không hợp lệ.",
  invalid_preferences: "Danh sách tùy chọn thông báo không hợp lệ.",
  invalid_page: "Trang không hợp lệ.",
  // pm
  invalid_range: "Khoảng thời gian không hợp lệ.",
  invalid_deadline: "Vui lòng nhập kho dự án, tiêu đề và hạn chót.",
  invalid_deadline_type: "Loại hạn chót không hợp lệ.",
  invalid_due_at: "Thời hạn không hợp lệ.",
  invalid_start_at: "Ngày bắt đầu không hợp lệ.",
  invalid_reminder_offsets: "Mốc nhắc hạn không hợp lệ.",
  already_claimed: "Việc này đã có người nhận.",
  invalid_task: "Vui lòng nhập tiêu đề công việc.",
  invalid_task_state: "Trạng thái công việc không hợp lệ.",
};

/** ApiError `{code, details, message}` → the sentence the reader sees. */
export function translateApiError(
  code: string | undefined,
  details: Details,
  fallbackMessage: string | undefined,
): string {
  switch (code) {
    case "edit_locked": {
      const holder = str(details, "holderName");
      return holder
        ? `Trang đang được chỉnh sửa bởi ${holder}. Vui lòng thử lại sau.`
        : "Trang đang được người khác chỉnh sửa. Vui lòng thử lại sau.";
    }
    case "copies_below_active_loans": {
      const n = num(details, "onLoan");
      return n != null
        ? `Hiện có ${n} cuốn chưa được trả, nên số lượng không thể nhỏ hơn ${n}. Hãy nhận lại sách rồi giảm số lượng.`
        : "Số lượng không thể nhỏ hơn số sách đang được mượn.";
    }
    case "copies_on_loan": {
      const n = num(details, "onLoan");
      return n != null
        ? `Hiện có ${n} cuốn chưa được trả, chưa thể lưu trữ đầu sách này. Hãy nhận lại sách trước.`
        : "Vẫn còn sách đang được mượn, chưa thể lưu trữ đầu sách này.";
    }
    case "rate_limited": {
      const s = num(details, "retryAfterSeconds");
      return s != null
        ? `Bạn thao tác quá nhanh. Vui lòng thử lại sau ${s} giây.`
        : "Bạn thao tác quá nhanh. Vui lòng thử lại sau.";
    }
    default:
      return (code && STATIC[code]) || fallbackMessage || STATIC.internal_error;
  }
}
