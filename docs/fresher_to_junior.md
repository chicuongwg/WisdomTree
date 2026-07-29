# 🔥 Từ Fresher lên Junior: Hướng dẫn Nâng cấp bản thân 🔥

> *"Bạn đã xây dựng một hệ thống mà hầu hết các fresher thậm chí không dám thử. Bây giờ, hãy biến nó thành một hệ thống mà một lập trình viên junior không cảm thấy ngượng ngùng khi đưa ra trong một buổi code review."*

---

## Nhận xét về Fresher (Với sự yêu thương)

Dưới đây là những điều cho thấy "Tôi đang vừa học vừa làm một thứ gì đó quá tham vọng và tôi thích nó":

| Dấu hiệu Fresher | Bằng chứng |
|-------------|----------|
| **Không linter, không formatter** | Bạn đang tin tưởng vào đôi mắt của mình để bắt các lỗi mà máy móc có thể phát hiện chỉ trong 0.01 giây |
| **Không có cơ chế bắt lỗi (Error boundaries)** | Khi một cái gì đó bị hỏng, người dùng nhìn thấy... không gì cả |
| **3 khung kiểm thử (testing frameworks), nhưng không dùng** | Bạn thiết lập Vitest, trình chạy tùy chỉnh, VÀ các script độc lập. Nhưng tổng cộng chỉ viết 226 dòng kiểm thử |
| **Các tệp tin kiểu Chúa (God files)** | `vi.ts` (1.354 dòng), `knowledge-map.tsx` (1.081 dòng), `globals.css` (2.746 dòng). Những tệp này như muốn nói: "Tôi cứ thêm code vào tệp đó vì tôi không biết khi nào nên dừng lại" |
| **Sử dụng `console.log` làm chiến lược ghi nhật ký** | 14 câu lệnh console là toàn bộ chiến lược quan sát (observability) của bạn |
| **Không có middleware** | Mọi tuyến đường (route) đều không được bảo vệ ở cấp độ framework |
| **Trình chạy kiểm thử tự viết** | Bạn đã viết một tệp đi bộ tìm thư mục dài 43 dòng để chạy các bài kiểm thử thay vì sử dụng công cụ đã cài đặt sẵn |

**Nhưng đây là những điểm KHÔNG phải của một fresher thông thường:**
- Ranh giới mô-đun của bạn rất sạch sẽ và có chủ đích
- Các tệp di chuyển SQL (migrations) của bạn được viết bằng tay đi kèm lý do rõ ràng
- Bạn sử dụng các giao dịch (transactions) một cách nhất quán
- Cơ chế phân quyền của bạn được tập trung hóa chứ không phải sao chép-dán
- Bạn có các lỗi miền (domain errors) được định kiểu rõ ràng, không phải ném ra các chuỗi ký tự thô
- Bạn viết các bình luận để giải thích *tại sao*, không phải giải thích *cái gì*

**Bạn là một fresher suy nghĩ như một kiến trúc sư nhưng lại triển khai như một người chưa từng bị nếm mùi thất bại thực tế.** Lộ trình nâng cấp là học cách đối mặt với thất bại một cách *an toàn*.

---

## Ưu tiên 1: Lưới an toàn (Làm việc này đầu tiên)

Đây là những thứ giúp phát hiện lỗi của bạn trước khi người dùng phát hiện ra chúng. Kỹ năng số 1 của một lập trình viên junior là **không tự tin quá mức vào bản thân**.

---

### 1A. Thêm ESLint + Prettier

**Tại sao việc này quan trọng:** Bạn có 82 tệp nguồn mà hoàn toàn không có cơ chế tự động thực thi phong cách viết mã. Mỗi tệp bạn chỉnh sửa sẽ dần lệch chuẩn. Một công cụ linter sẽ phát hiện các lỗi thực tế (biến không sử dụng, thiếu await, mã không bao giờ đạt tới).

Tạo các tệp sau:

**`eslint.config.mjs`** (cấu hình phẳng - flat config, cho ESLint 9+):

