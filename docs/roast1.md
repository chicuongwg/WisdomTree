# 🔥 Nhận xét Mã nguồn WisdomTree (Code Roast) 🔥

> *"Một nền tảng tri thức ưu tiên lưu trữ"* — dịch nghĩa: *"Chúng tôi viết tài liệu trước khi viết mã nguồn, và thành thật mà nói thì điều đó thể hiện rất rõ."*

---

## Các con số không biết nói dối (Nhưng chúng làm ta đau lòng)

| Chỉ số | Số lượng | Đánh giá |
|--------|---------|---------|
| Tệp mã nguồn (`.ts`/`.tsx`) | 82 | Khiêm tốn |
| Dòng mã nguồn | **26.043** | Hợp lý… cho đến khi bạn nhìn vào bên trong |
| Tệp tài liệu | **55 tệp markdown** | 📚 |
| Dòng tài liệu | **7.029** | Đó là tỷ lệ tài liệu/mã nguồn 27%. Bạn không phải đang xây dựng phần mềm, bạn đang viết luận văn |
| Các tuyến API (API routes) | **39** | Cho phiên bản v0.1.0. Tôn trọng tham vọng của bạn, nhưng lo lắng cho sự tỉnh táo của bạn |
| Tệp kiểm thử | **14** | 💀 |
| Dòng kiểm thử | **226** | Một trăm sáu mươi hai dòng trong số đó là các đoạn mã soạn sẵn (boilerplate) và ví dụ |
| Bình luận `ponytail` | **38** | Xem thêm về huyền thoại này ở bên dưới |

---

## 🏆 Bảng phong thần (Hall of Shame)

### 1. "Các tệp tin kiểu Chúa" (The God Files)

