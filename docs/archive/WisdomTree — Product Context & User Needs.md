# WisdomTree — Product Context & User Needs

## 1. Bối cảnh

**TMKT** là một dự án đa ngành và liên ngành, hoạt động trên nhiều lĩnh vực như văn hóa, kiến trúc, con người, nghệ thuật, văn học, nhân học và nghiên cứu thực địa.

Trong quá trình hoạt động, TMKT phát triển nhiều dự án con. Mỗi dự án có một mối quan tâm và hướng nghiên cứu riêng.

Ví dụ, một dự án có thể tập trung vào các giá trị văn hóa phi vật thể thông qua sự kết hợp giữa nhân học, nghệ thuật và văn học; một dự án khác có thể tiếp cận một khu vực dưới góc nhìn kiến trúc hoặc lịch sử.

TMKT là dự án nền tảng. Các dự án khác đều nằm dưới TMKT.

Một trong những dự án đặc biệt là **Tempo Library & Community Space**, nơi TMKT lưu trữ và vận hành một thư viện gồm sách, tư liệu, ghi chú và các tài liệu có giá trị. Tempo vẫn là một dự án con của TMKT, nhưng có thêm các nhu cầu đặc thù như quản lý sách và hoạt động mượn trả.

---

# 2. Vấn đề hiện tại

Trong nhiều năm hoạt động, TMKT đã tích lũy một lượng lớn thông tin:

- ghi chép thực địa;
- ghi chép phỏng vấn;
- thông tin về con người;
- câu chuyện;
- kiến trúc;
- lịch sử;
- văn hóa vùng miền;
- sự kiện;
- quan sát nhân học;
- nghiên cứu độc lập;
- hình ảnh;
- audio;
- sách;
- tài liệu tham khảo;
- ghi chú nội bộ;
- kết quả thảo luận;
- tài liệu phục vụ các dự án.

Phần lớn thành viên của TMKT không phải người làm kỹ thuật.

Vì vậy, thông tin thường được lưu bằng nhiều công cụ khác nhau như chat nội bộ, tài liệu, thư mục hoặc các ghi chú riêng lẻ.

Theo thời gian, một số vấn đề xuất hiện:

- khó biết thông tin đang nằm ở đâu;
- khó tìm lại ghi chú cũ;
- khó biết một chủ đề đã từng được nghiên cứu chưa;
- khó nhận ra các ghi chú có nội dung liên quan;
- thông tin của các dự án bị tách rời;
- ngữ cảnh của một cuộc phỏng vấn hoặc chuyến thực địa dễ bị mất;
- kiến thức nằm trong chat nhưng khó sử dụng lại;
- một người mới tham gia dự án khó hiểu cấu trúc thông tin;
- người dùng phải nhớ mình nên tìm ở đâu thay vì hệ thống giúp họ tìm;
- tiến độ dự án và kiến thức nghiên cứu chưa được kết nối rõ ràng.

WisdomTree được xây dựng để giải quyết các vấn đề đó.

---

# 3. WisdomTree là gì?

WisdomTree là **không gian làm việc và quản trị tri thức dành cho TMKT**.

Mục tiêu của WisdomTree không chỉ là lưu ghi chú.

Hệ thống cần giúp TMKT:

1. quản lý các dự án;
2. lưu lại quá trình nghiên cứu;
3. tổ chức tài liệu và ghi chú;
4. kết nối những thông tin có liên quan;
5. giữ lại nguồn gốc của thông tin;
6. phối hợp công việc giữa các thành viên;
7. theo dõi các hoạt động và deadline;
8. tổng hợp kiến thức từ nhiều nguồn;
9. xuất bản những nội dung đã được TMKT hoàn thiện;
10. giúp người đọc bên ngoài tiếp cận kho tri thức của TMKT.

---

# 4. Cấu trúc tổng thể

TMKT là lớp cao nhất.

```text
TMKT
│
├── Dự án A
├── Dự án B
├── NNTT
├── Tempo Library & Community Space
└── Các dự án khác
```

Mỗi dự án là một không gian làm việc riêng, có:

- mục tiêu;
- thành viên;
- ghi chú;
- tài liệu;
- hoạt động;
- công việc;
- deadline;
- tiến độ;
- kết quả nghiên cứu.