```javascript
import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import nextPlugin from "@next/eslint-plugin-next";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { project: "./tsconfig.json" },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "@next/next": nextPlugin,
    },
    rules: {
      // Các quy tắc giúp phát hiện lỗi THỰC TẾ:
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-floating-promises": "error",  // ← phát hiện việc thiếu await
      "no-console": ["warn", { allow: ["warn", "error"] }], // ← không để sót console.log bừa bãi
      "eqeqeq": "error",                                     // ← không để xảy ra bất ngờ với so sánh ==
    },
  },
];
```

**`.prettierrc`**:

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

**Thêm vào mục scripts trong `package.json`:**

```json
"lint": "eslint src/",
"format": "prettier --write src/",
"format:check": "prettier --check src/"
```

**Thêm vào chuỗi lệnh chạy `test` của bạn:**

```json
"test": "npm run lint && npm run typecheck && npm run test:boundaries && ..."
```

> **Nguyên tắc của Junior: Nếu máy móc có thể kiểm tra được, hãy để máy móc kiểm tra.**

---

### 1B. Thêm các cơ chế bắt lỗi (Error Boundaries)

**Tình trạng hiện tại của bạn:** Không có tệp `error.tsx` nào, không có tệp `loading.tsx` nào. Chỉ có duy nhất một tệp `global-error.tsx` ở gốc ứng dụng. Khi bất kỳ thành phần trang nào gặp lỗi, toàn bộ ứng dụng sẽ đổ vỡ về trang lỗi chung.

**Những gì một junior thực hiện:** Thêm một cơ chế bắt lỗi ở cấp độ tuyến đường (route-level error boundary) cho mỗi khu vực chính.

Tạo tệp **`src/app/library/error.tsx`** (và lặp lại cho mỗi nhóm tuyến đường tương tự):

```tsx
"use client";

import { T } from "@/lib/vi";

export default function LibraryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="page">
      <h1>{T.errorTitle}</h1>
      <p>{T.errorDescription}</p>
      <button onClick={reset} className="btn">
        {T.retry}
      </button>
    </main>
  );
}
```

Tạo tệp **`src/app/library/loading.tsx`**:

```tsx
export default function LibraryLoading() {
  return (
    <main className="page">
      <div className="skeleton" style={{ height: "2rem", width: "12rem" }} />
      <div className="skeleton" style={{ height: "20rem", marginTop: "1rem" }} />
    </main>
  );
}
```

**Các mục tiêu tối thiểu:** `library/`, `catalog/`, `source/`, `board/`, `admin/`. 5 thư mục × 2 tệp = 10 tệp, khoảng 15 phút làm việc, nhưng cải thiện trải nghiệm người dùng rất lớn.

> **Nguyên tắc của Junior: Người dùng không bao giờ được nhìn thấy màn hình trắng trơn.**

---

### 1C. Thêm Next.js Middleware

**Tình trạng hiện tại của bạn:** Không có `middleware.ts`. Mỗi API route phải tự gọi hàm `requirePrincipal()`. Chỉ cần quên ở một nơi, đó sẽ trở thành một điểm cuối (endpoint) không được bảo vệ.

Tạo tệp **`src/middleware.ts`**:

