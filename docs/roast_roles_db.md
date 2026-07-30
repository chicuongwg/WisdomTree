# 🔥 Nhận xét Chi tiết về Phân quyền & Thiết kế Cơ sở dữ liệu WisdomTree 🔥

> **Trạng thái:** Đây là baseline review trước migrations 0015–0017. Các nhận xét về
> session không thể thu hồi, admin bypass, thiếu capability/vault grant, thiếu
> maker–checker, foreign-key index và view `intake_items` đã được xử lý. Thiết kế
> hiện hành nằm ở `docs/design/authorization-design.md` và
> `docs/requirements/permissions-matrix.md`; các nhận xét còn lại trong tài liệu
> này là backlog, không phải mô tả chính xác của schema hiện tại.

---

## Phần 1: Hệ thống Phân quyền (Role System)

### Ba Vai trò để Quản lý Tất cả

```
user (người dùng) → editor (biên tập viên) → admin_op (vận hành viên quản trị)
```

Chỉ có vậy. Toàn bộ mô hình phân quyền cho một "nền tảng tri thức" chỉ là **ba chuỗi ký tự trong một ràng buộc CHECK (CHECK constraint)**:

```sql
CHECK (role IN ('user', 'editor', 'admin_op'))
```

Không có bảng vai trò (role table). Không có bảng liên kết vai trò - quyền hạn (role-permission join table). Không có việc gán quyền động. Chỉ là một cột kiểu dữ liệu `text`.

---

### Danh mục Quyền hạn: 35 Quyền được khai báo cứng (Hardcoded Entries)

