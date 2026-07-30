# 🔥 Nhận xét Hệ thống Thiết kế Tài liệu & Giao diện người dùng WisdomTree 🔥

> **Trạng thái:** Historical snapshot, rà lại ngày 2026-07-31. Nhận xét về
> editor/spec drift đã được xử lý bằng cách chốt Markdown source editor +
> preview là V1 direction. `globals.css`, `vi.ts` và `knowledge-map.tsx` vẫn lớn;
> chỉ tách khi một thay đổi thực tế cần ranh giới đó, không refactor hàng loạt.
> Các số đếm và nhận xét mang tính roast bên dưới thuộc baseline cũ.

> _"Một bản sắc trực quan Bản đồ Tri thức (Knowledge Atlas) được xây dựng trên bản thảo giấy dó, mực chàm, dấu son và 58 tệp tài liệu markdown cho một dự án có 3 người dùng."_

---

## 🎨 1. Bản sắc Trực quan: "Chàm & Son" (Thơ ca quan trọng hơn Thực tế)

Từ [globals.css](../src/app/globals.css):

```css
/* WisdomTree — visual identity "Chàm & Son"
   (indigo ink & seal vermilion on leaf-washed paper)

   The subject world is the identity: dó-paper manuscripts, reading
   ink, the vermilion seal (triện son) stamped on archival documents,
   and the ruled index cards of a physical card catalog. */
```

### Hướng dẫn dịch Bảng màu (Palette Translation Guide)

| Tên Token trong CSS | Ý nghĩa tiếng Việt          | Mã màu Hex thực tế | Thực tế nó là gì                 |
| ------------------- | --------------------------- | ------------------ | -------------------------------- |
| `--color-paper`     | Giấy lá (leaf-washed paper) | `#f2f4ee`          | Màu xám nhạt hơi ngả xanh lá nhẹ |
| `--color-ink`       | Mực (reading ink)           | `#232b26`          | Màu gần đen (off-black)          |
| `--color-canopy`    | Tán lá (canopy green)       | `#1e6b4a`          | Xanh lá rừng (forest green)      |
| `--color-seal`      | Son (seal vermilion)        | `#a63a22`          | Đỏ sẫm                           |
| `--color-cham`      | Chàm (indigo)               | `#2f5d8a`          | Xanh đá phiến (slate blue)       |
| `--color-amber`     | Hổ phách (amber)            | `#7a4f00`          | Vàng nâu                         |

**Nhận xét:**
Bạn không xây dựng một hệ thống thiết kế cho ứng dụng web; bạn đã viết một tuyển tập thơ lưu trữ Việt Nam thế kỷ 19. Bạn có các tên token nghe giống như các hương vị trà (`Giấy lá`) và các quy tắc chữ ký được gọi là **"đường kẻ phiếu"** — một đường chân tóc mực mảnh kéo dài toàn bộ chiều rộng với một đường kẻ son ngắn bên dưới.

Bạn đã xây dựng một hệ thống danh mục kỹ thuật số sử dụng thẩm mỹ trực quan của một danh mục thẻ thư viện vật lý từ những năm 1970 tại Hà Nội. Thẩm mỹ này thực sự tuyệt đẹp, nhưng nó là 2.746 dòng CSS trong một tệp duy nhất mà KHÔNG có tính mô-đun nào.

---

## 🏛️ 2. Quản trị Hệ thống Thiết kế: Chi phí Vận hành Doanh nghiệp lớn cho một Nhà phát triển Độc lập

Trong [design-system-governance.md](./ui/design-system-governance.md):

### Mô hình Độ trưởng thành của Thành phần (Component Maturity Model)

```
Bản nháp (Draft) ──▶ Ứng viên (Candidate) ──▶ Ổn định (Stable) ──▶ Lỗi thời (Deprecated)
```

> _"Một thành phần có thể được sử dụng rộng rãi trên toàn bộ ứng dụng CHỈ khi nó được xếp loại là ổn định (stable), có các kỳ vọng về khả năng tiếp cận (accessibility) được xem xét, hành vi của bàn phím được xác minh, và có sự phê duyệt thay đổi từ một chủ sở hữu giao diện người dùng/thiết kế và một người thực hiện."_