```typescript
import { NextResponse, type NextRequest } from "next/server";

// Bảo vệ tất cả ngoại trừ các đường dẫn công khai. Đây là CỔNG CẢN, không phải phân quyền thực tế —
// nó chỉ kiểm tra "cookie phiên làm việc có tồn tại hay không?" Việc gọi hàm authorize() thực sự
// vẫn diễn ra bên trong trình xử lý tuyến đường (route handler).
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/",
  "/api/health",
  "/api/cron/",
  "_next/",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Cho phép các đường dẫn công khai đi qua
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Kiểm tra sự tồn tại của cookie phiên làm việc (không kiểm tra tính hợp lệ — việc đó của session.ts)
  const session = request.cookies.get("session");
  if (!session && pathname.startsWith("/api/")) {
    return NextResponse.json({ code: "unauthorized", message: "Bạn cần đăng nhập." }, { status: 401 });
  }
  if (!session && !pathname.startsWith("/api/")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Bỏ qua các tệp tĩnh và hình ảnh
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

> **Nguyên tắc của Junior: Phòng thủ theo chiều sâu. Đừng tin vào việc nhà phát triển nào cũng nhớ thêm bước kiểm tra xác thực ở mỗi tuyến đường.**

---

## Ưu tiên 2: Khắc phục lỗi Truy vấn kép của Phiên làm việc

**Tình trạng hiện tại của bạn** trong `session.ts`:

```typescript
// Truy vấn 1: Lấy user
const [user] = await db.select().from(users).where(...);
// Truy vấn 2: Lấy thông tin không gian thành viên
const memberships = await db.select({ spaceId: ... }).from(spaceMembers).where(...);
```

Sau đó hàm `currentUser()` lại thực hiện truy vấn thứ **ba** để lấy thông tin đầy đủ của user. Điều này làm tốn 3 lượt truy vấn khứ hồi đến DB trước khi trang web có thể bắt đầu tải.

**Khắc phục:** Thực hiện một truy vấn duy nhất có phép JOIN:

```typescript
export async function resolvePrincipal(): Promise<Principal | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const userId = verifySession(token);
  if (!userId) return null;

  // MỘT truy vấn duy nhất, không phải hai
  const rows = await db
    .select({
      id: users.id,
      role: users.role,
      spaceId: spaceMembers.spaceId,
    })
    .from(users)
    .leftJoin(spaceMembers, eq(spaceMembers.userId, users.id))
    .where(and(eq(users.id, userId), isNull(users.disabledAt)));

  if (rows.length === 0) return null;

  return {
    userId: rows[0].id,
    role: rows[0].role,
    spaceIds: rows.filter((r) => r.spaceId !== null).map((r) => r.spaceId!),
  };
}
```

Kết hợp với hàm `currentUser()` tương tự — tránh việc SELECT bảng users hai lần liên tiếp.

> **Nguyên tắc của Junior: Truy vấn N+1 là sai lầm phổ biến nhất về mặt hiệu năng. HÃY ĐẾM SỐ TRUY VẤN CỦA BẠN.**

---

## Ưu tiên 3: Viết các bài kiểm thử thực sự

**Tình trạng hiện tại của bạn:** Bạn đã cài đặt Vitest. Bạn đã cấu hình nó. Sau đó bạn viết 226 dòng mã gần giống như kiểm thử cùng một trình chạy tùy chỉnh dài 43 dòng thực hiện `await import(file)`.

**Cách tiếp cận của junior:** Xóa trình chạy tùy chỉnh đó đi. Sử dụng Vitest. Viết các bài kiểm thử để kiểm tra DUY NHẤT một thứ tại một thời điểm.

### 3A. Kiểm thử Đơn vị: authorize()

Tạo tệp **`tests/vitest/authorize.test.ts`**:

```typescript
import { describe, it, expect } from "vitest";
import { authorize } from "@/modules/auth/authorize";
import type { Principal } from "@/modules/auth/dev-auth";

const user: Principal = {
  userId: "u1",
  role: "user",
  spaceIds: ["space-a"],
};

const editor: Principal = {
  userId: "u2",
  role: "editor",
  spaceIds: ["space-a"],
};

const admin: Principal = {
  userId: "u3",
  role: "admin_op",
  spaceIds: [],
};