Hệ thống phân quyền nằm trong tệp [authorize.ts](file:///home/will/dev/WisdomTree/src/modules/auth/authorize.ts) — một hàm duy nhất với một đối tượng hằng số `CATALOG` gồm 35 mục:

```typescript
const CATALOG: Record<string, { roles: Role[]; scope: Scope }> = {
  "storage.intake.open": { roles: ["user", "editor", "admin_op"], scope: "global" },
  "storage.library.browse": { roles: ["user", "editor", "admin_op"], scope: "space" },
  // ... thêm 33 mục nữa
};
```

**Những điểm thiết kế đúng:**
- Mỗi kiểm tra quyền là một cuộc gọi hàm `authorize(actor, key, resource)` duy nhất — không có các đoạn kiểm tra tự viết rải rác trong các trình xử lý tuyến đường (route handlers)
- **96 cuộc gọi authorize()** trên toàn bộ mã nguồn, được sử dụng một cách nhất quán
- 4 loại phạm vi (`global`, `space`, `self`, `owned-or-assigned`) bao quát nghiệp vụ một cách sạch sẽ
- Đọc không có quyền sẽ trả về lỗi 404, ghi không có quyền sẽ trả về lỗi 403 — tránh rò rỉ thông tin về sự tồn tại của dữ liệu giữa các không gian (spaces)

**Những điểm thiết kế chưa đúng:**

| Vấn đề | Chi tiết |
|-------|---------|
| **admin_op là tối cao (God)** | Dòng 107: `if (actor.role === "admin_op") return actor;` — admin_op bỏ qua TẤT CẢ các kiểm tra phạm vi. Bất kể là phạm vi nào: Global, space, self, owned-or-assigned — đều không quan trọng. admin_op có thể làm bất cứ điều gì với bất kỳ ai ở bất kỳ đâu. Không có sự phân chia rõ ràng giữa "vận hành nền tảng", "quản lý thư viện" và "duyệt bài đăng" |
| **Không có vai trò theo không gian** | Một người dùng là `user` ở mọi nơi hoặc là `editor` ở mọi nơi. Bạn không thể vừa là biên tập viên (editor) ở Không gian A vừa là người đọc (user) ở Không gian B. Việc kiểm tra `spaceIds` chỉ là kiểm tra tư cách thành viên (bạn có *ở trong* không gian đó không), chứ không phải là kiểm tra vai trò (bạn có thể *làm gì* trong không gian đó) |
| **Không có sự phân mảnh quyền** | 22 trong số 35 mục cấp quyền cho `["user", "editor", "admin_op"]` — tức là "tất cả mọi người". 8 mục khác cấp cho `["editor", "admin_op"]`. Cột vai trò thực chất chỉ là một cấp độ quyền lực 3 bậc, chứ không phải là một hệ thống phân quyền thực thụ |
| **Không có quyền động** | Thêm một quyền mới đồng nghĩa với việc sửa đổi mã nguồn TypeScript. Không có giao diện quản trị, không có bảng trong cơ sở dữ liệu, không có API. "Danh mục" quyền là một hằng số được viết cứng trong mã nguồn |
| **`owned-or-assigned` dễ lỗi** | Việc kiểm tra phạm vi cho `owned-or-assigned` là `ownerIds?.includes(actor.userId)`. Trình gọi phải tự tay lắp ráp mảng `ownerIds` từ các trường như `created_by`, `submitted_by`, `assigned_to`, v.v. Chỉ cần bỏ sót một trường, quyền truy cập sẽ âm thầm thất bại |

### Mô hình Phạm vi (Scope Model) Trực quan hóa

```
                  ┌─────────────────────────────────────┐
  admin_op ──────▶│ BỎ QUA MỌI KIỂM TRA (dòng 107)      │
                  └─────────────────────────────────────┘
                  
                  ┌─────────────────────────────────────┐
  editor ────────▶│ Có thể làm những gì user làm +     │
                  │   knowledge.branch/node.create/edit │
                  │   storage.corrected/draft.edit      │
                  │ ...nhưng chỉ cho các mục sở hữu     │
                  │    hoặc được giao nhiệm vụ          │
                  └─────────────────────────────────────┘
                  
                  ┌─────────────────────────────────────┐
  user ──────────▶│ Tải lên, duyệt, tải về, tìm kiếm    │
                  │   trong các không gian thành viên   │
                  │ Yêu cầu mượn, tạo bình luận         │
                  │ Quản lý các bài nộp của chính mình  │
                  └─────────────────────────────────────┘
```

Đây không phải là RBAC (Kiểm soát truy cập dựa trên vai trò). Đây cũng không phải là ABAC (Kiểm soát truy cập dựa trên thuộc tính). Đây là *Kiểm soát truy cập dựa trên cấp độ quyền lực (Power-level based access control)*. user = dân thường, editor = sĩ quan, admin_op = tối cao.

---

### Ma trận như một Thiết bị Kiểm thử: Thực sự xuất sắc (Một cách đáng ghét)

Tệp [authz-matrix.test.ts](file:///home/will/dev/WisdomTree/scripts/authz-matrix.test.ts) là một trong những mô hình xác thực quyền truy cập thú vị nhất mà tôi từng thấy:

1. Nó **phân tích tài liệu markdown** (`permissions-matrix.md` + `authorization-design.md`) tại thời điểm chạy
2. Nó **ánh xạ từng hàng của ma trận** vào logic triển khai thực tế của hàm `authorize()`
3. Bất kỳ ô nào chưa xác định, hàng nào chưa được ánh xạ, hoặc khóa triển khai thực tế nào chưa được ghi chép trong tài liệu **sẽ làm kiểm thử thất bại**
4. Một danh sách cho phép (allowlist) đi kèm lý do bắt buộc sẽ giải thích cho mọi trường hợp bỏ qua

Điều này có nghĩa là **tài liệu và mã nguồn không thể lệch pha nhau một cách âm thầm**. Nếu ai đó thêm một quyền vào mã nguồn mà không cập nhật tài liệu, kiểm thử sẽ thất bại. Nếu ai đó thêm một hàng vào ma trận trong tài liệu mà không triển khai trong mã nguồn, kiểm thử sẽ thất bại.

> Trớ trêu thay: chính bộ kiểm thử dùng để đồng bộ hóa tài liệu và mã nguồn này lại là một đoạn kịch bản độc lập chạy không cần framework kiểm thử. Chỉ đơn giản là `throw new Error("DRIFT")`.

---

### Hệ thống Phiên làm việc (Session System)

Tệp [session.ts](file:///home/will/dev/WisdomTree/src/modules/auth/session.ts) xác định danh tính thực thể trên **mỗi yêu cầu (request)** bằng cách:

1. Đọc cookie → Xác thực HMAC → trích xuất userId
2. `SELECT * FROM users WHERE id = $1 AND disabled_at IS NULL` 
3. `SELECT space_id FROM space_members WHERE user_id = $1`

**Thực hiện hai truy vấn cơ sở dữ liệu cho mỗi yêu cầu**, không có bộ đệm (cache), không có bảng lưu trữ phiên làm việc (session table).

Tệp [sign.ts](file:///home/will/dev/WisdomTree/src/lib/sign.ts) là phần triển khai mã thông báo phiên (session token):
- Dữ liệu tải trọng (payload) được ký HMAC-SHA256: `session.<expiry>.<userId>`
- Thời gian sống (TTL) 7 ngày
- Được gắn thẻ mục đích rõ ràng để tránh sử dụng chéo (giữa phiên làm việc so với tải xuống so với trạng thái OAuth)
- Sử dụng `timingSafeEqual` để so sánh an toàn ✅
- Cơ chế phân giải khóa bí mật lười (lazy secret resolution) để khi build ứng dụng không cần các biến bí mật ✅

**Nhưng:** hoàn toàn **không có cơ chế thu hồi phiên làm việc (session revocation)**. Bạn có thể vô hiệu hóa một người dùng, và họ sẽ bị chặn ở lượt truy vấn DB tiếp theo, nhưng bạn không thể thu hồi một phiên làm việc cụ thể. Bản thân mã thông báo không có định danh id, không có jti, không có bản ghi nào lưu ở phía máy chủ. Nếu một phiên làm việc bị rò rỉ, bạn chỉ có thể đợi 7 ngày hoặc thay đổi `SESSION_SECRET` cho tất cả mọi người.

---

## Phần 2: Thiết kế Cơ sở dữ liệu (Database Design)

### Bức tranh Toàn cảnh: 25 Bảng, 11 Bản di chuyển dữ liệu (Migrations)

```
auth         ─── users
storage      ─── spaces, space_members, folders, sources, source_versions,
                  text_chunks, corrected_texts, curations, markdown_drafts,
                  branch_gap_requests
knowledge    ─── branches, tree_nodes, tree_node_versions, node_links,
                  tags, node_tags, promotions, review_tasks, conflicts
catalog      ─── catalog_items
circulation  ─── loan_tickets
pm           ─── deadlines, deadline_links, deadline_reminders, tasks,
                  achievements, calendar_tokens
notify       ─── notifications, notification_deliveries,
                  notification_preferences, comments, presence
audit        ─── audit_events
bridge       ─── bridge_imports, bridge_import_items
export       ─── export_jobs
cross-cutting ── outbox_events, jobs
```

Đối với một phiên bản v0.1.0, việc có **hơn 30 bảng** là điều đáng nể. Đó không phải là một dự án thử nghiệm (demo), đó là một buổi bảo vệ luận án tiến sĩ.

---

### 🔥 Điểm tốt (Và Chưa tốt)

#### Điểm tốt

| Mô hình | Ở đâu | Đánh giá |
|---------|-------|---------|
| **Triggers chỉ cho phép chèn (Append-only)** | `text_chunks`, `audit_events`, `comments`, `tree_node_versions`, `promotions` | Trigger `forbid_mutation()` ngăn chặn hoàn toàn thao tác UPDATE/DELETE. Không thể sửa đổi bằng chứng lịch sử. Cực kỳ an toàn |
| **Chỉ mục duy nhất một phần (Partial unique indexes)** | `loan_tickets_one_active_per_item` (khi trạng thái nằm trong danh sách đang hoạt động), `spaces_one_personal_per_owner`, `folder_name_at_root` | Ràng buộc nghiệp vụ được thực thi từ tầng cơ sở dữ liệu chứ không chỉ dựa trên hy vọng ở tầng ứng dụng. Ràng buộc về mượn sách rất thanh lịch |
| **Cột tsvector được tạo tự động** | `text_chunks.tsv`, `tree_nodes.tsv` | Tính năng tìm kiếm toàn văn (full-text search) được tích hợp sẵn trong lược đồ với hàm bao bọc `immutable_unaccent()` cho các dấu tiếng Việt. Việc bọc unaccent thành IMMUTABLE là giải pháp khắc phục chính xác |
| **Cột phiên bản cho OCC** | 16 bảng chứa cột `version int NOT NULL DEFAULT 1` | Kiểm soát đồng thời lạc quan (Optimistic Concurrency Control) — dịch vụ kiểm duyệt kiểm tra `WHERE version = expected` trước khi ghi dữ liệu. Đây là cách bạn tránh mất mát dữ liệu do cập nhật đè mà không cần khóa bi quan |
| **Kỷ luật Khóa ngoại (Foreign Key)** | Mọi cột tham chiếu đều có ràng buộc FK | Không có dữ liệu mồ côi. Mỗi `created_by`, `submitted_by`, `approved_by`, `assigned_to` đều trỏ ngược về `users(id)`. Hành vi `ON DELETE` *không* phải là cascade (chính xác — bạn không muốn xóa người dùng rồi làm biến mất toàn bộ lịch sử kiểm toán) |
| **Kiểm toán dạng Giao dịch (Transactional audit)** | 67 lệnh gọi `recordAudit()`, luôn nằm trong `db.transaction()` | Bản ghi kiểm toán và thao tác thay đổi dữ liệu là nguyên tử (atomic). Nếu thao tác thay đổi thất bại, không có bản ghi kiểm toán ma nào được tạo. Nếu việc kiểm toán thất bại, thao tác thay đổi sẽ bị khôi phục lại. Đây là chuẩn sách giáo khoa |
| **Mô hình Outbox** | `outbox_events` được ghi trong cùng một giao dịch (transaction) with thao tác thay đổi dữ liệu | Hoàn toàn là mô hình chính xác cho các tác dụng phụ nhất quán sau cùng (eventually-consistent side effects). Mô hình outbox đảm bảo việc phân phát sự kiện ít nhất một lần (at-least-once) mà không cần giao dịch phân tán |
| **Khóa Idempotency cho các công việc (Jobs)** | `jobs.idempotency_key UNIQUE` | `extract:{source_version_id}` — gửi lại một công việc trùng lặp sẽ là thao tác không có tác dụng (no-op), không sinh ra công việc mới. Chính xác |

#### Điểm chưa tốt

| Vấn đề | Chi tiết |
|-------|---------|
| **Không có bảo mật cấp hàng (Row-level security)** | Mọi việc phân quyền đều diễn ra ở tầng ứng dụng. Một kết nối trực tiếp đến DB (như Drizzle Studio hoặc một tệp di chuyển dữ liệu độc hại) có thể nhìn thấy tất cả mọi thứ. Đối với một "nền tảng tri thức ưu tiên lưu trữ" xử lý các tài liệu tải lên, đây là một lỗ hổng đáng kể |
| **Sử dụng `text` cho mọi enum** | Mọi cột trạng thái/kiểu dữ liệu đều là `text NOT NULL CHECK (...)`. Không hề có `CREATE TYPE` ở bất kỳ đâu. Enum của Postgres giúp bạn đảm bảo an toàn ở tầng lược đồ VÀ tối ưu hóa dung lượng lưu trữ. Sử dụng ràng buộc CHECK trên cột `text` rất dễ gãy — mỗi lần di chuyển dữ liệu có thêm trạng thái mới đều phải `DROP CONSTRAINT` rồi `ADD CONSTRAINT` (xem tệp di chuyển 0002 để thấy chính xác điều này) |
| **`jsonb` ở khắp nơi, không được định kiểu** | `extraction_meta jsonb`, `payload jsonb`, `config jsonb`, `details jsonb`, `manifest jsonb`, `resolution jsonb`, `attempted_payload jsonb` — **7 cột JSON không được định kiểu** trong toàn lược đồ. Không có ràng buộc CHECK nào về nội dung của chúng. Lược đồ Drizzle khai báo `jsonb()` rồi phó mặc cho số phận. Tầng ứng dụng có thể đẩy bất kỳ nội dung nào vào đó |
| **Không có chỉ mục (indexes) trên các khóa ngoại** | `sources.assigned_to`, `curations.assigned_to`, `loan_tickets.borrower_id`, `review_tasks.assigned_to` — không có cột nào được lập chỉ mục. Truy vấn "Hiển thị công việc được giao cho tôi" sẽ phải quét tuần tự (sequential scan) trên mọi bảng |
| **VIEW `intake_items` bị bỏ hoang** | Được tạo trong bản di chuyển 0000, chưa bao giờ được ánh xạ trong lược đồ Drizzle, phần bình luận ghi rõ "không còn ánh xạ: mySubmissions lấy các hàng trong TS từ các bảng cơ sở." Như vậy có một view trong cơ sở dữ liệu không làm gì cả, và ứng dụng tự thực hiện phép UNION trong TypeScript. Thật tuyệt vời |
| **Không nhất quán trong xóa mềm (soft-delete)** | `users.disabled_at`, `spaces.archived_at`, `catalog_items.archived_at`, `branches.archived_at` — bốn bảng khác nhau sử dụng bốn tên cột khác nhau cho cùng một khái niệm. Một số bảng dùng `disabled`, một số dùng `archived`. Không có bảng nào có mô hình nhất quán để loại trừ các hàng đã xóa mềm khỏi các truy vấn |
| **Khóa chính `uuid` ở mọi nơi** | Mọi bảng đều sử dụng `uuid PRIMARY KEY DEFAULT gen_random_uuid()`. Đối với một bảng như `audit_events` vốn chỉ ghi chèn thêm và được truy vấn theo khoảng thời gian, một khóa tự tăng `bigint` (được sử dụng chính xác!) sẽ tốt hơn — nhưng sau đó `notifications`, `comments` và `jobs` cũng nên tuân theo mô hình này. Sự chia rẽ giữa UUID và khóa tự tăng mang lại cảm giác ngẫu nhiên, không được thiết kế có tính toán |
| **Theo dõi khoảng lệch cho `deadline_reminders`** | Khóa chính `PRIMARY KEY (deadline_id, "offset")` trong đó `"offset"` là kiểu dữ liệu `interval`. So sánh các kiểu `interval` để tìm sự bằng nhau trong một khóa chính là tự tìm rắc rối — liệu `'7 days'` có bằng với `'168 hours'`? (Trong Postgres thì có, nhưng chỉ vì nó có chuẩn hóa. Còn `'1 month'` so với `'30 days'`? Câu trả lời là không.) |

#### Điểm xấu

**Truy vấn kép của `session.ts` trên mỗi yêu cầu:**

```typescript
// Truy vấn 1: Lấy thông tin người dùng
const [user] = await db.select().from(users)
  .where(and(eq(users.id, userId), isNull(users.disabledAt)));

// Truy vấn 2: Lấy thông tin thành viên không gian của họ
const memberships = await db.select({ spaceId: spaceMembers.spaceId })
  .from(spaceMembers).where(eq(spaceMembers.userId, user.id));
```

Sau đó hàm `currentUser()` thực hiện truy vấn thứ **ba** — `SELECT * FROM users WHERE id = principal.userId` — để lấy toàn bộ bản ghi người dùng. Như vậy, mỗi lượt tải trang có xác thực sẽ tốn **3 truy vấn SQL** trước khi bất kỳ logic nghiệp vụ nào được thực hiện. Một phép JOIN duy nhất là đủ giải quyết vấn đề.

**16 cột phiên bản, nhưng OCC chỉ được sử dụng ở khoảng 4 nơi:**

Lược đồ cơ sở dữ liệu đặt cột `version int NOT NULL DEFAULT 1` trên 16 bảng. Nhưng việc khóa lạc quan thực tế (`WHERE version = expected`) chỉ xuất hiện ở:
- `curations` (giao việc, đánh dấu sẵn sàng, từ chối)
- `markdown_drafts` (lưu)
- Và hầu như chỉ có vậy.

12 bảng còn lại có cột này nhưng không có logic nào kiểm tra nó. Đó là một lời hứa thiết kế mà phần triển khai không thực hiện.

---

### Mô hình Trách nhiệm giải trình (Accountability Model)

Cột `audit_events.accountability` là một trong những lựa chọn thiết kế thú vị nhất:

```sql
CHECK (accountability IN ('uploader', 'editor_updater', 'approver_publisher', 'operator', 'member'))
```

Đây **không phải** là vai trò của người thực hiện — mà là *họ đang đóng vai trò nào khi thực hiện hành động*. Một `admin_op` hành động như một thủ thư sẽ mang danh nghĩa `operator`. Một `user` tải lên tài liệu sẽ mang danh nghĩa `uploader`. Một `user` bình luận sẽ mang danh nghĩa `member`. Cùng một người có thể xuất hiện với các vai trò giải trình khác nhau trong các hàng khác nhau.

Điều này thực sự rất thông minh. Nó tách biệt "ai đã làm việc đó" khỏi "họ đã làm việc đó với tư cách gì." Hầu hết các hệ thống kiểm toán chỉ ghi lại vai trò chung rồi bỏ qua.

---

### Chiến lược Di chuyển Lược đồ (Schema Migration Strategy)

```
0000_init.sql             — 261 dòng, tập hợp con của demo
0001_v1_schema_parity.sql — 363 dòng, lược đồ V1 đầy đủ
0002_comments_drop_loan_anchor.sql — thay đổi quy tắc nghiệp vụ
0003_folders_versions.sql — bảng mới + ALTER
0004_user_profile.sql     — thêm cột avatar_key
0005_task_schedule.sql    — thêm due_at/start_at trên bảng tasks
0006_task_detail.sql      — thêm cột notes trên bảng tasks
0007_catalog_copies.sql   — thêm cột copies + lưu trữ
0008_presence.sql         — ai đang trực tuyến
0009_catalog_archive.sql  — thêm archived_at trên bảng catalog
0010_knowledge_scope.sql  — các nhánh cá nhân so với nhánh nhóm
```

**Điểm tốt:** Di chuyển tuần tự, viết tay bằng SQL, chỉ tiến về phía trước. Các bình luận giải thích rõ *tại sao* thay đổi được thực hiện chứ không chỉ ghi lại thay đổi đó là gì. Bản di chuyển 0002 thậm chí còn giải thích lý do tại sao nó tạm thời vô hiệu hóa trigger append-only rồi kích hoạt lại.

**Điểm... đáng lưu ý:** Chúng ta đã ở bản di chuyển thứ 11 (0010) cho một phiên bản demo v0.1.0. Tức là có tới 11 lượt di chuyển dữ liệu trước cả khi phát hành phiên bản đầu tiên. Lược đồ vẫn đang trong quá trình thiết kế tích cực — từ bản di chuyển 0004 đến 0010 đều là các bổ sung kiểu "ồ chúng ta cần thêm cột này". Đây là việc theo dõi lịch sử thay đổi của lược đồ tiền v1 như thể nó đã là lịch sử di chuyển trên môi trường sản xuất thực tế.

---

## Phán quyết Cuối cùng về Vai trò + Cơ sở dữ liệu

### Hệ thống Vai trò

Một hệ thống cấp độ quyền lực 3 bậc phẳng hoạt động *hoàn hảo* cho một nhóm phát triển gồm ≤10 người vận hành một nền tảng quản lý tri thức tiếng Việt — và đây chính xác là những gì dự án này hướng tới. Danh mục quyền hạn, mô hình phạm vi và cách tiếp cận ma trận dưới dạng thiết bị kiểm thử đều được suy nghĩ rất kỹ lưỡng.

Nhưng gọi nó là "phân quyền" (authorization) thì hơi quá lời. Không có quyền hạn nào bạn có thể cấp hoặc thu hồi mà không cần triển khai lại mã nguồn (deploy). Không có khái niệm về ủy quyền. `admin_op` là một siêu người dùng không chịu bất kỳ ràng buộc phân tách nào. Ngay khi nhóm phát triển lớn hơn quy mô "mọi người đều biết nhau," mô hình này sẽ đổ vỡ.

### Cơ sở dữ liệu

Lược đồ cơ sở dữ liệu đọc lên mang lại cảm giác của một người thực sự hiểu về mô hình hóa quan hệ và có những quan điểm nghiêm túc về tính toàn vẹn dữ liệu. Các trigger append-only, chỉ mục duy nhất một phần, các cột tsvector được tạo tự động, các giao dịch kiểm toán ghi đồng thời, các cột phiên bản OCC, các khóa idempotency — đây đều là những mô hình rút ra từ việc xây dựng các hệ thống từng thất bại khi thiếu chúng.

Nhưng nó cũng là hơn 30 bảng cho một bản demo 0.1.0, 7 cột JSON không định kiểu, 16 cột phiên bản OCC chủ yếu để trang trí, các enum dựa trên văn bản đòi hỏi phải phẫu thuật lược đồ để mở rộng, và một hệ thống phiên làm việc truy vấn cơ sở dữ liệu tới 3 lần trước khi trang web có thể hiển thị.

> **Tóm tắt: Cơ sở dữ liệu này được thiết kế bởi một người đã đọc rất nhiều sách. Hệ thống vai trò được thiết kế bởi một người hiểu rõ đội ngũ của họ. Không có hệ thống nào được thiết kế bởi một người mong đợi ứng dụng có nhiều hơn 10 người dùng.**