Mỗi dự án có một hướng tiếp cận riêng.

Điều này có nghĩa là hai dự án có thể cùng nghiên cứu một đối tượng nhưng tạo ra những kiến thức khác nhau.

Ví dụ, cùng nói về kiến trúc Huế:

Một dự án có thể quan tâm đến:

- biểu tượng;
- mỹ thuật;
- thiết kế lăng tẩm;
- hình thức kiến trúc.

Một dự án khác có thể quan tâm đến:

- cách con người thích nghi với kiến trúc;
- hoàn cảnh lịch sử;
- mối quan hệ giữa kiến trúc và đời sống;
- văn hóa hình thành xung quanh không gian đó.

Hai nội dung có thể giống nhau về từ khóa nhưng không phải là cùng một nghiên cứu.

Vì vậy WisdomTree không nên tự động xem các ghi chú tương đồng là nội dung trùng lặp.

Thay vào đó, hệ thống nên giúp người dùng nhận ra:

> “Có những nghiên cứu khác liên quan đến vấn đề bạn đang làm.”

---

# 5. Project là trung tâm của công việc nội bộ

Đối với thành viên TMKT, điểm bắt đầu tự nhiên là **dự án**.

Người dùng không nên phải nghĩ:

> “Tôi phải vào module nào?”

Mà nên nghĩ:

> “Tôi đang làm dự án NNTT.”

Sau khi vào dự án, họ có thể thực hiện công việc của mình.

Một project workspace có thể bao gồm:

```text
Project
│
├── Overview
├── Notes
├── Materials
├── Activities
├── Tasks
├── People
└── Schedule
```

Không phải mọi thông tin đều cần xuất hiện cùng lúc.

Giao diện cần ưu tiên sự đơn giản và chỉ hiện chi tiết khi người dùng cần.

---

# 6. Project Overview

Khi mở một dự án, người dùng cần nhanh chóng hiểu:

- dự án đang ở trạng thái nào;
- sắp có hoạt động gì;
- deadline nào đang tới;
- có việc gì cần chú ý;
- gần đây có ghi chú hoặc tài liệu nào mới;
- ai đang làm việc gì.

Overview không nên trở thành một dashboard chứa quá nhiều số liệu.

Người dùng nghiên cứu vốn đã phải đọc rất nhiều.

Do đó trang tổng quan nên chủ yếu trả lời ba câu hỏi:

> **Chuyện gì đang diễn ra?**

> **Điều gì sắp xảy ra?**

> **Điều gì cần tôi chú ý?**

Các thông tin chi tiết chỉ nên mở ra khi cần.

---

# 7. Ghi chú là nền tảng của quá trình nghiên cứu

Ghi chú được tạo trong context của một dự án.

Ví dụ:

```text
NNTT
→ New Note
```

Người dùng không cần tạo một ghi chú trước rồi tự chọn nơi để lưu nó.

Project hiện tại đã cung cấp context.

Việc tạo ghi chú cần đơn giản nhất có thể, đặc biệt vì phần lớn người dùng là non-tech.

Người viết chủ yếu cần:

- tiêu đề;
- nội dung;
- tag hoặc chủ đề;
- file đính kèm nếu có.

Những thông tin mà hệ thống đã biết không nên bắt người dùng nhập lại.

---

# 8. Ghi chú thực địa và ghi chú tổng hợp

TMKT có hai dạng nội dung quan trọng cần được phân biệt về mục đích.

## Ghi chú gốc

Đây có thể là:

- field note;
- ghi chép phỏng vấn;
- quan sát;
- lời kể;
- meeting note;
- dữ liệu được thu thập tại hiện trường.

Ví dụ:

```text
Người ghi: A
Ngày: 12/08/2026
Địa điểm: Huế

“Ông B cho biết rằng...”
```

Những nội dung này cần được giữ lại.

TMKT cần biết:

- ai ghi;
- ghi lúc nào;
- ở đâu;
- trong hoàn cảnh nào;
- nội dung ban đầu là gì.

Đây là một phần của lịch sử nghiên cứu.

## Ghi chú tổng hợp

Sau quá trình nghiên cứu, core member có thể sử dụng nhiều nguồn:

