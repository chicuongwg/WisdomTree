// User-facing Vietnamese vocabulary, per docs/ui/vocabulary-vi.md — the UI never
// shows a raw internal term. Terms marked NEW are not yet in the vocabulary
// doc and are flagged for humanities review in the step-2 report.

export const T = {
  appName: "WisdomTree",
  home: "Trang chủ",
  space: "Kho",
  library: "Tư liệu số",
  catalog: "Sách & tài liệu vật lý",
  catalogItem: "Đầu sách",
  coverPhoto: "Ảnh bìa",
  coverPlaceholder: "Chưa có ảnh bìa",
  chooseCover: "Chọn ảnh bìa",
  coverConstraint: "PNG, JPEG hoặc WebP · tối đa 5 MB",
  coverSaved: "Đã lưu ảnh bìa.",
  loanTicket: "Phiếu mượn",
  source: "Tư liệu",
  sourceIntake: "Gửi tư liệu",
  mySubmissions: "Tư liệu tôi đã gửi",
  storedItem: "Tư liệu đã lưu",
  sourceDetail: "Hồ sơ tư liệu", // NEW
  librarianDesk: "Bàn thủ thư",
  gapRequest: "Đề xuất bổ sung",
  accessDenied: "Không có quyền truy cập",
  // A refusal without a next step leaves the reader on a page with nothing on
  // it but the word no.
  accessDeniedHint:
    "Trang này dành cho người phụ trách thư viện. Bạn vẫn có thể xem danh mục sách.", // NEW
  search: "Tìm kiếm",
  download: "Tải xuống",
  signIn: "Đăng nhập",
  signOut: "Đăng xuất",
  requestLoan: "Yêu cầu mượn",
  // Loan record block on Catalog Item Detail — the register entry that
  // replaced the loan discussion (owner decision 2026-07-20). NEW pending
  // humanities review.
  loanRecord: "Sổ mượn trả", // NEW
  currentLoan: "Lượt mượn hiện tại", // NEW
  loanHistory: "Các lượt mượn trước", // NEW
  noLoanRecord: "Đầu sách này chưa có lượt mượn nào.", // NEW
  noCurrentLoan: "Hiện không có ai mượn đầu sách này.", // NEW
  borrower: "Người mượn", // NEW
  requestedAtLabel: "Yêu cầu lúc", // NEW
  approvedByLabel: "Duyệt bởi", // NEW
  approvedAtLabel: "Duyệt lúc", // NEW
  borrowedAtLabel: "Nhận sách lúc", // NEW
  returnedAtLabel: "Đã trả lúc", // NEW
  overdueLabel: "Quá hạn", // NEW
  notYet: "Chưa có", // NEW
  // A title can be more than one book (owner request 2026-07-21): the shelf
  // line has to say how many are free, not merely whether the title is out.
  // NEW pending humanities review.
  copiesLabel: "Số lượng", // NEW
  copiesTotal: "Tổng số cuốn", // NEW
  copiesAvailable: "Còn cho mượn", // NEW
  copiesAllOut: "Đã mượn hết", // NEW
  copiesOf: (free: number, total: number) => `${free}/${total} cuốn`, // NEW
  copiesSaved: "Đã cập nhật số lượng.", // NEW
  archiveCatalogItem: "Lưu trữ đầu sách", // NEW
  confirmArchiveItemTitle: "Lưu trữ đầu sách này?", // NEW
  confirmArchiveItemBody:
    "Đầu sách rời khỏi danh sách thư viện nhưng vẫn được lưu lại trong hồ sơ, kèm lịch sử mượn trả. Không có nút mở lại đầu sách.", // NEW
  updateCopies: "Cập nhật số lượng", // NEW
  // Quantity and state are two questions, so two columns (owner, 2026-07-21).
  copiesColumn: "Số lượng", // NEW
  // (`statusColumn` was a second key holding the same word as `state`, and the
  //  catalogue used one while every other table used the other.)
  approve: "Duyệt",
  decline: "Từ chối",
  lend: "Giao sách",
  markReturned: "Đã nhận trả",
  dueDate: "Hạn trả",
  uploader: "Người gửi",
  storedAtLabel: "Lưu lúc",
  title: "Tiêu đề",
  description: "Mô tả",
  file: "Tệp",
  submit: "Gửi",
  loading: "Đang tải…",
  empty: "Chưa có mục nào.",
  notifications: "Thông báo",
  // Pagination (NEW — not yet in vocabulary-vi.md)
  pagination: "Phân trang",
  previousPage: "Trang trước",
  nextPage: "Trang sau",
  pageLabel: "Trang",
  // Empty states that carry a next action (NEW — not yet in vocabulary-vi.md)
  pageBeyondEnd: "Đã hết trang — không còn mục nào ở đây.", // NEW
  backToFirstPage: "Về trang đầu", // NEW
  noMatches: "Không tìm thấy mục nào khớp với bộ lọc.",
  clearFilters: "Xoá bộ lọc",
  libraryEmptyTitle: "Kho tư liệu này chưa có gì.",
  libraryEmptyHint: "Tải lên tài liệu đầu tiên — tệp xem và tải được ngay, không cần chờ xử lý.",
  uploadCta: "Gửi tư liệu",
  catalogEmptyHint: "Thư viện chưa có đầu sách nào. Liên hệ thủ thư để bổ sung.",
  // Empty states, one per screen (NEW — not yet in vocabulary-vi.md)
  homeLoansEmptyTitle: "Bạn chưa mượn cuốn sách nào.",
  homeLoansEmptyHint: "Tìm sách trong thư viện rồi gửi yêu cầu mượn; thủ thư sẽ duyệt giúp bạn.",
  notificationsTruncated: (n: number) =>
    `Đang hiển thị ${n} thông báo gần nhất. Những thông báo cũ hơn không nằm trong danh sách này.`, // NEW
  notificationsEmptyTitle: "Chưa có thông báo nào.",
  homeNotificationsEmptyHint:
    "Khi có người nhắc bạn trong thảo luận, hoặc tư liệu bạn gửi có thay đổi, thông báo sẽ hiện ở đây.",
  notificationsEmptyHint:
    "Khi có người nhắc bạn trong thảo luận, hoặc việc bạn theo dõi có thay đổi, thông báo sẽ hiện ở đây. Chọn kênh nhận thông báo ở phần bên dưới.",
  deadlinesEmptyTitle: "Chưa có hạn chót nào.",
  deadlinesEmptyHint:
    "Tạo hạn chót đầu tiên ở khung bên cạnh — cả nhóm sẽ thấy nó và được nhắc trước khi tới hạn.",
  deadlineLinksEmptyTitle: "Chưa có việc hay tài liệu nào gắn với hạn chót này.",
  deadlineLinksEmptyHint:
    "Gắn công việc và tư liệu từ chính trang của chúng, để mọi người biết cần chuẩn bị những gì trước hạn.",
  deskTicketsEmptyTitle: "Không có phiếu mượn nào ở mục này.",
  deskTicketsEmptyHint: "Phiếu mượn sẽ tự chuyển vào đây khi tới bước này.",
  boardTodoEmptyTitle: "Chưa có việc cần làm.",
  boardTodoEmptyHint: "Mở “Thêm công việc” ở trên.",
  boardDoingEmptyTitle: "Chưa có việc đang làm.",
  boardDoneEmptyTitle: "Chưa có việc nào hoàn thành.",
  mySubmissionsEmptyTitle: "Bạn chưa gửi tư liệu nào.",
  mySubmissionsEmptyHint:
    "Tư liệu bạn tải lên và những đề xuất bổ sung bạn nêu đều được liệt kê ở đây.",
  sourceInboxEmptyTitle: "Chưa có tư liệu nào được gửi lên.",
  sourceInboxEmptyHint:
    "Khi thành viên gửi tư liệu, chúng vào đây để bạn giao việc hiệu đính. Bạn cũng tự gửi được.",
  gapRequestsEmptyTitle: "Chưa có đề xuất bổ sung nào.",
  gapRequestsEmptyHint:
    "Thành viên gửi đề xuất khi cần một tư liệu mà kho chưa có; đề xuất sẽ hiện ở đây.",
  reviewQueueEmptyTitle: "Không có việc nào đang chờ duyệt.",
  reviewQueueEmptyHint:
    "Việc sẽ tự vào hàng chờ khi có tư liệu mới gửi lên hoặc có bản thảo xin xuất bản.",
  branchesEmptyTitle: "Chưa có chuyên đề nào.",
  branchesEmptyHint: "Chuyên đề gom những trang tri thức cùng một chủ đề lại với nhau.",
  nodesEmptyTitle: "Chưa có trang tri thức nào.",
  nodesEmptyHint: "Mỗi trang tri thức nằm trong một chuyên đề — mở một chuyên đề để bắt đầu viết.",
  branchNodesEmptyTitle: "Chuyên đề này chưa có trang tri thức nào.",
  branchNodesEmptyHintEditor: "Bấm “Thêm trang tri thức” ngay bên dưới để viết trang đầu tiên.",
  branchNodesEmptyHintReader: "Khi có người thêm trang vào chuyên đề này, chúng sẽ hiện ở đây.",
  // Correcting your own upload (NEW — not yet in vocabulary-vi.md)
  validationRequired: "Hãy điền mục này.", // NEW
  validationBadFormat: "Giá trị chưa đúng định dạng.", // NEW
  validationLength: "Độ dài chưa hợp lệ.", // NEW
  validationGeneric: "Giá trị chưa hợp lệ.", // NEW
  validationMin: (min: string) => `Giá trị nhỏ nhất là ${min}.`, // NEW
  validationMax: (max: string) => `Giá trị lớn nhất là ${max}.`, // NEW
  genericError: "Có lỗi xảy ra. Vui lòng thử lại sau.",
  // Gap request: the no-file intake mode (NEW — not yet in vocabulary-vi.md)
  gapRequestHint: "Không có tệp để gửi? Nêu thứ còn thiếu, quản trị viên sẽ xem xét bổ sung.",
  gapRequestTitle: "Cần bổ sung tư liệu gì?",
  gapRequestWhy: "Vì sao cần (không bắt buộc)",
  gapRequestSent: "Đã gửi đề xuất. Bạn theo dõi được ở mục “Tư liệu tôi đã gửi”.",
  gapRequestSubmit: "Gửi đề xuất",
  // Librarian Desk: adding a physical item (NEW — not yet in vocabulary-vi.md)
  author: "Tác giả",
  shelfLocation: "Vị trí",
  addCatalogItem: "Thêm đầu sách",
  catalogItemAdded: "Đã thêm đầu sách. Mã số:",
  extractionWatching: "Trang sẽ tự cập nhật khi xử lý xong — không cần tải lại.",
  extractionSlow: "Việc xử lý lâu hơn thường lệ. Tệp gốc vẫn tải xuống được bình thường.",
  uploading: "Đang tải lên",
  uploadFinishing: "Đã tải xong, đang lưu…",
  uploadNetworkError: "Mất kết nối khi đang tải lên. Kiểm tra mạng và thử lại.",
  noFileChosen: "Chưa chọn tệp",
  noSpacesTitle: "Bạn chưa thuộc kho nào.",
  noSpacesHint: "Cần được thêm vào một kho trước khi gửi tư liệu. Liên hệ quản trị viên.",
  sourceOwnerActions: "Tư liệu bạn đã gửi",
  renameSource: "Sửa tên và mô tả",
  withdrawSource: "Thu hồi tư liệu",
  withdrawSourceTitle: "Thu hồi tư liệu này?",
  withdrawSourceBody:
    "Tư liệu sẽ không còn hiện trong kho và không tải xuống được nữa. Tệp gốc vẫn được giữ lại, nên quản trị viên có thể khôi phục nếu cần. Không thu hồi được nếu đã có người biên tập hoặc xuất bản dựa trên tư liệu này.",
  // Knowledge content terms (vocabulary-vi.md § Term Map)
  tree: "Nội dung tri thức",
  node: "Trang tri thức",
  branch: "Chuyên đề",
  markdownDraft: "Bản thảo",
  publish: "Xuất bản",
  reviewQueue: "Duyệt tư liệu",
  publishReview: "Duyệt xuất bản",
  correctedText: "Văn bản đã hiệu đính", // NEW
  rawText: "Văn bản trích xuất", // NEW
  sourceInbox: "Tiếp nhận tư liệu", // NEW
  assignedTask: "Việc được giao", // NEW
  provenance: "Nguồn dẫn", // NEW
  relatedNodes: "Trang liên quan", // NEW
  tags: "Thẻ", // NEW
  branchName: "Tên chuyên đề", // NEW
  createBranch: "Tạo chuyên đề", // NEW
  editNode: "Sửa trang tri thức", // NEW
  save: "Lưu", // NEW
  saveDraft: "Lưu bản thảo", // NEW
  markReady: "Gửi duyệt", // NEW
  assign: "Giao việc", // NEW
  assignee: "Người phụ trách", // NEW
  reject: "Không dùng",
  requestChanges: "Yêu cầu chỉnh sửa", // NEW
  publishVerified: "Xuất bản (Đã thẩm định)", // NEW
  publishUnverified: "Xuất bản (Chưa thẩm định)", // NEW
  archive: "Lưu trữ", // NEW
  merge: "Gộp trang", // NEW
  mergedNotice: "Trang này đã được gộp vào một trang chuẩn.", // NEW
  openCanonical: "Mở trang chuẩn", // NEW
  verificationLabelTitle: "Mức thẩm định", // NEW
  excerpts: "Trích đoạn dẫn chứng", // NEW
  nodeCount: "Số trang tri thức", // NEW
  lastUpdated: "Cập nhật lần cuối", // NEW
  state: "Trạng thái", // NEW
  // Column headings that used to be typed straight into the tables. They are
  // here for one reason: written inline, the same column ended up with two
  // names on two screens — "Người gửi" and "Người tải lên" for the person who
  // sent a file, "Cập nhật lần cuối" and "Cập nhật" for the same timestamp.
  contentColumn: "Nội dung", // NEW
  kindColumn: "Loại", // NEW
  curationColumn: "Hiệu đính", // NEW
  extractionState: "Trạng thái xử lý", // NEW
  itemCode: "Mã số", // NEW
  memberColumn: "Thành viên", // NEW
  eventColumn: "Sự kiện", // NEW
  // The library's folder trail. It used to borrow `shelfLocation`, which means
  // a physical shelf in the book catalogue — two different places, one word.
  folderPath: "Đường dẫn thư mục", // NEW
  breadcrumbLabel: "Đường dẫn trang", // NEW
  taskType: "Loại việc", // NEW
  openItem: "Mở", // NEW
  triage: "Tiếp nhận", // NEW
  convertToBranch: "Chuyển thành chuyên đề", // NEW
  // "Markdown" is a programmer's word and nothing on either editor screen
  // explains it. What the reader needs to know is that the box takes plain
  // writing and that a few marks do something — which the hint says.
  contentMd: "Nội dung", // NEW
  contentMdHint:
    "Viết như bình thường. Gõ ## đầu dòng để tạo tiêu đề, - để tạo gạch đầu dòng, và [[Tên trang]] để dẫn sang một trang tri thức khác.", // NEW
  editNodeConflictNote:
    "Nếu người khác lưu trước bạn, hệ thống sẽ báo và giữ nguyên nội dung bạn đang soạn.", // NEW
  suggestedBranch: "Chuyên đề đề xuất", // NEW
  preview: "Xem trước", // NEW
  // Notify + PM terms; Comment "Thảo luận" comes from vocabulary-vi.md § Term
  // Map, the rest are NEW pending humanities review.
  deadline: "Lịch dự án",
  comments: "Thảo luận",
  addComment: "Gửi thảo luận", // NEW
  newComment: "Viết thảo luận mới", // NEW
  reply: "Trả lời", // NEW
  commentsEmpty: "Chưa có thảo luận nào. Hãy là người mở đầu.", // NEW
  commentPosted: "Đã gửi thảo luận.", // NEW
  // A thread that would not load says so, and offers the way out.
  commentsLoadFailed: "Không tải được thảo luận.", // NEW
  errorTitle: "Không tải được phần này.", // NEW
  errorDescription:
    "Có lỗi xảy ra trong quá trình xử lý. Dữ liệu của bạn vẫn an toàn — hãy thử lại.", // NEW
  retry: "Thử lại", // NEW
  checkAgain: "Kiểm tra lại", // NEW
  // Mentions are typed into the comment itself; the picker is gone.
  mentionHelp: "Gõ @ rồi tên thành viên (ví dụ @Phạm Thu Hương) để nhắc họ vào thảo luận này.", // NEW
  // Announced when the name list opens — a textbox cannot carry aria-expanded,
  // so this sentence is how a reader who cannot see the list learns it is
  // there and how to move through it.
  mentionMatches: (n: number) => `${n} tên khớp. Dùng phím mũi tên để chọn, Enter để chèn.`, // NEW
  notificationCenter: "Thông báo", // NEW
  markRead: "Đánh dấu đã đọc", // NEW
  unread: "Chưa đọc", // NEW
  notificationPrefs: "Tùy chọn nhận thông báo", // NEW
  board: "Bảng phân công", // NEW
  task: "Công việc", // NEW
  createTask: "Thêm công việc", // NEW
  achievement: "Thành quả", // NEW
  createDeadline: "Tạo hạn chót", // NEW
  editDeadline: "Sửa hạn chót", // NEW
  deadlineType: "Loại hạn chót", // NEW
  dueAtLabel: "Đến hạn", // NEW
  reminderOffsets: "Nhắc trước", // NEW
  checklistAndDocs: "Việc và tài liệu liên quan", // NEW
  myCalendar: "Lịch của tôi", // NEW
  calendarSubscribeHint:
    "Dán đường dẫn này vào ứng dụng lịch (Google Calendar, Outlook…) để tự động nhận các hạn chót.", // NEW
  project: "Kho dự án", // NEW
  allProjects: "Tất cả kho dự án", // NEW
  noAssignee: "Chưa giao", // NEW
  // Board: claim, archive, and the three ways of looking at the same work
  // (lanes / month / week) — NEW pending humanities review
  claimTask: "Nhận việc", // NEW
  boardViews: "Cách xem bảng công việc", // NEW
  boardViewKanban: "Cột việc", // NEW
  boardViewMonth: "Tháng", // NEW
  boardViewWeek: "Tuần", // NEW
  taskDueAtOptional: "Đến hạn (không bắt buộc)", // NEW
  today: "Hôm nay", // NEW
  prevMonth: "Tháng trước", // NEW
  nextMonth: "Tháng sau", // NEW
  prevWeek: "Tuần trước", // NEW
  nextWeek: "Tuần sau", // NEW
  outsideHoursStrip: "Cả ngày / ngoài giờ", // NEW
  calendarEmptyTitle: "Chưa có việc nào đến hạn trong khoảng này.", // NEW
  calendarEmptyHint: "Đặt “Đến hạn” khi thêm công việc để nó hiện trên lịch.", // NEW
  confirmArchiveTaskTitle: "Lưu trữ công việc này?", // NEW
  confirmArchiveTaskBody:
    "Công việc rời khỏi bảng nhưng vẫn được lưu lại trong hồ sơ. Không thể hoàn tác trên bảng.", // NEW
  // Task detail — the page (and side panel) one task opens into: what was
  // chosen when it was created, how long there is to do it, and a place to
  // write the notes that used to live in a separate document.
  // NEW pending humanities review
  taskDetail: "Chi tiết công việc", // NEW
  taskStartAtOptional: "Bắt đầu (không bắt buộc)", // NEW
  startAtLabel: "Bắt đầu", // NEW
  taskDurationLabel: "Thời gian cho phép", // NEW
  taskNotes: "Ghi chú", // NEW
  taskNotesHint: "Ghi lại diễn biến, việc cần làm tiếp, hoặc điều cần bàn với đồng nghiệp.", // NEW
  taskNotesEmpty: "Chưa có ghi chú nào.", // NEW
  taskSchedule: "Thời gian", // NEW
  taskSaved: "Đã lưu công việc.", // NEW
  openFullPage: "Mở toàn trang", // NEW
  closeTaskPanel: "Đóng bảng chi tiết", // NEW
  backToBoard: "Quay lại bảng công việc", // NEW
  createdAtLabel: "Tạo lúc", // NEW
  updatedAtLabel: "Cập nhật lúc", // NEW
  taskNotManageable:
    "Bạn chỉ có thể xem công việc này. Người tạo hoặc người nhận việc mới sửa được.", // NEW
  // Workspace shell terms — NEW pending humanities review
  quickSearch: "Tìm nhanh", // NEW
  openBranch: "Mở chuyên đề", // NEW
  recent: "Gần đây", // NEW
  shortcuts: "Lối tắt", // NEW
  themeToggle: "Đổi giao diện sáng/tối", // NEW
  // The rail's review pip counts open review tasks, not unread anything. It
  // was announcing "Hàng chờ duyệt (3 chưa đọc)".
  pipOpenTasks: "việc đang chờ", // NEW
  // The theme button is a toggle, so its accessible name is the thing being
  // switched on ("dark theme, on/off"), not the act.
  darkTheme: "Giao diện tối", // NEW
  palettePlaceholder: "Gõ để tìm trang tri thức hoặc mở nhanh một mục…", // NEW
  paletteNoResults: "Không tìm thấy kết quả.", // NEW
  paletteSearching: "Đang tìm…", // NEW
  paletteSearchFailed: "Không tìm được — hãy thử lại.", // NEW
  paletteHintTree: "trang tri thức", // NEW
  paletteHintGo: "mở nhanh", // NEW
  yourSpaces: "không gian", // NEW
  modules: "Mô-đun", // NEW
  navPanel: "Bảng điều hướng", // NEW
  // Knowledge graph / wiki-links — NEW pending humanities review
  graph: "Liên kết tri thức", // NEW
  graphIntro: "Mỗi chấm là một trang tri thức, mỗi đường là một liên kết giữa hai trang.", // NEW
  backlinks: "Liên kết đến trang này", // NEW
  outgoingLinks: "Trang này liên kết đến", // NEW
  openOnMap: "Xem trang này trên bản đồ tri thức", // NEW
  wikiMissing: "Chưa có trang này", // NEW
  wikiHelp: "Gõ [[Tiêu đề trang]] để liên kết sang một trang tri thức khác.", // NEW
  legend: "Chú giải", // NEW
  filterByBranch: "Lọc theo chuyên đề", // NEW
  allBranches: "Tất cả chuyên đề", // NEW
  filterByTitle: "Lọc theo tên trang", // NEW
  filterByTag: "Lọc theo thẻ", // NEW
  allTags: "Tất cả thẻ", // NEW
  graphEmpty: "Chưa có trang tri thức nào để vẽ bản đồ.", // NEW
  graphNoMatch: "Không có trang nào khớp bộ lọc. Xóa bớt điều kiện để xem lại.", // NEW
  noBacklinks: "Chưa trang nào liên kết đến trang này.", // NEW
  navKnowledge: "Tri thức", // NEW
  // Renamed: "Dự án & công việc" lumped the day's rotating tasks together with
  // long-horizon project management, and readers could not tell why hạn chót
  // sat beside bảng công việc. The group now names only the day's work; the
  // project side moved to navProjects.
  navWork: "Công việc hằng ngày", // NEW
  navBranches: "Danh sách chuyên đề", // NEW
  openGraph: "Mở bản đồ tri thức", // NEW
  // Bản đồ tri thức: thao tác và tùy chỉnh hiển thị — NEW pending humanities review
  graphSettings: "Tùy chỉnh bản đồ", // NEW
  graphLinkTypes: "Loại liên kết", // NEW
  graphZoomIn: "Phóng to bản đồ", // NEW
  graphZoomOut: "Thu nhỏ bản đồ", // NEW
  graphZoomReset: "Vừa khung", // NEW
  graphResetSettings: "Khôi phục mặc định", // NEW
  graphPinnedOne: "Đã ghim tại chỗ", // NEW
  graphUnpinned: "Đã bỏ ghim", // NEW
  graphHelp: (_key: string) =>
    "Kéo một chấm để ghim nó vào chỗ mới. Lăn chuột để phóng to. Kéo nền để di chuyển bản đồ.", // NEW
  // The map is one tab stop; the arrows move between marks inside it. Saying
  // "Tab để đi giữa các trang" was both wrong and a promise of two hundred
  // presses of it.
  graphKeyboardHelp:
    "Bàn phím: Tab để vào bản đồ, các phím mũi tên để đi giữa các trang, Enter để mở, P để ghim hoặc bỏ ghim, Esc để đóng thẻ xem trước.", // NEW
  graphMotionOff: "Bản đồ đang đứng yên theo thiết lập giảm chuyển động của máy bạn.", // NEW
  graphZoomGroup: "Thu phóng bản đồ", // NEW
  graphTouchHelp:
    "Chạm một chấm để mở trang. Kéo một chấm để ghim nó vào chỗ mới. Kéo nền để di chuyển bản đồ.", // NEW
  // Bảng điều khiển bản đồ: ba mục Bộ lọc / Hiển thị / Lực, dựng theo bảng
  // điều khiển của Obsidian. NEW pending humanities review.
  graphPanelFilters: "Bộ lọc", // NEW
  graphPanelGroups: "Nhóm màu", // NEW
  graphPanelDisplay: "Hiển thị", // NEW
  graphPanelForces: "Lực", // NEW
  graphClosePanel: "Đóng bảng tùy chỉnh", // NEW
  graphArrows: "Mũi tên chỉ hướng", // NEW
  graphTextFade: "Ngưỡng hiện tên", // NEW
  graphTextFadeHelp:
    "Kéo sang trái: chỉ những trang nhiều liên kết mới hiện tên, các tên khác hiện dần khi bạn phóng to. Kéo sang phải: hiện mọi tên.", // NEW
  graphNodeSize: "Cỡ chấm", // NEW
  graphLinkThickness: "Độ dày đường", // NEW
  graphReplay: "Xếp lại bản đồ", // NEW
  graphCentreForce: "Lực kéo về giữa", // NEW
  graphRepelForce: "Lực đẩy nhau", // NEW
  graphLinkForce: "Lực của liên kết", // NEW
  graphLinkDistance: "Độ dài liên kết", // NEW
  graphLocalDepth: "Độ sâu liên kết", // NEW
  graphShowOrphans: "Hiện trang chưa có liên kết", // NEW
  graphNewGroup: "Thêm nhóm màu", // NEW
  graphGroupName: "Tên nhóm", // NEW
  graphGroupQuery: "Điều kiện", // NEW
  graphGroupQueryHelp: "Tên trang, tag:<tên thẻ> hoặc branch:<tên chuyên đề>", // NEW
  graphRemoveGroup: "Xóa nhóm", // NEW
  graphContextOpen: "Mở trang", // NEW
  graphContextLocal: "Mở liên kết quanh trang này", // NEW
  graphContextPin: "Ghim tại chỗ", // NEW
  graphContextUnpin: "Bỏ ghim", // NEW
  // Câu hỏi xác nhận trước những việc không có đường lui. Mỗi câu nói rõ điều
  // gì sẽ thay đổi và có lấy lại được hay không — không bao giờ hỏi trống
  // "Bạn có chắc không?". NEW pending humanities review.
  cancel: "Hủy bỏ", // NEW
  confirmArchiveNodeTitle: "Lưu trữ trang tri thức này?", // NEW
  confirmArchiveNodeBody:
    "Trang sẽ rời khỏi cây tri thức, bản đồ tri thức và bản xuất bản. Nội dung vẫn được giữ trong hệ thống, nhưng trạng thái lưu trữ là điểm dừng: không có nút mở lại trang.", // NEW
  confirmMergeTitle: "Gộp trang này vào trang chuẩn?", // NEW
  confirmMergeBody:
    "Trang hiện tại sẽ được lưu trữ và người đọc được dẫn sang trang chuẩn; các liên kết trang này trỏ đi sẽ bị xóa. Không thể hoàn tác.", // NEW
  confirmPublishVerifiedTitle: "Xuất bản ở mức Đã thẩm định?", // NEW
  confirmPublishVerifiedBody:
    "Tư liệu sẽ thành một trang tri thức mang nhãn Đã thẩm định — nhãn này nói với người đọc rằng nguồn dẫn đã được kiểm chứng. Hồ sơ hiệu đính đóng lại sau khi xuất bản.", // NEW
  confirmPublishUnverifiedTitle: "Xuất bản ở mức Chưa thẩm định?", // NEW
  confirmPublishUnverifiedBody:
    "Tư liệu sẽ thành một trang tri thức hiện ngay trên cây tri thức cho cả nhóm, mang nhãn Chưa thẩm định. Hồ sơ hiệu đính đóng lại sau khi xuất bản.", // NEW
  confirmRejectCurationTitle: "Đóng hồ sơ hiệu đính này ở mức Không dùng?", // NEW
  confirmRejectCurationBody:
    "Tư liệu sẽ không được xuất bản và không hiệu đính tiếp được. Tệp gốc vẫn nằm trong Kho tư liệu. Không thể hoàn tác — muốn dùng lại phải gửi tư liệu mới.", // NEW
  confirmConvertGapTitle: "Chuyển đề xuất này thành chuyên đề?", // NEW
  confirmConvertGapBody:
    "Đề xuất sẽ được gắn vào chuyên đề đã chọn và khép lại. Không có nút mở lại đề xuất.", // NEW
  confirmRejectGapTitle: "Không dùng đề xuất bổ sung này?", // NEW
  confirmRejectGapBody:
    "Đề xuất chuyển sang Không dùng và không tiếp nhận lại được. Người gửi vẫn xem được đề xuất của mình.", // NEW
  confirmArchiveGapTitle: "Lưu trữ đề xuất bổ sung này?", // NEW
  confirmArchiveGapBody:
    "Đề xuất rời khỏi danh sách tiếp nhận và không xử lý tiếp được. Không thể hoàn tác.", // NEW
  confirmDeclineLoanTitle: "Từ chối yêu cầu mượn này?", // NEW
  confirmDeclineLoanBody:
    "Người mượn sẽ nhận thông báo bị từ chối và phiếu mượn đóng lại. Muốn mượn nữa, họ phải gửi yêu cầu mới.", // NEW
  confirmMarkReturnedTitle: "Ghi nhận đã nhận lại sách?", // NEW
  confirmMarkReturnedBody:
    "Phiếu mượn đóng lại ở trạng thái Đã trả và đầu sách trở lại Sẵn sàng. Không thể hoàn tác — nếu ghi nhầm thì phải lập phiếu mượn mới.", // NEW
  // Gap-request triage: where a converted request lands — NEW pending humanities review
  gapConvertTargetBranch: "— chuyên đề đích", // NEW
  gapConvertTargetNode: "Hoặc trang tri thức đích", // NEW
  chooseBranch: "— chọn chuyên đề —", // NEW
  chooseNoNode: "— không chọn —", // NEW
  // Curation workbench and the publish decision (NEW — not yet in vocabulary-vi.md)
  correctedTextHint: "Mỗi lần lưu tạo một bản mới trong chuỗi hiệu đính (không ghi đè).", // NEW
  correctedTextSaved: "Đã lưu bản hiệu đính mới.", // NEW
  curationNotYours: "Việc hiệu đính này chưa được giao cho bạn, nên các ô bên dưới chỉ để đọc.", // NEW
  curationNotUnderCorrection: "Bản này không còn ở bước hiệu đính, nên không sửa được nữa.", // NEW
  draftSaved: "Đã lưu bản thảo.", // NEW
  chooseBranchNotYet: "— chưa chọn —", // NEW
  sentForReview: "Đã gửi duyệt. Quản trị/Vận hành sẽ ra quyết định xuất bản.", // NEW
  chooseEditor: "— chọn biên tập viên —", // NEW
  publishDecision: "Quyết định", // NEW
  // Node Detail: admin panel, manual creation, save conflict (NEW — not yet in vocabulary-vi.md)
  nodeAdmin: "Quản trị trang", // NEW
  mergeCanonicalLabel: "— chọn trang chuẩn", // NEW
  chooseCanonicalNode: "— chọn trang chuẩn —", // NEW
  addNode: "Thêm trang tri thức", // NEW
  reloadNewVersion: "Tải lại phiên bản mới", // NEW
  // Node Detail: document export — NEW pending humanities review
  exportNode: "Xuất tài liệu", // NEW
  exportDocx: "Xuất docx", // NEW
  exportPdf: "Xuất pdf", // NEW
  exporting: "Đang xuất tệp…", // NEW
  downloadExport: "Tải tệp đã xuất", // NEW
  exportWarnings: "Lưu ý:", // NEW
  // The two failures of an export. They were the only error sentences written
  // inline in a component rather than here.
  exportStatusFailed: "Không kiểm tra được trạng thái xuất tệp.", // NEW
  exportFailed: "Xuất tệp thất bại. Vui lòng thử lại.", // NEW
  // Deadline form: save results (NEW — not yet in vocabulary-vi.md).
  // The three reminder offsets moved to reminderLabel() below — they are a
  // translation of a wire value, not a phrase a screen composes.
  changesSaved: "Đã lưu thay đổi.", // NEW
  deadlineCreated: "Đã tạo hạn chót.", // NEW
  // Sign-in picker (NEW — not yet in vocabulary-vi.md)
  loginPickerCaption: "Chọn một thành viên để đăng nhập", // NEW
  signingIn: "Đang đăng nhập…", // NEW
  // Loan request result — NEW pending humanities review
  loanRequestSent: "Đã gửi yêu cầu mượn. Vui lòng chờ thủ thư duyệt.", // NEW
  // Sign-in page (NEW — not yet in vocabulary-vi.md)
  loginTagline: "Nền tảng lưu trữ và tri thức của nhóm", // NEW — same string as the layout's metadata description
  loginNotInvited: "Tài khoản Google này chưa được mời vào WisdomTree. Liên hệ quản trị viên.", // NEW
  loginFailed: "Đăng nhập không thành công. Vui lòng thử lại.", // NEW
  signInWithGoogle: "Đăng nhập bằng Google", // NEW
  loginDemoHeading: "Bản demo — chọn một thành viên để đăng nhập", // NEW
  // Workspace shell: the two rail/palette entries that were still inline
  // (NEW — not yet in vocabulary-vi.md)
  account: "Tài khoản", // NEW
  // The term vocabulary-vi.md approves, and now the only one the app uses: the
  // screen had been "Quản trị" in the rail, the palette and its own h1, and
  // "Bảng quản trị" in the link back to it from System Health.
  adminConsole: "Quản trị hệ thống", // NEW
  // Library: archive view, folders, drag-drop filing (NEW — not yet in vocabulary-vi.md)
  viewingArchivedNotice: "Đang xem tư liệu đã thu hồi.", // NEW
  backToLibrary: "Quay lại tư liệu số", // NEW
  viewArchivedLink: "Xem tư liệu đã thu hồi", // NEW
  folderEmptyTitle: "Thư mục trống.", // NEW
  folderEmptyHint:
    "Chuyển tư liệu vào đây từ trang chi tiết, hoặc tải tệp lên rồi chọn thư mục này.", // NEW
  libraryEmptyDropHint: "Hoặc kéo tệp thả vào đây.", // NEW
  newFolder: "Thư mục mới", // NEW
  folderName: "Tên thư mục", // NEW
  dropVeilPrompt: "Thả tệp để lưu vào kho…", // NEW
  dropSpaceQuestion: "Lưu vào kho nào?", // NEW
  close: "Đóng", // NEW
  // Upload progress and failures. The two prefixes are completed in the
  // component: "Đang gửi 1/3: tên-tệp", "Không gửi được: a.pdf, b.pdf. …"
  // (NEW — not yet in vocabulary-vi.md)
  uploadSendingPrefix: "Đang gửi", // NEW
  uploadFailedPrefix: "Không gửi được:", // NEW
  uploadRetryChooseHint: "Chọn lại các tệp đó để thử lần nữa.", // NEW
  uploadNoFileChosen: "Hãy chọn ít nhất một tệp để tải lên.", // NEW
  uploadRetryDropHint: "Kéo thả lại các tệp đó để thử lần nữa.", // NEW
  optionalSuffix: "(không bắt buộc)", // NEW
  // Source detail: extraction, versions, restore, filing, nomination
  // (NEW — not yet in vocabulary-vi.md)
  extractionNoText: "Chưa đọc được nội dung", // NEW
  extractionNoTextDetail:
    "Tệp được lưu và tải xuống bình thường; hệ thống chưa đọc được chữ bên trong nên tìm toàn văn chưa quét tệp này.", // NEW
  sourceWithdrawnNotice: "Tư liệu đã được thu hồi — không tải xuống được.", // NEW
  storedVersionsHeading: "Các bản đã lưu", // NEW
  versionColumn: "Bản", // NEW
  restoreHeading: "Khôi phục", // NEW
  restoreSource: "Khôi phục tư liệu", // NEW
  confirmRestoreSourceTitle: "Khôi phục tư liệu này?", // NEW
  confirmRestoreSourceBody: "Tư liệu sẽ trở lại thư viện và tải xuống được như trước khi thu hồi.", // NEW
  fileAndFolderHeading: "Tệp và thư mục", // NEW
  moveFolder: "Chuyển thư mục", // NEW
  folderRootOption: "— Gốc kho —", // NEW
  moveAction: "Chuyển", // NEW
  uploadNewVersion: "Tải bản mới", // NEW
  nominateCta: "Đề cử lên cây tri thức", // NEW
  nominateSent: "Đã đề cử. Quản trị viên sẽ giao biên tập viên hiệu đính.", // NEW
  nominatedAwaitingAssign: "Đã đề cử — chờ giao", // NEW
  revertNominateCta: "Rút đề cử",
  revertNominateSent: "Đã rút đề cử, tư liệu trở lại trạng thái lưu trữ.",
  sourceNotNominated: "Tư liệu chưa được đề cử.",
  sourceAlreadyPromoted: "Tư liệu đã xuất bản lên cây tri thức, không thể rút đề cử.",
  nextStepColumn: "Bước tiếp theo", // NEW
  // What happens to this file next, one sentence per state — the values of
  // nextActionLabel in src/lib/source-status.ts. NEW pending humanities review.
  nextActionArchived: "Đã thu hồi.", // NEW
  nextActionReading: "Hệ thống đang đọc nội dung tệp.", // NEW
  nextActionStored: "Đã lưu — dùng được ngay. Bạn có thể đề cử đưa lên cây tri thức.", // NEW
  nextActionNominated: "Đã đề cử — chờ giao biên tập viên.", // NEW
  nextActionUnderCorrection: "Đang hiệu đính.", // NEW
  nextActionReadyForReview: "Chờ duyệt xuất bản.", // NEW
  nextActionPromoted: "Đã xuất bản lên cây tri thức.", // NEW
  nextActionRejected: "Đề cử không được duyệt — tệp vẫn được lưu.", // NEW
  // Node export: the one converter warning said in consequences
  // (NEW — not yet in vocabulary-vi.md)
  exportOtherWarning: "tệp đã xuất nhưng có phần chưa chuẩn", // NEW
  exportPandocMissing:
    "máy chủ chưa cài pandoc nên tệp xuất là bản HTML đơn giản, không phải docx/pdf.", // NEW
  // Admin Console: headings and the health table (NEW — not yet in vocabulary-vi.md)
  membersHeading: "Thành viên", // NEW
  auditHeading: "Nhật ký hệ thống", // NEW
  healthHeading: "Sức khoẻ hệ thống", // NEW
  healthDatabase: "Cơ sở dữ liệu", // NEW
  healthDbOk: "Hoạt động bình thường", // NEW
  healthDbDown: "Không kết nối được", // NEW
  healthJobs: "Công việc nền", // NEW
  healthJobsEmpty: "Chưa có công việc nào", // NEW
  healthOverdueLoans: "Phiếu mượn quá hạn", // NEW
  healthOutbox: "Sự kiện chờ gửi", // NEW
  healthLastExport: "Xuất dữ liệu gần nhất", // NEW
  healthNoExport: "Chưa xuất lần nào", // NEW
  healthBackup: "Sao lưu", // NEW
  healthBackupNotConfigured: "Chưa cấu hình sao lưu", // NEW
  healthDegraded: "Thành phần suy giảm", // NEW
  healthNone: "Không có", // NEW
  // Audit trail (NEW — not yet in vocabulary-vi.md)
  auditEmpty: "Chưa có sự kiện nào được ghi lại.", // NEW
  treeSearchEmpty: "Không tìm thấy trang tri thức nào.", // NEW
  treeSearchEmptyHint: "Thử một từ khóa khác, hoặc mở danh sách chuyên đề để duyệt theo chủ đề.", // NEW
  noCorrectedText: "Chưa có bản hiệu đính.", // NEW
  noDraft: "Chưa có bản thảo.", // NEW
  noDraftCannotPublish: "Chưa có bản thảo — không thể xuất bản.", // NEW
  timeColumn: "Thời điểm", // NEW
  actorColumn: "Người thực hiện", // NEW
  actionColumn: "Hành động", // NEW
  targetColumn: "Đối tượng", // NEW
  detailsColumn: "Chi tiết", // NEW
  systemActor: "Hệ thống", // NEW — no actor on the row (a system job)
  // NEW — System Health screen (`/admin/health`) and the readable audit trail.
  // The health screen answers what this app knows about ITSELF; the metric
  // stack the team runs beside it (Prometheus/Grafana/Loki) answers the rest,
  // which is why background job counts left this page entirely.
  healthPageTitle: "Sức khoẻ hệ thống", // NEW
  healthPageIntro:
    "Những gì chính ứng dụng tự biết về mình. Số liệu vận hành chi tiết nằm ở hệ thống theo dõi riêng.", // NEW
  healthOpen: "Xem sức khoẻ hệ thống", // NEW
  healthBackToAdmin: "Về Quản trị hệ thống", // NEW
  healthCheckedAt: "Số liệu đọc lúc", // NEW
  healthUptime: "Thời gian chạy liên tục", // NEW
  healthUptimeHint: "Tính từ lần khởi động máy chủ gần nhất.", // NEW
  healthReviewWaiting: "Việc chờ duyệt", // NEW
  healthReviewWaitingHint: "Hồ sơ đang nằm trong hàng đợi duyệt.", // NEW
  healthOverdueLoansHint: "Phiếu mượn đã qua hạn trả mà chưa ghi nhận trả sách.", // NEW
  healthOutboxHint: "Thông báo đã ghi nhận nhưng chưa gửi đi.", // NEW
  healthDatabaseHint: "Máy chủ có đọc được cơ sở dữ liệu hay không.", // NEW
  healthLastExportHint: "Lần đưa cây tri thức ra bản xuất bản gần nhất.", // NEW
  healthBackupHint: "Bản sao lưu dữ liệu gần nhất.", // NEW
  healthDegradedHint: "Thành phần thiếu hoặc chạy ở chế độ hạn chế.", // NEW
  // The service names a degraded component in English for the operator log;
  // on screen the reader gets the consequence in their own language.
  healthPandocMissing: "Chưa cài pandoc: tệp xuất ra là bản HTML đơn giản, không phải docx/pdf.", // NEW
  healthPdfEngineMissing: "Chưa có bộ tạo PDF: bản xuất PDF là bản HTML đơn giản.", // NEW
  healthAllWell: "Mọi thứ đang bình thường", // NEW
  healthNeedsAttention: "Có mục cần xem lại", // NEW
  auditOpenTarget: "Mở", // NEW — the link text is the object's own name; this is its aria hint
  auditNoDetails: "Không có chi tiết", // NEW
  auditBefore: "Trước khi đổi", // NEW — a payload that recorded only the old value
  auditAfter: "Sau khi đổi", // NEW — a payload that recorded only the new value
  auditChange: "Thay đổi", // NEW — a details payload that records only an old and a new value
  auditChangeFromTo: "từ", // NEW — "từ X sang Y", built in audit-log.tsx
  auditChangeTo: "sang", // NEW
  auditIdPrefix: "mã", // NEW
  auditEmptyValue: "để trống", // NEW
  auditYes: "có", // NEW
  auditNo: "không", // NEW
  loadMore: "Tải thêm", // NEW
  // Team spaces and membership admin (NEW — not yet in vocabulary-vi.md)
  spaceCreated: "Đã tạo kho.", // NEW
  spacesEmptyTitle: "Chưa có kho nào.", // NEW
  spacesEmptyHint: "Tạo kho đầu tiên bằng biểu mẫu bên dưới.", // NEW
  spaceNameColumn: "Tên kho", // NEW
  memberCountColumn: "Số thành viên", // NEW
  newSpaceName: "Tên kho mới", // NEW
  createSpace: "Tạo kho", // NEW
  spaceMembersHeading: "Thành viên theo kho", // NEW
  spaceMembersFirstHint: "Tạo một kho trước, rồi thêm thành viên tại đây.", // NEW
  spaceMembersEmpty: "Kho này chưa có thành viên.", // NEW
  membersLoadFailed: "Không tải được danh sách thành viên.", // NEW
  roleColumn: "Vai trò", // NEW
  actionsColumn: "Thao tác", // NEW
  removeFromSpace: "Gỡ khỏi kho", // NEW
  confirmRemoveMemberTitle: "Gỡ thành viên khỏi kho?", // NEW
  // The member's name precedes this in the dialog: "«Tên» sẽ không còn…"
  confirmRemoveMemberBody: "sẽ không còn xem hoặc nộp tư liệu trong kho này. Có thể thêm lại sau.", // NEW
  memberRemoved: "Đã gỡ thành viên.", // NEW
  addMember: "Thêm thành viên", // NEW
  chooseMember: "— Chọn thành viên —", // NEW
  memberAdded: "Đã thêm thành viên.", // NEW
  addAction: "Thêm", // NEW
  // Member accounts admin (NEW — not yet in vocabulary-vi.md)
  inviteMember: "Mời thành viên", // NEW
  inviteSent: "Đã mời thành viên. Người này đăng nhập bằng Google với email đã mời.", // NEW
  email: "Email", // NEW
  displayNameLabel: "Tên hiển thị", // NEW
  // Completed with the member's name: "Vai trò của «Tên»"
  roleOfPrefix: "Vai trò của", // NEW
  changeRole: "Đổi vai trò", // NEW
  roleChanged: "Đã đổi vai trò.", // NEW
  userDisabledBadge: "Đã vô hiệu hoá", // NEW
  userInvitedBadge: "Đã mời — chưa đăng nhập", // NEW
  userActiveBadge: "Đang hoạt động", // NEW
  reenableUser: "Kích hoạt lại", // NEW
  userReenabledOk: "Đã kích hoạt lại tài khoản.", // NEW
  disableUser: "Vô hiệu hoá", // NEW
  confirmDisableUserTitle: "Vô hiệu hoá tài khoản?", // NEW
  // The member's name precedes this in the dialog: "«Tên» sẽ không đăng nhập…"
  confirmDisableUserBody:
    "sẽ không đăng nhập được cho đến khi được kích hoạt lại. Dữ liệu của người này được giữ nguyên.", // NEW
  userDisabledOk: "Đã vô hiệu hoá tài khoản.", // NEW
  // Account page and profile (NEW — not yet in vocabulary-vi.md)
  profileHeading: "Hồ sơ", // NEW
  roleAssignedNote: "Vai trò do quản trị viên phân.", // NEW
  mySpacesHeading: "Kho của tôi", // NEW
  accountNoSpacesHint: "Bạn chưa thuộc kho nào. Quản trị viên sẽ thêm bạn vào kho của nhóm.", // NEW
  calendarLinkMissing: "Chưa có đường dẫn lịch cho tài khoản này. Bấm nút dưới để tạo.", // NEW
  viewMySubmissions: "Xem tư liệu tôi đã gửi →", // NEW
  profileSaved: "Đã lưu hồ sơ.", // NEW
  zaloIdLabel: "Zalo ID", // NEW
  zaloIdHint: "Dùng để nhận thông báo qua Zalo, nếu bạn bật kênh này.", // NEW
  chooseAvatar: "Chọn ảnh đại diện", // NEW
  avatarConstraint: "PNG, JPEG hoặc WebP, tối đa 2 MB.", // NEW
  regenerateCalendarLink: "Tạo liên kết mới", // NEW
  confirmRegenerateCalendarTitle: "Tạo liên kết lịch mới?", // NEW
  confirmRegenerateCalendarBody:
    "Liên kết cũ sẽ ngừng hoạt động ngay: ứng dụng lịch nào đang dùng nó sẽ không nhận được hạn chót nữa, và bạn cần dán liên kết mới vào đó.", // NEW
  calendarLinkRegenerated: "Đã tạo liên kết mới. Liên kết cũ không còn hoạt động.", // NEW
  // Service and route errors, said in words (NEW — not yet in vocabulary-vi.md)
  sourceNotNominatable: "Tư liệu này không ở trạng thái có thể đề cử.", // NEW
  sourceAlreadyNominated: "Tư liệu này đã được đề cử.", // NEW
  folderNameTaken: "Đã có thư mục tên này ở đây.", // NEW
  folderNameRequired: "Vui lòng nhập tên thư mục.", // NEW
  folderParentMissing: "Thư mục cha không tồn tại trong kho này.", // NEW
  folderNotEmpty: "Thư mục còn nội dung — chuyển hết ra trước khi xoá.", // NEW
  invalidTimeCursor: "Mốc thời gian không hợp lệ.", // NEW
  fileRequired: "Vui lòng chọn tệp.", // NEW
  avatarFileRequired: "Chưa chọn tệp ảnh.", // NEW
  invalidUserChange: "Thay đổi tài khoản không hợp lệ.", // NEW
  invalidProfile: "Thông tin hồ sơ không hợp lệ.", // NEW
  // Lưu trữ chuyên đề đã xong, và hai không gian của thanh điều hướng: việc
  // hằng ngày ở "bảng công việc" khác hẳn với quản lý dự án dài hơi.
  // NEW pending humanities review.
  branchDone: "Chuyên đề đã xong", // NEW
  branchDoneHint:
    "Khi chuyên đề đã làm xong, lưu trữ để nó không còn nằm cạnh các chuyên đề đang làm.", // NEW
  archiveBranch: "Lưu trữ chuyên đề", // NEW
  confirmArchiveBranchTitle: "Lưu trữ chuyên đề này?", // NEW
  confirmArchiveBranchBody:
    "Chuyên đề sẽ rời khỏi danh sách chuyên đề và thanh bên; các trang tri thức bên trong vẫn còn và vẫn tìm được. Không có nút mở lại chuyên đề.", // NEW
  navProjects: "Quản lý dự án", // NEW
  navProjectsHint: "Việc dài hơi của cả dự án", // NEW
  navWorkHint: "Việc nhận và làm trong ngày", // NEW
  // Presence row and the side-panel toggle (NEW — not yet in vocabulary-vi.md).
  // "Đang mở trang này" và không phải "đang sửa": người ta có thể chỉ đọc, và
  // lời cảnh báo nói quá lên một chút sẽ bị bỏ qua sau vài lần.
  presenceHere: "Đang mở trang này:", // NEW
  collapsePanel: "Thu gọn thanh bên", // NEW
  expandPanel: "Mở rộng thanh bên", // NEW
  // Sidebar section headers for the team/personal knowledge split
  navTeamKnowledge: "Kho dự án chung", // NEW
  navTeamGraph: "Liên kết tri thức nhóm", // NEW
  navPersonalSpace: "Không gian của tôi", // NEW
  navPersonalGraph: "Liên kết ghi chú của tôi", // NEW
  navPersonalNotes: "Ghi chú cá nhân", // NEW
  personalBranchEmpty: "Bạn chưa có ghi chú cá nhân nào.", // NEW
  // Graph page scope tabs
  graphScopeTeam: "Tri thức nhóm", // NEW
  graphScopePersonal: "Ghi chú cá nhân", // NEW
} as const;
