# UI Vocabulary (Vietnamese)

## Purpose
- Map the platform's internal domain terms to the Vietnamese words shown in the interface, so a non-technical team never meets engineering jargon.
- Make the humanities team the owner of user-facing wording, since they are the language experts on the team.

## In Scope
- The internal-term to Vietnamese-UI-copy map for every user-facing concept.
- Governance for who approves UI copy and how it stays consistent.

## Out of Scope
- Technical documentation, which stays in English (see [`../README.md`](../README.md)).
- Full localization of error messages and long-form help, handled per screen during implementation.
- English UI strings, which mirror the internal terms directly.

## Decisions
- The UI is bilingual Vietnamese and English with Vietnamese as the default; documentation stays English.
- User-facing copy uses the Vietnamese column below, never the internal term.
- The humanities team reviews and owns user-facing copy; engineering owns the internal terms.
- When a new user-facing concept appears, it must be added here with a Vietnamese term before it ships.

## Dependencies
- Glossary of internal terms in [`../product/glossary.md`](../product/glossary.md).
- UI principles in [`ui-principles.md`](./ui-principles.md).
- Screen specs in [`user-screen-specs.md`](./user-screen-specs.md) and [`admin-op-screen-specs.md`](./admin-op-screen-specs.md).

## Acceptance Criteria
- Every user-facing internal term has an approved Vietnamese equivalent here.
- No screen shows a raw internal term such as `node`, `intake`, or `unprocessable` to a user.
- A new term cannot ship to the UI without an entry in this file.

## Term Map

| Internal term | Vietnamese UI copy | Notes |
| --- | --- | --- |
| Space | Kho | Membership-scoped storage area |
| Library | Kho tư liệu | Digital browse surface over stored sources |
| Catalog | Thư viện | Physical book collection |
| Catalog Item | Đầu sách | One physical copy |
| Loan Ticket | Phiếu mượn | Borrow-return record |
| Source | Tư liệu | A stored evidence item |
| Source Intake | Gửi tư liệu | Upload or request surface |
| My Submissions | Tư liệu tôi đã gửi | Personal submission history |
| Stored Item | Tư liệu đã lưu | An item available in the library |
| Knowledge Tree | Cây tri thức | Curated knowledge surface |
| Node | Trang tri thức | One curated knowledge unit |
| Branch | Chuyên đề | A topic or work context |
| Graph | Bản đồ tri thức | Relation exploration surface |
| Markdown Draft | Bản thảo | Reviewable draft before publication |
| Promotion / Publish | Xuất bản | Publishing a draft into the tree |
| Verification: no_source | Chưa có nguồn dẫn | Manual node without evidence |
| Verification: unverified | Chưa thẩm định | Published but not yet verified |
| Verification: verified | Đã thẩm định | Reviewed with evidence linkage |
| Verification: archived | Đã lưu trữ | Retired but preserved |
| Source Trust: candidate | Chờ thẩm định | Potentially useful, needs review |
| Source Trust: trusted | Đáng tin | Usable evidence |
| Source Trust: rejected | Không dùng | Not suitable for publication |
| Branch-gap Request | Đề xuất bổ sung | Request for missing knowledge |
| Deadline | Hạn chót | A date-bound commitment |
| Comment | Thảo luận | Object-anchored discussion |
| Review Queue | Hàng chờ duyệt | Operational review surface |
| Publish Review | Duyệt xuất bản | Final publish decision surface |
| Admin Console | Quản trị hệ thống | System controls |
| Librarian Desk | Bàn thủ thư | Circulation management surface |
| Unprocessable | Không xử lý được | Extraction failed; file still stored |
| Access denied | Không có quyền truy cập | Permission denial |

## Proposed Terms (pending humanities review)

Introduced by the demo build (2026-07-20), marked `NEW` in `src/lib/vi.ts`; provisionally approved by the coordinator for the demo, requiring humanities sign-off before V1 ships:

| Internal term | Proposed Vietnamese UI copy |
| --- | --- |
| Extraction: pending | Đang chờ xử lý |
| Extraction: processed | Đã xử lý |
| Source Trust: unknown | Chưa đánh giá |
| Gap Request: submitted | Đã gửi |
| Gap Request: triaged | Đã tiếp nhận |
| Gap Request: converted_to_branch | Đã chuyển thành chuyên đề |
| Loan: requested | Chờ duyệt |
| Loan: approved | Đã duyệt |
| Loan: declined | Từ chối |
| Loan: borrowed | Đang mượn |
| Loan: overdue | Quá hạn |
| Loan: returned | Đã trả |
| Item status: available | Sẵn sàng |
| Item status: borrowed | Đang được mượn |
| Item status: lost | Thất lạc |
| Item status: repair | Đang sửa chữa |
| Role: user | Thành viên |
| Role: editor | Biên tập viên |
| Role: admin_op | Quản trị/Vận hành |

## Governance
- Engineering may introduce an internal term; the humanities reviewer assigns the Vietnamese UI word before it reaches users.
- Changes to a shipped Vietnamese term require the humanities reviewer's approval and an update here.
- The English UI mirrors the internal term unless a clearer plain-English word is agreed; record any such exception in this table.