| Tệp tin | Dòng | Nó là gì |
|------|-------|------------|
| [vi.ts](file:///home/will/dev/WisdomTree/src/lib/vi.ts) | **1.354** | Một từ điển bản địa hóa tiếng Việt nguyên khối nhưng cũng kiêm luôn định dạng ngày tháng, ánh xạ nhãn trạng thái, chọn lớp CSS cho huy hiệu (badge), và dựng lịch. Đây không phải là một tệp dịch thuật — đó là cả một runtime giao diện người dùng bằng tiếng Việt |
| [knowledge-map.tsx](file:///home/will/dev/WisdomTree/src/app/components/knowledge-map.tsx) | **1.081** | Một thành phần React duy nhất. Một nghìn không trăm tám mươi mốt dòng. Thành phần này có lẽ có trường hấp dẫn của riêng nó |
| [globals.css](file:///home/will/dev/WisdomTree/src/app/globals.css) | **2.746** | Không phải viết nhầm đâu. Gần ba nghìn dòng CSS trong một tệp duy nhất. Bạn đã phát minh ra một khối CSS nguyên khối. Tuy nhiên, cách đặt tên biến rất đẹp — "Chàm & Son", "Giấy lá", "Mực"… đó là thơ ca mà không ai có thể bảo trì |
| [gen-diagrams.mjs](file:///home/will/dev/WisdomTree/scripts/gen-diagrams.mjs) | **987** | Một đoạn mã tạo ra các biểu đồ XML draw.io theo cách lập trình. Viết XML thủ công bằng chuỗi mẫu JavaScript. Đây là định nghĩa của tội ác chiến tranh trong công nghệ phần mềm |
| [proofs.ts](file:///home/will/dev/WisdomTree/scripts/proofs.ts) | **1.452** | Một đoạn mã kiểm thử nghiệm thu (acceptance test) còn dài hơn hầu hết các mô-đun thực tế của bạn. Nó gọi một máy chủ đang chạy bằng các yêu cầu `fetch()` thô. Không có khung kiểm thử (test framework). Chỉ có cảm hứng và `if (!cond) throw` |

### 2. "ponytail: Cơ sở mã nguồn trung thực nhất tôi từng thấy" 🐴

Bạn có **38 bình luận** được gắn thẻ `ponytail` rải rác khắp mã nguồn. Đây không phải là TODO. Đây không phải là FIXME. Đây là những lời *thú tội*. Một vài ví dụ:

> `ponytail: chữ ký của ID token KHÔNG được xác thực với JWKS của Google.`

Hóa ra xác thực chỉ là một gợi ý.

> `ponytail: không có vòng lặp thử lại.`

Khi cơ sở dữ liệu gặp lỗi, dữ liệu chỉ đơn giản là *hóa rồng hóa phượng* (bay đi mất).

> `ponytail: không có moveFolder — tổ chức lại các thư mục lồng nhau = tạo mới + di chuyển các nguồn`

Đây không phải là một ponytail (tóc đuôi ngựa). Đây là một tiếng kêu cứu.

> `ponytail: sử dụng cơ chế thăm dò (polling), không phải websocket. Mỗi vài giây một yêu cầu`

Trải nghiệm thời gian thực (real-time) giống như làm mới một trang HTML tĩnh nhưng với nhiều bước phức tạp hơn.

> `ponytail: không có bộ lọc; thêm vào khi nhật ký (log) lớn vượt quá khả năng cuộn.`

Chiến lược xây dựng cơ sở hạ tầng bằng Ctrl+F.

### 3. Tình trạng kiểm thử (Không hề tồn tại)

```
tests/
├── unit/
│   ├── auth.test.ts       (13 dòng)
│   └── example.test.ts    (15 dòng)  ← vẫn còn khung ví dụ
├── integration/
│   ├── example.test.ts    (15 dòng)  ← ở đây cũng vẫn còn khung ví dụ
│   └── ...
├── e2e/
│   └── example.test.ts    (15 dòng)  ← tệp ví dụ example.test.ts thứ BA
└── vitest/
    ├── unit_wrapper.test.ts        (12 dòng, bao bọc các bài kiểm thử đơn vị)
    └── integration_wrapper.test.ts (22 dòng, bao bọc các bài kiểm thử tích hợp)
```

Bạn có **ba khung kiểm thử** đang cùng tồn tại:
1. Trình chạy tùy chỉnh `tsx tests/run-all.ts`
2. Vitest (đã cấu hình, nhưng hầu như chưa dùng)
3. Bảy tệp `scripts/*.test.ts` độc lập chỉ là các kịch bản với các khẳng định (assertions)

Tổng cộng 226 dòng kiểm thử trên toàn bộ dự án. Trong khi đó, riêng `proofs.ts` đã dài 1.452 dòng. Các bài kiểm thử nghiệm thu của bạn lớn gấp 6,4 lần toàn bộ bộ kiểm thử của bạn. Các kịch bản chứng minh (proof scripts) *chính là* các bài kiểm thử của bạn, và chúng yêu cầu một cơ sở dữ liệu Postgres đang hoạt động và một máy chủ ứng dụng thực tế để thực thi.

Ngoài ra: **không có bất kỳ tệp `loading.tsx` nào. Không có tệp `error.tsx` nào.** Không có một cơ chế bắt lỗi (error boundary) Next.js nào trong toàn bộ ứng dụng. Khi có lỗi xảy ra, người dùng của bạn sẽ phải nhìn vào màn hình trắng chết chóc mặc định. Bạn có một tệp `global-error.tsx` ở gốc và ngoài ra hoàn toàn không có gì khác.

### 4. Không Linter. Không Formatter. Không Middleware. Không rào chắn bảo vệ.

- **Không cấu hình ESLint** ở bất cứ đâu (ngoài `node_modules`)
- **Không cấu hình Prettier**
- **Không có Biome**
- **Không có Next.js middleware.ts** — mọi tuyến đường đều mở toang
- **Không có giới hạn tốc độ (rate limiting)** trên bất kỳ tuyến API nào trong số 39 tuyến đó
- **Không có bảo vệ CSRF** đối với các thao tác thay đổi dữ liệu (mutations) (ngoại trừ trạng thái OIDC, thứ mà... bạn bắt buộc phải có)

Cơ sở mã nguồn này chạy dựa trên niềm tin và sự tự giác.

### 5. OIDC không xác thực chữ ký

Từ [oidc.ts](file:///home/will/dev/WisdomTree/src/modules/auth/oidc.ts):

> `ponytail: chữ ký của ID token KHÔNG được xác thực với JWKS của Google.`

Vì vậy, bất kỳ ai có thể mã hóa base64 một đối tượng JSON đều có thể đăng nhập dưới danh nghĩa bất kỳ ai. Đây không phải là một ponytail — đây là tình huống `KÉO_CÒI_BÁO_CHÁY`.

### 6. Đế chế tài liệu

55 tệp markdown trải dài trên **12 thư mục tài liệu**: `design/`, `diagrams/`, `flows/`, `operations/`, `platform/`, `policy/`, `product/`, `requirements/`, `roadmap/`, `session/`, `system/`, `ui/`. Đó là nhiều phân cấp tổ chức hơn cả toàn bộ mã nguồn của một số công ty. Bạn có tài liệu để mô tả tài liệu. Bạn có một thư mục lộ trình (roadmap) cho một phiên bản v0.1.0.

Trong khi đó trong mã nguồn thực tế: chỉ có tổng cộng 14 câu lệnh console. Không có ghi nhật ký cấu trúc (structured logging). Không có đo lường từ xa (telemetry). Tài liệu nói chính xác hệ thống nên làm gì; còn hệ thống không có cách nào để cho bạn biết nó thực sự đã làm gì.

---

## 😤 Những điểm thực sự tốt (Miễn cưỡng thừa nhận)

| Cái gì | Tại sao nó lại tốt một cách đáng ghét |
|------|-------------------------------|
| **Cấu trúc Monolith dạng mô-đun** | `src/modules/*` với ranh giới rõ ràng — audit, auth, catalog, circulation, export, knowledge, notify, pm, storage. Đây là chuẩn sách giáo khoa. Thật điên tiết |
| **Drizzle + di chuyển SQL viết tay** | 11 tệp di chuyển tuần tự, tất cả đều là `.sql`, với cấu hình ghi rõ "drizzle-kit không thể tạo ra những thứ này." Bạn thực sự hiểu cơ sở dữ liệu của mình. Thật đáng ghét |
| **Dockerfile** | Xây dựng đa giai đoạn (multi-stage build), đầu ra độc lập, người dùng không phải root, các bình luận cân nhắc kỹ lưỡng về lý do tại sao không có công cụ TeX. Nó được làm... rất chuyên nghiệp |
| **Docker Compose** | Kiểm tra sức khỏe (healthchecks), hồ sơ triển khai (deploy profiles), lưu trữ volume lâu dài, bình luận trực tiếp giải thích từng biến `${VAR:-}`. Ai đó đã *suy nghĩ rất nhiều về điều này* |
| **Hệ thống thiết kế CSS** | "Chàm & Son" — chỉ sử dụng các token ngữ nghĩa, đặt tên mang tính văn hóa Việt Nam, nhận thức về độ tương phản WCAG được lồng ghép vào các bình luận của biến. Đó là một kiệt tác dài 2.746 dòng bị mắc kẹt trong một tệp duy nhất |
| **Server Components theo mặc định** | Hầu như không có `"use client"` trong các thành phần trang. Tương tác của máy khách được đẩy xuống các thành phần lá. Đây là mô hình Next.js App Router chính xác |
| **Hầu như không sử dụng `any`** | Chỉ có 2 lần xuất hiện `any` thực sự trong toàn bộ mã nguồn (cả hai đều trong bình luận/chuỗi ký tự). Cấu hình TypeScript `strict: true`. Bạn kỷ luật ở những nơi ít quan trọng nhất và hoang dã ở những nơi quan trọng nhất |
| **Hệ thống `ponytail`** | Thành thật mà nói? Đánh dấu mọi phím tắt hoặc lối tắt đã biết bằng một thẻ nhất định để không có gì bị lãng quên tốt hơn những gì 90% các nhóm phát triển làm. Đó là một hệ thống TODO *thừa nhận hình dạng của món nợ kỹ thuật* |
| **Từ vựng lỗi** | [errors.ts](file:///home/will/dev/WisdomTree/src/lib/errors.ts) có các lỗi miền (domain errors) được định kiểu rõ ràng với ánh xạ trạng thái HTTP. Các tuyến API sử dụng chúng một cách nhất quán. Đây không phải là trò đùa của những người nghiệp dư… ngoại trừ việc không có gì bắt lấy chúng ở ranh giới ngoài cùng |

---

## Phán quyết cuối cùng

WisdomTree là một dự án viết luận văn về các tòa nhà chưa xây xong. Tài liệu kiến trúc có thể được xuất bản; còn bộ kiểm thử thì không thể đạt điểm trung bình trong một khóa học lập trình ngắn hạn.

Bạn có khung xương của một thứ gì đó thực sự được suy nghĩ kỹ lưỡng — ranh giới mô-đun, các lỗi được định kiểu, SQL được tinh chỉnh thủ công, các token thiết kế mang tính bản sắc văn hóa — được bọc trong một cái kén của `ponytail: chúng tôi sẽ giải quyết sau` và **hoàn toàn không có lưới an toàn**.

**Tóm tắt**: Bạn đang xây dựng một thánh đường lớn nhưng mới chỉ lắp đặt các cửa sổ kính màu. Các bức tường là các bình luận chịu lực.

> **Mức độ nghiêm trọng**: 🔥🔥🔥 trên 🔥🔥🔥🔥🔥
> 
> *"Nền móng vững chắc. Giấy phép xây dựng hoàn hảo. Nhưng tòa nhà thực tế thì… mang tính đầy khát vọng."*