```text
Field note A
Field note B
Interview C
Book D
Historical document E
```

để tạo ra một ghi chú tổng hợp mới.

```text
A + B + C + D + E
        ↓
   Synthesis Note
```

Ghi chú tổng hợp không thay thế các ghi chú ban đầu.

Người nội bộ vẫn có thể truy ngược lại các nguồn đã hình thành nên kết luận.

---

# 9. Provenance — biết thông tin đến từ đâu

Một yêu cầu quan trọng của WisdomTree là **không làm mất nguồn gốc của kiến thức**.

Khi đọc một nội dung tổng hợp, thành viên nội bộ có thể cần biết:

```text
Nội dung tổng hợp
       ↓
Field note A
Interview B
Book C
Photo D
Previous research E
```

Một nguồn có thể được sử dụng bởi nhiều nghiên cứu khác nhau.

Điều này đặc biệt quan trọng với một dự án liên ngành như TMKT.

Hệ thống không chỉ lưu “nội dung cuối cùng”, mà còn lưu được **đường đi dẫn đến nội dung đó**.

---

# 10. Collaborator và Core Member

WisdomTree phục vụ nhiều nhóm người khác nhau.

## Collaborator

Collaborator chủ yếu đóng góp vào quá trình thu thập và phát triển thông tin.

Họ có thể:

- viết ghi chú;
- ghi chép thực địa;
- upload tài liệu;
- thêm ảnh hoặc audio;
- ghi lại phỏng vấn;
- tham gia hoạt động;
- nhận và hoàn thành công việc.

Việc ghi chép cần đơn giản và không yêu cầu hiểu các khái niệm kỹ thuật.

## Core Member

Core member chịu trách nhiệm nhiều hơn về:

- tổ chức thông tin;
- kiểm tra các ghi chú;
- liên kết các nguồn;
- tổng hợp nghiên cứu;
- chỉnh sửa nội dung;
- quyết định nội dung nào có thể được xuất bản;
- quản lý tiến độ và hoạt động dự án.

Complexity nên nằm ở quá trình curation của core member, không nên được đẩy xuống collaborator.

---

# 11. Internal và Public là hai trải nghiệm khác nhau

WisdomTree có hai nhóm người đọc rất khác nhau.

## Internal

Bao gồm:

- TMKT core member;
- collaborator;
- những thành viên tham gia dự án.

Internal có thể thấy:

- ghi chú gốc;
- research notes;
- tài liệu;
- provenance;
- activity;
- task;
- lịch sử chỉnh sửa;
- các nghiên cứu đang phát triển.

## Public Reader

Reader bên ngoài chỉ cần thấy những nội dung TMKT đã quyết định xuất bản.

Họ không cần thấy:

- raw notes;
- task;
- deadline;
- internal discussion;
- workflow review;
- project management.

---

# 12. Publishing

Một note tổng hợp có thể được core member quyết định publish.

Khi đó note sẽ có một phiên bản public có thể được chia sẻ qua web.

Ví dụ:

```text
tmkt.gleworks.io.vn/knowledge/example-note
```

Public reader không cần đăng nhập.

Nội dung public có thể được Google index để người ngoài tìm thấy khi tìm kiếm các chủ đề liên quan.

Publishing không phải là hành động một chiều.

Core member có thể:

```text
Internal note
→ Publish
→ Public
→ Edit internally
→ Publish changes
```

Khi một note đang được chỉnh sửa, người đọc vẫn thấy phiên bản public trước đó.

Chỉ khi core member chọn **Publish changes**, phiên bản public mới được cập nhật.

Core member cũng có thể unpublish khi cần.

---

# 13. Citation

Nếu một nghiên cứu sử dụng citation, bản public cần giữ những citation đó.

Tuy nhiên cần phân biệt:

```text
Research evidence
```

với:

```text
Public citation
```

Không phải mọi tài liệu nội bộ đều cần được public.

Ví dụ nội bộ có thể sử dụng:

- field note;
- private interview;
- audio;
- sách;
- paper.

Nhưng bản public chỉ hiện những reference phù hợp để chia sẻ.

---

# 14. Public Knowledge không tổ chức theo project hierarchy

Đối với internal team, project là context chính.