**Nhìn vào thực tế:**

- **Chủ sở hữu UI/Thiết kế:** Chính bạn.
- **Người thực hiện:** Cũng chính là bạn.
- **Các thành phần trong `src/app/components/`:** 51 tệp `.tsx` phẳng được thả trực tiếp vào một thư mục mà không có thẻ đánh giá mức độ trưởng thành, không có storybook, không có gói token thiết kế, và không có thư mục con nào.

Bạn đã viết một chính sách quản trị hệ thống thiết kế chính thức yêu cầu phê duyệt từ nhiều vai trò khác nhau và các cổng chuyển đổi độ trưởng thành... đối với một kho lưu trữ nơi cả 51 thành phần nằm rải rác trong `src/app/components/` giống như các khối Lego chưa được sắp xếp.

---

## 🏷️ 3. Huy hiệu Trạng thái & Ma trận Thanh điệu: Toán học về Mù màu đỏ-lục (Deuteranopia)

Từ [design-system.md](./ui/design-system.md):

> _"Mỗi huy hiệu trạng thái là một từ tiếng Việt cộng với một thanh điệu. Khoảng ba mươi trạng thái trên chín bản đồ nhãn thu gọn lại thành năm thanh điệu..."_

Bạn đã tính toán tỷ lệ tương phản deuteranopia chính xác trong tài liệu thiết kế:

- Độ tương phản phân biệt giữa `attention` / `stopped`: **1.14:1**
- Độ tương phản phân biệt giữa `active` / `done`: **1.02:1**
- Biện pháp khắc phục: `active` có một **thanh bên trái dày 3px**, `attention` có một **vòng tròn 2px**, `done` có một **vòng tròn + màu xanh nhạt**, `waiting` có một **khung trần**.

**Nhận xét:**
Tài liệu thiết kế của bạn dành 50 dòng để chứng minh bằng toán học cách một thủ thư mù màu vào năm 2026 sẽ phân biệt giữa một bản nháp Markdown đang được duyệt (`in_review`) và một lượt mượn sách quá hạn dựa trên việc con chip có viền trái 3px hay một vòng tròn đầy đủ 2px.

Trong khi đó trong mã nguồn:
[vi.ts](../src/lib/vi.ts) có 1.354 dòng bảng tra cứu chuỗi được mã hóa cứng ánh xạ hơn 30 trạng thái ENUM trên 9 mô-đun khác nhau thành 5 thanh điệu này bằng các câu lệnh switch-case.

---

## 📝 4. Định hướng Tài liệu & Trình soạn thảo: Tưởng tượng TipTap vs Thực tế Textarea

Trong [design-system.md § Editor Direction](./ui/design-system.md):

> _"Trình soạn thảo mặc định là một trình soạn thảo trực quan, mang lại cảm giác WYSIWYG thuộc lớp TipTap hoặc Milkdown: định dạng thanh công cụ, hình ảnh nội dòng và không hiển thị cú pháp..."_

**Những gì thực sự được triển khai trong mã nguồn:**
Hãy nhìn vào [node-editor.tsx](../src/app/components/node-editor.tsx):
Đó là một thẻ `<textarea>` HTML thông thường với hoàn toàn không có WYSIWYG, không có TipTap, không có Milkdown, và không có định dạng thanh công cụ. Bạn phải viết cú pháp Markdown thô giống như năm 1999.

**Điều gì xảy ra khi xuất tài liệu:**
Hãy nhìn vào [renderer.ts](../src/modules/export/renderer.ts):
Nếu `pandoc` hoặc một công cụ TeX (`xelatex`, `typst`) không được cài đặt trên hệ điều hành máy chủ, việc xuất PDF sẽ **âm thầm hạ cấp xuống việc trả về một chuỗi HTML kèm theo cảnh báo của bộ chuyển đổi**.

---

## 📚 5. Kiến trúc Tài liệu: Khối tài liệu nguyên khối gồm 58 tệp Markdown