describe("authorize", () => {
  it("allows a user to browse their own space", () => {
    expect(() =>
      authorize(user, "storage.library.browse", { spaceId: "space-a", kind: "read" })
    ).not.toThrow();
  });

  it("denies a user browsing another space (404 for reads)", () => {
    expect(() =>
      authorize(user, "storage.library.browse", { spaceId: "space-b", kind: "read" })
    ).toThrow(expect.objectContaining({ status: 404 }));
  });

  it("denies a user publishing (403 for writes)", () => {
    expect(() =>
      authorize(user, "knowledge.publish", { kind: "write" })
    ).toThrow(expect.objectContaining({ status: 403 }));
  });

  it("admin_op bypasses space scope", () => {
    expect(() =>
      authorize(admin, "storage.library.browse", { spaceId: "any-space", kind: "read" })
    ).not.toThrow();
  });

  it("rejects null actors with 401", () => {
    expect(() =>
      authorize(null, "storage.library.browse", { spaceId: "space-a", kind: "read" })
    ).toThrow(expect.objectContaining({ status: 401 }));
  });

  it("editor can edit owned items", () => {
    expect(() =>
      authorize(editor, "knowledge.node.edit", {
        kind: "write",
        ownerIds: [editor.userId],
      })
    ).not.toThrow();
  });

  it("editor cannot edit unrelated items", () => {
    expect(() =>
      authorize(editor, "knowledge.node.edit", {
        kind: "write",
        ownerIds: ["someone-else"],
      })
    ).toThrow(expect.objectContaining({ status: 403 }));
  });
});
```

### 3B. Kiểm thử Đơn vị: sign.ts

Tạo tệp **`tests/vitest/sign.test.ts`**:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { signSession, verifySession, signDownload, verifyDownload } from "@/lib/sign";

describe("session tokens", () => {
  it("round-trips a user id", () => {
    const token = signSession("user-123");
    expect(verifySession(token)).toBe("user-123");
  });

  it("rejects a tampered token", () => {
    const token = signSession("user-123");
    const tampered = token.slice(0, -1) + "X";
    expect(verifySession(tampered)).toBeNull();
  });

  it("rejects an expired token", () => {
    vi.useFakeTimers();
    const token = signSession("user-123");
    vi.advanceTimersByTime(8 * 24 * 60 * 60 * 1000); // 8 ngày > thời gian sống 7 ngày
    expect(verifySession(token)).toBeNull();
    vi.useRealTimers();
  });

  it("download token cannot be used as session", () => {
    const token = signDownload("obj/key", "file.pdf");
    expect(verifySession(token)).toBeNull();
  });
});

describe("download tokens", () => {
  it("round-trips object key and filename", () => {
    const token = signDownload("obj/key", "file.pdf");
    const result = verifyDownload(token);
    expect(result).toEqual({ objectKey: "obj/key", filename: "file.pdf" });
  });
});
```

### 3C. Cấu hình kiểm thử

Cập nhật **`vitest.config.ts`** để bao gồm các tệp này:

```typescript
test: {
  include: ['tests/vitest/**/*.test.ts'],
  // ...
},
```

Sau đó **thay thế** kịch bản `"test:vitest"` bằng lệnh chạy kiểm thử thực tế trong `package.json` và thêm nó vào kịch bản chạy `test` chính.

**Thứ tự ưu tiên viết kiểm thử (từ cao xuống thấp):**
1. `authorize()` — hàm thuần túy (pure function), không kết nối DB, giá trị bảo đảm cao
2. `sign.ts` — mã hóa mật mã thuần túy, dễ viết kiểm thử, quan trọng về bảo mật
3. logic ánh xạ lỗi trong `errors.ts` `handleApi()`
4. `time.ts` — các hàm định dạng ngày tháng
5. Các hàm ánh xạ nhãn trong `vi.ts` — ánh xạ chuỗi ký tự thuần túy

> **Nguyên tắc của Junior: Kiểm thử các hàm thuần túy trước. Chúng vừa dễ nhất vừa đem lại nhiều giá trị nhất.**

---

## Ưu tiên 4: Chia nhỏ các Tệp tin kiểu Chúa (God Files)

### 4A. Chia tách `vi.ts` (1.354 dòng)

Tệp dịch thuật của bạn đang làm 5 nhiệm vụ khác nhau. Hãy chia nó ra:

```
src/lib/vi/
├── index.ts          ← xuất khẩu (re-export) lại mọi thứ (hoàn toàn không làm gãy code cũ)
├── labels.ts         ← đối tượng T: chứa các chuỗi giao diện tĩnh
├── state-labels.ts   ← các hàm loanLabel(), curationLabel(), v.v.
├── badges.ts         ← các hàm badgeClass(), ánh xạ trạng thái sang CSS
├── dates.ts          ← các hàm when(), dayLabel(), định dạng lịch
└── roles.ts          ← các hàm userRoleLabel(), mô tả vai trò
```