Đối với public reader, project không nên trở thành rào cản navigation.

Reader không nên phải đi:

```text
TMKT
→ Projects
→ Project A
→ Category
→ Note
```

mới đọc được nội dung.

Thay vào đó, TMKT nên được nhìn như một kho tri thức chung.

Ví dụ:

```text
TMKT
│
├── Explore
├── Search
├── Topics
├── People
└── Published Knowledge
```

Một bài viết có thể hiển thị:

```text
Project: NNTT
Tags: Huế · Nhân học · Nghi lễ
```

Project đóng vai trò metadata và filter.

Reader có thể click vào `NNTT` để xem các nội dung liên quan, nhưng không bắt buộc phải đi qua project page trước.

---

# 15. Cross-project discovery

Các dự án TMKT không hoạt động độc lập hoàn toàn.

Nghiên cứu từ một dự án có thể giúp ích cho một dự án khác.

WisdomTree cần giúp người dùng nhận ra các kết nối này.

Ví dụ khi đang đọc hoặc viết một note:

```text
Related research

Project A
“Biến đổi kiến trúc đình làng...”

Project B
“Đời sống cộng đồng quanh đình...”

Project C
“Lịch sử hình thành khu vực...”
```

Các nội dung này có thể giống nhau về một số chủ đề nhưng vẫn có cách tiếp cận khác nhau.

Vì vậy hệ thống nên nói:

> **Related**

thay vì:

> **Duplicate**

---

# 16. Gợi ý trong quá trình viết

Khi người dùng đang viết một note, WisdomTree có thể nhẹ nhàng gợi ý:

```text
Có thể liên quan

3 ghi chú
2 tài liệu
1 nghiên cứu đã publish
```

Gợi ý không nên làm gián đoạn việc viết.

Người dùng có thể bỏ qua nếu không cần.

Mục tiêu là giúp researcher phát hiện kiến thức đã tồn tại mà không yêu cầu họ phải nhớ chính xác nó nằm ở đâu.

---

# 17. Person

Person là một entity dùng chung trên toàn TMKT.

Một người không nên được tạo thành nhiều hồ sơ khác nhau chỉ vì xuất hiện ở nhiều project.

Ví dụ:

```text
Nguyễn Văn A
│
├── Founding member của TMKT
├── Collaborator của Project A
├── Interviewee của Project B
└── Author của sách tại Tempo
```

Tất cả đều liên kết về cùng một Person.

Trong tương lai, những entity khác như Place hoặc Event có thể được phát triển theo cách tương tự.

---

# 18. Không ép người dùng phân loại quá nhiều

TMKT chưa có nguồn lực để bắt người dùng phân loại mọi thông tin thành:

- Person;
- Place;
- Building;
- Event;
- Historical Site;
- Artifact;
- Organization;
- ...

Việc capture hiện tại cần giữ đơn giản:

```text
Note
+ Tags
+ Links
```

Hệ thống bên dưới nên được chuẩn bị để trong tương lai có thể phát triển thêm cấu trúc.

Điều này đặc biệt quan trọng vì TMKT có kế hoạch phát triển:

- historical GIS mapping;
- knowledge graph;
- các hình thức visualization khác.

Graph và GIS nên được xây trên những quan hệ đã tồn tại trong dữ liệu, chứ không bắt người dùng phải hiểu graph ngay từ lúc nhập liệu.

---

# 19. Activity — hoạt động của dự án

Một phần rất quan trọng của dự án nghiên cứu là các hoạt động như:

- phỏng vấn;
- thực địa;
- meeting;
- workshop;
- sự kiện;
- research session.

WisdomTree cần quản lý **context của activity**, không chỉ ngày giờ.

Ví dụ một buổi phỏng vấn:

```text
Phỏng vấn nhân vật A
│
├── Mục tiêu
├── Người tham gia
├── Nhân vật
├── Địa điểm
├── Câu hỏi chuẩn bị
├── Ghi chú liên quan
├── Tài liệu cần đọc
│
├── Live notes
├── Audio
├── Photos
│
├── Debrief
├── Transcript
└── Follow-up tasks
```

---

# 20. Before — During — After

Activity không phải một wizard cứng.

Một activity là một workspace sống xuyên suốt quá trình.

