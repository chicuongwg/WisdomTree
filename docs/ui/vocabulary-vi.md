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

Introduced by the demo and V1-local builds (2026-07-20), marked `// NEW` in `src/lib/vi.ts`; provisionally approved by the coordinator, requiring humanities sign-off before V1 ships. The table below now lists every `// NEW` marker in `src/lib/vi.ts` (203 strings as of 2026-07-20), in file order: the core state and role terms first, then the screen microcopy from the catalog loan-record, knowledge, graph, notification, deadline, board, and workspace-shell surfaces, ending with the interactive knowledge-map controls (drag-to-pin, zoom, motion, and the display settings panel). Entries taken from a state or event map are prefixed with that map's concept; entries from the `T` string table are listed under their key. `Graph` is not repeated here because it is already an approved term above.

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
| loanRecord | Sổ mượn trả |
| currentLoan | Lượt mượn hiện tại |
| loanHistory | Các lượt mượn trước |
| noLoanRecord | Đầu sách này chưa có lượt mượn nào. |
| noCurrentLoan | Hiện không có ai mượn đầu sách này. |
| borrower | Người mượn |
| requestedAtLabel | Yêu cầu lúc |
| approvedByLabel | Duyệt bởi |
| approvedAtLabel | Duyệt lúc |
| borrowedAtLabel | Nhận sách lúc |
| returnedAtLabel | Đã trả lúc |
| overdueLabel | Quá hạn |
| notYet | Chưa có |
| correctedText | Văn bản đã hiệu đính |
| rawText | Văn bản trích xuất |
| sourceInbox | Tiếp nhận tư liệu |
| assignedTask | Việc được giao |
| provenance | Nguồn dẫn |
| relatedNodes | Trang liên quan |
| tags | Thẻ |
| branchName | Tên chuyên đề |
| createBranch | Tạo chuyên đề |
| editNode | Sửa trang tri thức |
| save | Lưu |
| saveDraft | Lưu bản thảo |
| markReady | Gửi duyệt |
| assign | Giao việc |
| assignee | Người phụ trách |
| requestChanges | Yêu cầu chỉnh sửa |
| publishVerified | Xuất bản (Đã thẩm định) |
| publishUnverified | Xuất bản (Chưa thẩm định) |
| archive | Lưu trữ |
| merge | Gộp trang |
| mergedNotice | Trang này đã được gộp vào một trang chuẩn. |
| openCanonical | Mở trang chuẩn |
| verificationLabelTitle | Mức thẩm định |
| excerpts | Trích đoạn dẫn chứng |
| nodeCount | Số trang tri thức |
| lastUpdated | Cập nhật lần cuối |
| state | Trạng thái |
| taskType | Loại việc |
| openItem | Mở |
| triage | Tiếp nhận |
| convertToBranch | Chuyển thành chuyên đề |
| contentMd | Nội dung (Markdown) |
| suggestedBranch | Chuyên đề đề xuất |
| preview | Xem trước |
| addComment | Gửi thảo luận |
| reply | Trả lời |
| mentionHelp | Gõ @ rồi tên thành viên (ví dụ @Phạm Thu Hương) để nhắc họ vào thảo luận này. |
| notificationCenter | Thông báo |
| markRead | Đánh dấu đã đọc |
| unread | Chưa đọc |
| notificationPrefs | Tùy chọn nhận thông báo |
| board | Bảng công việc |
| task | Công việc |
| createTask | Thêm công việc |
| achievement | Thành quả |
| createDeadline | Tạo hạn chót |
| editDeadline | Sửa hạn chót |
| deadlineType | Loại hạn chót |
| dueAtLabel | Đến hạn |
| reminderOffsets | Nhắc trước |
| checklistAndDocs | Việc và tài liệu liên quan |
| myCalendar | Lịch của tôi |
| calendarSubscribeHint | Dán đường dẫn này vào ứng dụng lịch (Google Calendar, Outlook…) để tự động nhận các hạn chót. |
| project | Kho dự án |
| allProjects | Tất cả kho dự án |
| noAssignee | Chưa giao |
| quickSearch | Tìm nhanh |
| openBranch | Mở chuyên đề |
| recent | Gần đây |
| shortcuts | Lối tắt |
| themeToggle | Đổi giao diện sáng/tối |
| palettePlaceholder | Gõ để tìm trang tri thức hoặc mở nhanh một mục… |
| paletteNoResults | Không tìm thấy kết quả. |
| paletteSearching | Đang tìm… |
| paletteHintTree | trang tri thức |
| paletteHintGo | mở nhanh |
| yourSpaces | không gian |
| modules | Mô-đun |
| graphIntro | Mỗi chấm là một trang tri thức, mỗi đường là một liên kết giữa hai trang. |
| backlinks | Liên kết đến trang này |
| outgoingLinks | Trang này liên kết đến |
| localMap | Bản đồ quanh trang này |
| wikiMissing | Chưa có trang này |
| wikiHelp | Gõ [[Tiêu đề trang]] để liên kết sang một trang tri thức khác. |
| legend | Chú giải |
| filterByBranch | Lọc theo chuyên đề |
| allBranches | Tất cả chuyên đề |
| filterByTitle | Lọc theo tên trang |
| graphEmpty | Chưa có trang tri thức nào để vẽ bản đồ. |
| graphNoMatch | Không có trang nào khớp bộ lọc. Xóa bớt điều kiện để xem lại. |
| graphCount | trang · liên kết |
| noBacklinks | Chưa trang nào liên kết đến trang này. |
| navKnowledge | Tri thức |
| navWork | Dự án & công việc |
| navBranches | Danh sách chuyên đề |
| openGraph | Mở bản đồ tri thức |
| graphSettings | Tùy chỉnh bản đồ |
| graphGroupFilter | Bộ lọc |
| graphGroupDisplay | Hiển thị |
| graphGroupForce | Lực kéo đẩy |
| graphGroupLocal | Bản đồ quanh trang |
| graphShowOrphans | Hiện cả trang chưa có liên kết |
| graphColourBy | Tô màu theo |
| graphColourVerification | Mức thẩm định |
| graphColourBranch | Chuyên đề |
| graphSizeByLinks | Chấm to dần theo số liên kết |
| graphShowArrows | Hiện mũi tên chỉ chiều liên kết |
| graphLabels | Tên trang |
| graphLabelsAlways | Luôn hiện |
| graphLabelsHover | Hiện khi trỏ tới |
| graphLabelsHidden | Ẩn |
| graphLinkTypes | Loại liên kết |
| graphCentreForce | Lực hút vào giữa |
| graphRepelForce | Lực đẩy giữa các chấm |
| graphLinkForce | Lực kéo của liên kết |
| graphLinkDistance | Độ dài liên kết |
| graphDepth | Số bước lan tỏa |
| graphDirection | Chiều liên kết |
| graphDirectionBoth | Cả hai chiều |
| graphDirectionOutgoing | Liên kết đi ra |
| graphDirectionIncoming | Liên kết đi vào |
| graphZoomIn | Phóng to bản đồ |
| graphZoomOut | Thu nhỏ bản đồ |
| graphZoomReset | Vừa khung |
| graphPause | Dừng chuyển động |
| graphResume | Cho chuyển động |
| graphUnpinAll | Bỏ ghim tất cả |
| graphResetSettings | Khôi phục mặc định |
| graphPinned | đã ghim |
| graphPinnedOne | Đã ghim tại chỗ |
| graphHelp | Kéo một chấm để ghim nó vào chỗ mới. Giữ Ctrl và lăn chuột để phóng to. Kéo nền để di chuyển bản đồ. |
| graphKeyboardHelp | Bàn phím: Tab để đi giữa các trang, Enter để mở, phím mũi tên để dời chấm đang chọn, P để ghim hoặc bỏ ghim, Esc để đóng thẻ xem trước. |
| graphWheelHint | Giữ Ctrl rồi lăn chuột để phóng to bản đồ. |
| graphCapNotice | Bản đồ vượt mức chuyển động được nên đang giữ bố cục tĩnh. Hãy lọc bớt để bản đồ chuyển động trở lại. |
| graphCapLimit | Mức tối đa |
| graphShapeNote | Hình dạng luôn cho biết mức thẩm định, kể cả khi tô màu theo chuyên đề. |
| graphMotionOff | Bản đồ đang đứng yên theo thiết lập giảm chuyển động của máy bạn. |
| Curation: under_correction | Đang hiệu đính |
| Curation: ready_for_review | Chờ duyệt xuất bản |
| Curation: promoted | Đã xuất bản |
| Review: queued | Đang chờ |
| Review: assigned | Đã giao |
| Review: in_review | Đang duyệt |
| Review: changes_requested | Cần chỉnh sửa |
| Review: approved | Đã duyệt |
| Review task: correction | Hiệu đính |
| Review task: gap_triage | Tiếp nhận đề xuất |
| Review task: merge | Gộp trang |
| Review task: archive | Lưu trữ |
| Review task: operational | Vận hành |
| Link type: related | Liên quan |
| Link type: supports | Bổ trợ |
| Link type: contrasts | Đối chiếu |
| Link type: part_of | Thuộc về |
| Deadline type: conference | Hội thảo |
| Deadline type: funding | Tài trợ |
| Deadline type: report | Báo cáo |
| Deadline type: milestone | Cột mốc |
| Task: todo | Cần làm |
| Task: doing | Đang làm |
| Task: done | Hoàn thành |
| Channel: in_app | Trong ứng dụng |
| Channel: email | Email |
| Channel: zalo | Zalo |
| Notification: source.processing_failed | Tư liệu bạn gửi không xử lý được (tệp gốc vẫn được lưu) |
| Notification: source.assigned | Bạn được giao việc hiệu đính |
| Notification: source.ready_for_review | Có tư liệu chờ duyệt xuất bản |
| Notification: tree.node.published | Tư liệu bạn gửi đã được xuất bản lên cây tri thức |
| Notification: loan.approved | Yêu cầu mượn sách đã được duyệt |
| Notification: loan.borrowed | Bạn đã nhận sách; nhớ hạn trả |
| Notification: loan.returned | Phiếu mượn đã ghi nhận trả sách |
| Notification: loan.declined | Yêu cầu mượn sách bị từ chối |
| Notification: loan.overdue | Phiếu mượn đã quá hạn trả |
| Notification: deadline.approaching | Sắp đến hạn chót của dự án |
| Notification: comment.created | Bạn được nhắc đến trong một thảo luận |
| Fallback: event | Cập nhật mới |
| Fallback: state | Không rõ trạng thái |
| Fallback: kind | Không rõ loại |
| Fallback: role | Chưa rõ vai trò |
| Fallback: channel | Kênh khác |

## Governance
- Engineering may introduce an internal term; the humanities reviewer assigns the Vietnamese UI word before it reaches users.
- Changes to a shipped Vietnamese term require the humanities reviewer's approval and an update here.
- The English UI mirrors the internal term unless a clearer plain-English word is agreed; record any such exception in this table.