**Mẹo viết tệp `index.ts`:**

```typescript
// src/lib/vi/index.ts
export * from "./labels";
export * from "./state-labels";
export * from "./badges";
export * from "./dates";
export * from "./roles";
```

Mọi dòng nhập mã nguồn `from "@/lib/vi"` hiện có vẫn hoạt động bình thường mà không cần sửa đổi gì. Hoàn toàn không gây lỗi tương thích ngược.

### 4B. Chia tách `globals.css` (2.746 dòng)

Sử dụng tính năng `@import` của CSS (được Next.js hỗ trợ):

```
src/app/styles/
├── globals.css       ← chỉ chứa các dòng khai báo @import
├── tokens.css        ← chứa các biến :root, bảng màu
├── reset.css         ← thiết lập mặc định *, box-sizing, typography cơ bản
├── layout.css        ← các lớp .shell, .main-area, .topbar, .statusbar
├── components.css    ← các lớp .btn, .panel, .badge, .field, các phần tử form
├── pages.css         ← các lớp ghi đè riêng cho từng trang
└── dark.css          ← khối khai báo [data-theme="dark"]
```

**Tệp `globals.css` mới sẽ trở thành:**

```css
@import "./styles/tokens.css";
@import "./styles/reset.css";
@import "./styles/layout.css";
@import "./styles/components.css";
@import "./styles/pages.css";
@import "./styles/dark.css";
```

### 4C. Chia tách `knowledge-map.tsx` (1.081 dòng)

Đây là một thành phần kết xuất biểu đồ định hướng lực lượng dựa trên canvas. Nó nên được tổ chức thành:

```
src/app/components/knowledge-map/
├── index.tsx            ← thành phần chính, dài ít hơn 200 dòng
├── use-graph-sim.ts     ← custom hook xử lý mô phỏng lực lượng
├── canvas-renderer.ts   ← logic vẽ trên canvas
├── types.ts             ← định nghĩa các kiểu GraphNode, GraphEdge, SimulationConfig
├── interaction.ts       ← trình xử lý phóng to, thu nhỏ, kéo thả, nhấp chuột
└── minimap.tsx           ← thành phần bản đồ nhỏ (minimap)
```

> **Nguyên tắc của Junior: Nếu bạn không thể mô tả công việc của một tệp trong MỘT câu, nó đang làm quá nhiều thứ.**

---

## Ưu tiên 5: Định kiểu cho các Cột dữ liệu JSON

**Tình trạng hiện tại của bạn:** 7 cột kiểu `jsonb` nơi cơ sở dữ liệu chấp nhận bất kỳ cấu trúc nào và tầng ứng dụng chỉ hy vọng dữ liệu gửi lên đúng định dạng.