## Trước hoạt động

Team chuẩn bị:

- mục tiêu;
- người tham gia;
- câu hỏi;
- tài liệu;
- ghi chú cũ;
- thông tin nhân vật;
- địa điểm.

Thay vì lưu các nội dung này trong chat, WisdomTree cung cấp một form đơn giản để mọi người cùng điền.

## Trong hoạt động

Team có thể:

- ghi chú liên tục;
- thu âm;
- upload ảnh;
- lưu observation.

## Sau hoạt động

Team có thể:

- họp lại;
- debrief;
- xử lý transcript;
- tổng hợp ghi chú;
- tạo research note mới;
- tạo follow-up task.

Thông tin của một activity vì vậy không bị mất sau khi event biến mất khỏi Calendar.

---

# 21. Task

TMKT thực sự có nhu cầu giao việc.

Ví dụ:

```text
A → liên hệ nhân vật

B → xử lý transcript

C → viết section

D → kiểm tra citation
```

Task vì vậy là một phần thật của workflow.

Nhưng task không nên tồn tại trong một Board tách biệt hoàn toàn khỏi nghiên cứu.

Một task luôn cần context:

```text
Task
Xử lý transcript

Project
NNTT

Activity
Phỏng vấn Nguyễn A

Assignee
B

Due
26/09
```

Task có thể xuất hiện ở nhiều view:

- Project;
- Activity;
- My Work;
- TMKT Overview.

Nhưng vẫn là cùng một công việc.

---

# 22. Deadline và tiến độ

TMKT không chỉ cần biết:

> Deadline là ngày nào?

Core member còn cần biết:

> Dự án đang ở đâu so với deadline đó?

WisdomTree không nhất thiết phải biến tiến độ thành hàng chục biểu đồ.

Một project overview chỉ cần cho biết những gì đáng chú ý.

Ví dụ:

```text
Next
Interview A — 24 Sep

Needs attention
2 follow-up tasks overdue
1 activity chưa debrief

Upcoming
Project review — 30 Sep
```

Thông tin sâu hơn chỉ xuất hiện khi user mở vào.

---

# 23. Google Calendar

WisdomTree không cần thay thế Google Calendar.

Google Calendar đã giải quyết tốt:

- ngày giờ;
- reminder;
- recurring events;
- invitations;
- notifications;
- availability.

WisdomTree giải quyết phần Google Calendar không biết:

- activity thuộc project nào;
- mục tiêu là gì;
- cần chuẩn bị gì;
- có note nào liên quan;
- ai đang tham gia;
- kết quả thu được gì;
- sau đó cần làm gì.

Mối quan hệ nên là:

```text
WisdomTree Activity
        ↕
Google Calendar
```

Google Calendar quản lý **time**.

WisdomTree quản lý **context**.

Một Calendar event có thể đơn giản chứa:

```text
Phỏng vấn Nguyễn A
NNTT
14:00

Open in WisdomTree →
```

Chi tiết nghiên cứu vẫn nằm trong WisdomTree.

---

# 24. TMKT Overview

Vì nhiều project chạy song song, core member cần một nơi nhìn tổng thể.

TMKT Overview không phải dashboard KPI.

Nó là nơi coordination.

Ví dụ:

```text
Today

10:00
NNTT · Meeting

14:00
Tempo · Community Event


Needs attention

NNTT
2 tasks overdue

Project B
Field trip tomorrow
Preparation incomplete


Upcoming

Sep 3
Interview A

Sep 5
Tempo event

Sep 8
Project C deadline
```

Mục tiêu là giúp user biết:

> Tôi cần quan tâm điều gì ngay bây giờ?

---

# 25. Information Architecture đề xuất

Internal workspace có thể xoay quanh:

```text
TMKT
│
├── Overview
│
├── Projects
│   │
│   ├── NNTT
│   ├── Project B
│   ├── Project C
│   └── Tempo
│
├── My Work
├── People
└── Search
```

Trong một project:

```text
Project
│
├── Overview
├── Notes
├── Materials
├── Activities
├── Tasks
└── People
```

Tempo có thêm:

```text
Tempo
│
├── Overview
├── Notes
├── Materials
├── Activities
├── Tasks
├── People
└── Library
```