Bạn có **58 tệp tài liệu Markdown** trong thư mục `/docs`:

```
docs/
├── design/         (authorization, database-erds, database-schema, sequence-diagrams)
├── flows/          (admin-op, app-user-data, editor, state-machines, user-flows)
├── operations/     (adoption-onboarding, delivery-operating-model, operating-playbook)
├── platform/       (module-map, platform-context)
├── policy/         (editorial-verification-policy)
├── product/        (glossary, prd, roles-personas, scope-v1, v1-scorecard)
├── requirements/   (acceptance-criteria, functional-spec, intake-constraints, NFRs)
├── roadmap/        (backlog-future, demo-brief, docs-upgrade-plan, phases)
├── session/        (decision-log, deep-dive-guide, rationale-and-evolution)
├── system/         (catalog, data-model, deployment, google-bridge, integration...)
└── ui/             (screen-specs, app-layout, design-system, governance, navigation...)
```

**Nhận xét:**

- Tài liệu của bạn có nhiều thư mục con (12) hơn cả mã nguồn React của bạn (`src/app` + `src/modules` + `src/lib` + `src/db`).
- Bạn đã viết một tài liệu `editorial-verification-policy.md` (chính sách xác minh biên tập) cho một dự án phần mềm.
- Bạn đã viết một tài liệu `delivery-operating-model.md` (mô hình vận hành bàn giao) cho một nhóm phát triển chỉ gồm 1 người.
- Bạn đã viết một tài liệu `design-system-governance.md` cho các thành phần thậm chí còn không có mã kiểm thử.

---

## 🌟 Các phần tốt (Tôn trọng những gì xứng đáng)

1. **Các Token Màu có khả năng tiếp cận một cách có chủ đích:** Việc thực thi độ tương phản WCAG 4.5:1 trên cả chế độ sáng (`Giấy lá`) và tối là có thật và đã được xác minh trong các bình luận CSS.
2. **Ưu tiên tiếng Việt:** `vocabulary-vi.md` đảm bảo mọi khái niệm nghiệp vụ ("Bàn thủ thư", "Phiếu mượn", "Đề xuất bổ sung") đều nhất quán trên tất cả 39 màn hình.
3. **Không trang trí thừa thãi:** Không có các hiệu ứng chuyển màu (gradients) không cần thiết, không có hình dạng viên thuốc bo tròn ngẫu nhiên, không có các tiện ích Tailwind chung chung. CSS sử dụng các thuộc tính tùy chỉnh (custom properties) một cách sạch sẽ.
4. **Mục đích một Nguồn Sự thật Duy nhất:** Nỗ lực ánh xạ mọi trạng thái vòng đời của thực thể lên 5 thanh điệu trực quan chung (`waiting`, `active`, `attention`, `done`, `stopped`) là một kiến trúc giao diện người dùng tuyệt vời — ngay cả khi `vi.ts` đang gặp khó khăn để gánh vác tất cả.

---

## 💡 Cách khắc phục Tài liệu & Hệ thống Thiết kế của bạn

1. **Biến các thông số kỹ thuật thành hiện thực (Hoặc cắt bớt thông số kỹ thuật):**
   - Thay thế thẻ `<textarea>` thông thường trong `node-editor.tsx` bằng `@tiptap/react` or thừa nhận trong `design-system.md` rằng đó là một trình soạn thảo Markdown thô.
2. **Di chuyển các Token CSS sang một tệp riêng:**
   - Trích xuất các biến `:root` từ `globals.css` vào `src/app/styles/tokens.css`.
3. **Tổ chức phân cấp thành phần:**
   - Nhóm 51 thành phần trong `src/app/components/` thành `ui/` (các thành phần nguyên thủy như badges, buttons), `domain/` (danh mục, kiểm duyệt, lưu trữ) và `layout/` (vỏ ứng dụng, thanh bên).
4. **Cắt tỉa tài liệu:**
   - Lưu trữ hoặc hợp nhất các tệp tài liệu chỉ có một đoạn văn. Bạn không cần đến 58 tài liệu cho một cơ sở mã nguồn chỉ có 26k dòng code!