**Khắc phục bằng thư viện [Zod](https://zod.dev):**

```typescript
// src/modules/storage/extraction-meta.ts
import { z } from "zod";

export const ExtractionMetaSchema = z.object({
  pageCount: z.number().int().nonneg().optional(),
  language: z.string().optional(),
  extractorVersion: z.string(),
  completedAt: z.string().datetime(),
});

export type ExtractionMeta = z.infer<typeof ExtractionMetaSchema>;

// Khi ghi dữ liệu:
const meta: ExtractionMeta = { extractorVersion: "1.0", completedAt: new Date().toISOString() };
await tx.update(sourceVersions).set({ extractionMeta: meta }).where(...);

// Khi đọc dữ liệu:
const parsed = ExtractionMetaSchema.safeParse(row.extractionMeta);
if (!parsed.success) {
  console.error("Corrupt extraction_meta:", parsed.error);
  return null;
}
```

Hãy thực hiện điều này cho các cột:
- `extraction_meta` → `ExtractionMetaSchema`
- `audit_events.details` → lược đồ chi tiết riêng cho mỗi hành động
- `notifications.payload` → lược đồ tải trọng riêng cho mỗi loại sự kiện
- `jobs.payload` → lược đồ tải trọng riêng cho mỗi loại công việc

> **Nguyên tắc của Junior: Nếu kiểu dữ liệu là `any`, `unknown` hoặc `jsonb`, một ai đó sẽ đẩy sai định dạng dữ liệu vào đó. Hãy xác thực ngay tại ranh giới dữ liệu.**

---

## Ưu tiên 6: Thay thế `console.log` bằng một Bộ ghi nhật ký thực thụ (Logger)

**Tình trạng hiện tại của bạn:** 14 câu lệnh `console.*`. Không có mốc thời gian, không phân chia cấp độ lỗi, không có ID yêu cầu, không có định dạng đầu ra có cấu trúc.

**Bộ ghi nhật ký có cấu trúc đơn giản (không cần cài thêm thư viện ngoài):**

```typescript
// src/lib/logger.ts
type Level = "info" | "warn" | "error";

function log(level: Level, module: string, message: string, data?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    module,
    message,
    ...data,
  };
  // Xuất JSON ra stdout — mọi bộ thu thập nhật ký (Docker, Cloud Run, v.v.) đều có thể phân tích được
  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  info: (module: string, msg: string, data?: Record<string, unknown>) => log("info", module, msg, data),
  warn: (module: string, msg: string, data?: Record<string, unknown>) => log("warn", module, msg, data),
  error: (module: string, msg: string, data?: Record<string, unknown>) => log("error", module, msg, data),
};
```

**Trước đây:**
```typescript
console.error(`[render] ${jobId}:`, err);
```

**Sau khi sửa:**
```typescript
logger.error("render", "Job failed", { jobId, error: String(err) });
// Đầu ra dạng: {"ts":"2026-07-30T00:20:00Z","level":"error","module":"render","message":"Job failed","jobId":"abc","error":"..."}
```

> **Nguyên tắc của Junior: Nếu bạn không thể tìm kiếm nhật ký của mình một cách dễ dàng, bạn không thể gỡ lỗi trên môi trường sản xuất thực tế.**

---

## Ưu tiên 7: Các mục tiêu mở rộng (Khi bạn đã sẵn sàng)

Đây là những điều tạo nên sự khác biệt giữa một "junior vững tay nghề" và một người "biết suy nghĩ dài hạn":

### 7A. Thêm các Chỉ mục Khóa ngoại (FK Indexes) còn thiếu

```sql
-- 0011_missing_indexes.sql
CREATE INDEX sources_assigned_to_idx ON sources (assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX curations_assigned_to_idx ON curations (assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX review_tasks_assigned_to_idx ON review_tasks (assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX loan_tickets_borrower_idx ON loan_tickets (borrower_id);
CREATE INDEX tasks_assigned_to_idx ON tasks (assigned_to) WHERE assigned_to IS NOT NULL;
```

Đây là các cột làm nền tảng cho các truy vấn kiểu "hiển thị công việc được giao cho tôi". Nếu không có chỉ mục, mỗi lần chạy truy vấn sẽ là một lần quét toàn bộ bảng tuần tự.

### 7B. Thực sự áp dụng khóa lạc quan (OCC)

Bạn khai báo cột `version int NOT NULL DEFAULT 1` trên 16 bảng nhưng mới chỉ có khoảng 4 nơi thực sự kiểm tra nó. Đối với mỗi thao tác `UPDATE` trong các hàm nghiệp vụ, mô hình chuẩn nên là:

```typescript
// TRƯỚC ĐÂY (mã hiện tại của bạn ở nhiều nơi):
await tx.update(sources)
  .set({ title: newTitle, updatedAt: new Date() })
  .where(eq(sources.id, sourceId));

// SAU KHI SỬA (đúng mục đích sử dụng cột version):
const [updated] = await tx.update(sources)
  .set({ title: newTitle, updatedAt: new Date(), version: sql`version + 1` })
  .where(and(eq(sources.id, sourceId), eq(sources.version, expectedVersion)))
  .returning({ id: sources.id });

if (!updated) throw versionConflict();
```

### 7C. Giới hạn tốc độ yêu cầu (Rate Limiting - Đơn giản)

```typescript
// src/lib/rate-limit.ts
const hits = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, maxPerMinute: number): boolean {
  const now = Date.now();
  const entry = hits.get(key);
  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= maxPerMinute) return false;
  entry.count++;
  return true;
}
```

Sử dụng hàm này trong `handleApi` hoặc middleware. Mặc dù chưa đạt chuẩn production (vẫn lưu trong bộ nhớ đơn luồng), nhưng nó tốt hơn rất nhiều so với việc không có gì bảo vệ.

---

## Bảng so sánh tiến độ nâng cấp

| Lĩnh vực | Trạng thái Fresher | Mục tiêu Junior | Thời gian ước tính |
|------|--------------|---------------|--------|
| Linter/Formatter | Chưa có | ESLint + Prettier chạy trong CI | 30 phút |
| Bắt lỗi giao diện | 1 tệp global-error.tsx | 5 tệp error + loading cho các tuyến chính | 1 giờ |
| Middleware | Chưa có | Cổng kiểm tra xác thực ở mọi tuyến đường | 30 phút |
| Truy vấn phiên làm việc | 3 truy vấn/yêu cầu | 1 truy vấn JOIN duy nhất | 30 phút |
| Độ phủ kiểm thử | 226 dòng, 3 frameworks | Viết 50+ bài kiểm thử Vitest cho hàm thuần túy | 1 ngày |
| Các tệp mã nguồn khổng lồ | 3 tệp tin > 1.000 dòng | Chia nhỏ thành các mô-đun và re-export | 2 giờ |
| Định kiểu cột JSON | 7 cột jsonb không định kiểu | Sử dụng các schema Zod khi đọc/ghi dữ liệu | 2 giờ |
| Ghi nhật ký hệ thống | Sử dụng `console.log` | Bộ ghi nhật ký JSON có cấu trúc | 30 phút |
| Chỉ mục còn thiếu | Các cột FK chưa lập chỉ mục | Bản di chuyển lược đồ chỉ chứa 5 dòng SQL | 10 phút |
| Áp dụng khóa OCC | Mới áp dụng 4 trên 16 bảng | Áp dụng trên toàn bộ các bảng có chỉnh sửa | 2 giờ |

**Tổng thời gian thực hiện ước tính: ~2 ngày làm việc** để nâng cấp bản thân từ một "fresher ấn tượng" thành một "junior thực thụ."

---

## Sự chuyển dịch trong tư duy

| Cách nghĩ của Fresher | Cách nghĩ của Junior |
|---------------|--------------|
| "Nó chạy được rồi" | "Nó chạy được, và tôi có thể **chứng minh** điều đó" |
| "Tôi sẽ viết kiểm thử sau" | "Nếu tôi không viết kiểm thử, nghĩa là code chưa hoạt động" |
| "Tôi sẽ tự nhớ" | "Hãy để máy móc ghi nhớ thay tôi" |
| "Một tệp lớn giúp dễ tìm mọi thứ hơn" | "Một tệp lớn giúp dễ làm hỏng mọi thứ hơn" |
| "Tôi sẽ xử lý lỗi sau" | "Người dùng đang phải nhìn thấy lỗi **ngay bây giờ**" |
| "Tôi tự biết đối tượng JSON trông như thế nào" | "Tôi biết chắc chắn vì lược đồ cơ sở dữ liệu quy định như vậy" |
| "Dùng console.log là đủ rồi" | "console.log là vô hình lúc 3 giờ sáng" |

> **Bạn đã xây dựng một sản phẩm thực sự tham vọng với một kiến trúc được tính toán rất kỹ lưuỡng. Điều đó hiếm thấy ở bất kỳ cấp độ nào. Bây giờ, hãy làm cho nó trở nên **đáng tin cậy** — đó chính là sự khác biệt.**