---

# 26. Những thứ không nên là navigation chính

Các khái niệm như:

```text
Tree
Graph
Review
Vault
Deadline
```

không nhất thiết phải là các khu vực top-level riêng.

Chúng nên phục vụ workflow.

Ví dụ:

**Graph**  
là một cách khám phá relationship.

**Review**  
là một action hoặc queue dành cho người có trách nhiệm curate.

**Deadline**  
là một phần của project/task/activity.

**Vault**  
là implementation concept mà user không cần biết.

Người dùng nên navigate dựa trên công việc họ muốn làm, không dựa trên cách phần mềm được xây dựng.

---

# 27. Nguyên tắc thiết kế

## Project first

Internal user bắt đầu từ:

```text
Tôi đang làm project nào?
```

không phải:

```text
Tôi phải vào chức năng nào?
```

---

## Capture đơn giản

Ghi chú mới nên cần ít thao tác nhất có thể.

Không yêu cầu user hiểu cấu trúc hệ thống.

---

## Progressive disclosure

Hiện:

> điều quan trọng trước.

Ẩn:

> detail cho tới khi cần.

Không tạo wall of text.

---

## Preserve context

Sau một thao tác, user phải biết:

- mình đang ở đâu;
- vừa tạo cái gì;
- kết quả nằm ở đâu;
- bước tiếp theo là gì.

---

## Related, not duplicate

Hai nội dung giống nhau về từ khóa không đồng nghĩa với cùng một nghiên cứu.

Hệ thống hỗ trợ discovery, không áp đặt merge.

---

## Complexity for the right person

Collaborator có UI đơn giản.

Core member có thêm công cụ curation.

Reader chỉ nhận nội dung đã publish.

---

## Reuse familiar tools

Không build lại công cụ đã làm tốt một vấn đề nếu không cần.

Google Calendar tiếp tục làm scheduling.

WisdomTree bổ sung project và research context.

---

## Institutional memory

Những thứ từng nằm trong:

```text
chat
trí nhớ cá nhân
file rời
```

cần dần trở thành knowledge có thể tìm lại.

---

# 28. Mục tiêu dài hạn

WisdomTree không chỉ là một hệ thống note.

Nếu được xây đúng, nó trở thành **institutional memory của TMKT**.

Qua thời gian, hệ thống có thể biết:

```text
Ai?
Ở đâu?
Khi nào?
Thuộc project nào?
Liên quan vấn đề gì?
Nguồn nào?
Ai ghi lại?
Nghiên cứu nào sử dụng?
Nội dung nào đã được publish?
```

Từ foundation đó, TMKT có thể phát triển:

- semantic search;
- related research;
- knowledge graph;
- historical GIS;
- timeline;
- people network;
- spatial research;
- cross-project discovery.

Nhưng những khả năng đó không được làm workflow hiện tại trở nên phức tạp.

Người dùng hôm nay vẫn chỉ cần:

```text
Mở project
→ ghi lại công việc
→ lưu tài liệu
→ tìm thông tin
→ phối hợp với team
```

---

# 29. Tóm tắt

WisdomTree được định hướng là:

> **Không gian quản trị dự án, dữ liệu và tri thức dành cho TMKT, giúp một đội ngũ chủ yếu non-tech ghi lại quá trình nghiên cứu, kết nối thông tin, phối hợp công việc và biến những dữ liệu rời rạc thành tri thức có thể được lưu giữ và chia sẻ lâu dài.**

TMKT là root.

Project là context chính của công việc nội bộ.

Notes và materials lưu lại quá trình nghiên cứu.

Activities kết nối lịch với preparation, fieldwork và follow-up.

Tasks kết nối con người với công việc.

Core member curate và publish knowledge.

Public reader tiếp cận kho tri thức TMKT mà không cần hiểu cấu trúc vận hành nội bộ.

Google Calendar tiếp tục quản lý thời gian.

WisdomTree quản lý ý nghĩa và context phía sau những mốc thời gian đó.

Về dài hạn, WisdomTree trở thành lớp kết nối giữa:

```text
Projects
People
Research
Notes
Materials
Activities
Time
Published Knowledge
```

và trở thành bộ nhớ dài hạn của TMKT.