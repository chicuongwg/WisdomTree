# UI Vocabulary (Vietnamese)

The UI never shows a raw internal term. The **live, complete** term
table is `src/lib/vi/` (`copy.ts` for strings, `states.ts` for state and
role labels, `errors.ts` for error codes) — that code is the source of
truth. This document records the governance rule and the core approved
terms so the humanities side of the team can own the wording without
reading TypeScript.

## Governance

- Engineering owns the internal (English) terms; the humanities team
  owns and approves the Vietnamese the reader sees.
- A new user-facing concept needs a Vietnamese term before it ships;
  entries pending review are marked `// NEW` in `src/lib/vi/`.
- Internals (code, APIs, errors, docs) stay English; the FE translator
  layer is the only place Vietnamese lives.

## Core approved terms

| Internal term | Vietnamese UI copy | Notes |
| --- | --- | --- |
| Space | Kho | Membership-scoped storage area |
| Library | Tư liệu số | The `/library` surface (files + books) |
| Physical book | Sách giấy | The physical half of a Library item |
| Item code | Mã đầu sách | `LIB-000001` |
| Loan ticket | Phiếu mượn | Borrow–return record |
| Loan desk | Quầy phiếu mượn | `/library/loans` |
| Category | Danh mục | Content taxonomy; "Sách" is seeded |
| Branch | Chuyên đề | A subject tree |
| Node | Trang (tri thức) | One markdown page |
| Verification: no_source | Chưa có nguồn dẫn | Square mark |
| Verification: unverified | Chưa thẩm định | Diamond mark |
| Verification: verified | Đã thẩm định | Circle mark |
| Promotion | Đề cử lên cây chung | The single review boundary |
| Protected page | Trang được bảo vệ | Shared page that requires review |
| Draft | Bản nháp riêng | Per-user working copy over the official page |
| Review | Kiểm chéo | Independent-reviewer decision |
| Version history | Lịch sử phiên bản | Diff + restore |
| Presence | Người đang xem/sửa | Advisory warning, not a hard lock |
| Graph | Bản đồ tri thức | The `/graph` view |
| Role: user | Thành viên | |
| Role: editor | Biên tập viên | |
| Role: admin_op | Quản trị/Vận hành | |
| Task / board | Công việc / Bảng việc | |
| Deadline | Hạn chót | |
| Notification | Thông báo | In-app center |
