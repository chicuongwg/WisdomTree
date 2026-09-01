# Final proposed bilingual vocabulary

This is the implementation vocabulary proposal. Rows marked for review may change wording without changing interaction architecture.

| Concept | English | Proposed Vietnamese | Rationale | Confidence | Human review? |
| --- | --- | --- | --- | --- | --- |
| Overview | Overview | Tổng quan | Familiar navigation label. | High | No |
| TMKT Overview | TMKT Overview | Tổng quan TMKT | Distinguishes global from Project overview. | High | No |
| Project | Project | Dự án | Established product term. | High | No |
| Projects | Projects | Dự án | Vietnamese does not require plural form. | High | No |
| My Work | My Work | Việc của tôi | Personal aggregation, not ownership universe. | High | No |
| People | People | Con người | Broad enough for historical/research persons, but abstract. | Medium | **Yes** — compare `Nhân vật nghiên cứu`; avoid `Thành viên`. |
| Search | Search | Tìm kiếm | Clear action/destination. | High | No |
| Quick Search | Quick Search | Tìm nhanh | Distinguishes command/navigation dialog. | High | No |
| New | New | Tạo mới | Action, not ownership. | High | No |
| Notes | Notes | Ghi chú | Established neutral term. | High | No |
| Material | Material | Tư liệu | Research-oriented and broader than files. | Medium-high | **Yes** — validate against `Nguồn tư liệu`. |
| Materials | Materials | Tư liệu | Same plural-neutral label. | Medium-high | **Yes** |
| Activities | Activities | Hoạt động | Covers interview/field trip/meeting without calendar meaning. | High | No |
| Tasks | Tasks | Nhiệm vụ | Distinguishes discrete Tasks from global `Việc của tôi`. | Medium-high | **Yes** — preferred over ambiguous `Công việc`. |
| Library | Library | Thư viện | Familiar; only inside capable Project. | High | No |
| Person | Person | Nhân vật nghiên cứu | Avoids implying account/member; can feel formal. | Medium | **Yes** — product-owner terminology decision. |
| Evidence | Evidence | Bằng chứng nghiên cứu | Makes internal research meaning explicit. | Medium | **Yes** — humanities vocabulary. |
| Synthesis | Synthesis | Tổng hợp nghiên cứu | Avoids technical shorthand. | Medium-high | **Yes** |
| Research purpose | Research purpose | Mục đích nghiên cứu | Descriptive optional metadata. | High | No |
| Unspecified | Unspecified | Chưa xác định | Not invalid/missing. | High | No |
| Private draft | Private draft | Bản nháp riêng tư | Separates privacy from Project. | High | No |
| Internal Note | Internal Note | Ghi chú nội bộ | Distinguishes internal completion from public publishing. | High | No |
| Save as internal Note | Save as internal Note | Lưu thành ghi chú nội bộ | Avoids ambiguous `Publish`. | Medium-high | **Yes** — length test. |
| Publish publicly | Publish publicly | Xuất bản công khai | Explicit public consequence. | High | No |
| Publish changes | Publish changes | Xuất bản thay đổi | Public revision update. | High | No |
| Unpublish | Unpublish | Gỡ khỏi công khai | Communicates availability removal without deletion. | Medium-high | **Yes** — compare `Ngừng xuất bản`. |
| Published | Published | Đã xuất bản | Clear state. | High | No |
| Never published | Never published | Chưa từng xuất bản | Distinct from unpublished. | High | No |
| Unpublished | Unpublished | Đã gỡ khỏi công khai | History remains. | Medium-high | **Yes** |
| Unpublished changes | Changes not public | Thay đổi chưa công khai | Explains stale public revision. | High | No |
| Supporting research | Supporting research | Tư liệu nghiên cứu hỗ trợ | Broader than bibliography/citation. | Medium | **Yes** |
| Add evidence | Add evidence | Thêm bằng chứng | Compact action; context supplies research meaning. | Medium-high | **Yes** |
| Material version | Material version | Phiên bản tư liệu | One Material, immutable file versions. | High | No |
| Files and versions | Files and versions | Tệp và phiên bản | Human-facing representation language. | High | No |
| Physical copy | Physical copy | Bản vật lý | Broad; holdings may prefer `Bản hiện vật`. | Medium | **Yes** |
| Extraction | Extraction | Trích xuất văn bản | Explicit text-processing meaning. | Medium-high | **Yes** if non-text extraction expands. |
| Extracted text | Extracted text | Văn bản trích xuất | Clear result. | High | No |
| Processing | Processing | Đang xử lý | Durable async state. | High | No |
| Library operator | Library operator | Nhân sự vận hành thư viện | Separates operational authority from Project manager. | Medium | **Yes** |
| Work access | Work access | Quyền tham gia công việc | Plain-language Project participation. | Medium | **Yes** |
| Research access | Research access | Quyền đọc nghiên cứu | Explains Core outsider scope. | Medium-high | **Yes** |
| Context Inspector | Details | Chi tiết | User-facing label should describe content, not architecture. | High | No |
| History | History | Lịch sử phiên bản | Explicit version meaning. | High | No |
| Focus mode | Focus mode | Chế độ tập trung | Familiar, non-technical. | High | No |
| Saving / Saved | Saving… / Saved | Đang lưu… / Đã lưu | Stable autosave states. | High | No |
| Conflict | Changes conflict | Xung đột thay đổi | Requires dedicated recovery UI. | High | No |

## Localization rules

- Titles, descriptions, research content, names, and Material filenames are data, not UI messages.
- Message catalogs use stable keys, interpolation, and locale-aware plural/date formatting; no string concatenation that breaks Vietnamese/English order.
- Dates/numbers use the selected UI locale and explicit timezone semantics from domain values.
- Unsupported/missing locale preference falls back to Vietnamese as Stage 16 specifies.
- Locale preference persists through `setApplicationLocale`; changing locale does not duplicate routes or reload/translate stored research.
- Accessible names, dialog titles, validation, live-region messages, and shortcut descriptions are localized with visible copy.
- Reserve 30–40% expansion in navigation/action layouts; avoid uppercase transformations and English-only abbreviations.
