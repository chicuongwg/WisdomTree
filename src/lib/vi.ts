// User-facing Vietnamese copy, per docs/ui/vocabulary-vi.md — the UI never
// shows a raw internal term. Terms marked NEW are not yet in the vocabulary
// doc and are flagged for humanities review in the step-2 report.

export const T = {
  appName: "WisdomTree",
  home: "Trang chủ",
  space: "Kho",
  library: "Kho tư liệu",
  catalog: "Thư viện",
  catalogItem: "Đầu sách",
  loanTicket: "Phiếu mượn",
  source: "Tư liệu",
  sourceIntake: "Gửi tư liệu",
  mySubmissions: "Tư liệu tôi đã gửi",
  storedItem: "Tư liệu đã lưu",
  librarianDesk: "Bàn thủ thư",
  gapRequest: "Đề xuất bổ sung",
  accessDenied: "Không có quyền truy cập",
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
  noMatches: "Không tìm thấy mục nào khớp với bộ lọc.",
  clearFilters: "Xoá bộ lọc",
  libraryEmptyTitle: "Kho tư liệu này chưa có gì.",
  libraryEmptyHint: "Tải lên tài liệu đầu tiên — tệp xem và tải được ngay, không cần chờ xử lý.",
  uploadCta: "Gửi tư liệu",
  catalogEmptyHint: "Thư viện chưa có đầu sách nào. Liên hệ thủ thư để bổ sung.",
  // Empty states, one per screen (NEW — not yet in vocabulary-vi.md)
  homeLoansEmptyTitle: "Bạn chưa mượn cuốn sách nào.",
  homeLoansEmptyHint: "Tìm sách trong thư viện rồi gửi yêu cầu mượn; thủ thư sẽ duyệt giúp bạn.",
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
  // Knowledge tree terms (vocabulary-vi.md § Term Map)
  tree: "Cây tri thức",
  node: "Trang tri thức",
  branch: "Chuyên đề",
  markdownDraft: "Bản thảo",
  publish: "Xuất bản",
  reviewQueue: "Hàng chờ duyệt",
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
  taskType: "Loại việc", // NEW
  openItem: "Mở", // NEW
  triage: "Tiếp nhận", // NEW
  convertToBranch: "Chuyển thành chuyên đề", // NEW
  contentMd: "Nội dung (Markdown)", // NEW
  suggestedBranch: "Chuyên đề đề xuất", // NEW
  preview: "Xem trước", // NEW
  // Notify + PM terms; Deadline "Hạn chót" and Comment "Thảo luận" come from
  // vocabulary-vi.md § Term Map, the rest are NEW pending humanities review.
  deadline: "Hạn chót",
  comments: "Thảo luận",
  addComment: "Gửi thảo luận", // NEW
  newComment: "Viết thảo luận mới", // NEW
  reply: "Trả lời", // NEW
  // Mentions are typed into the comment itself; the picker is gone.
  mentionHelp: "Gõ @ rồi tên thành viên (ví dụ @Phạm Thu Hương) để nhắc họ vào thảo luận này.", // NEW
  notificationCenter: "Thông báo", // NEW
  markRead: "Đánh dấu đã đọc", // NEW
  unread: "Chưa đọc", // NEW
  notificationPrefs: "Tùy chọn nhận thông báo", // NEW
  board: "Bảng công việc", // NEW
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
  calendarSubscribeHint: "Dán đường dẫn này vào ứng dụng lịch (Google Calendar, Outlook…) để tự động nhận các hạn chót.", // NEW
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
  taskNotManageable: "Bạn chỉ có thể xem công việc này. Người tạo hoặc người nhận việc mới sửa được.", // NEW
  // Workspace shell terms — NEW pending humanities review
  quickSearch: "Tìm nhanh", // NEW
  openBranch: "Mở chuyên đề", // NEW
  recent: "Gần đây", // NEW
  shortcuts: "Lối tắt", // NEW
  themeToggle: "Đổi giao diện sáng/tối", // NEW
  // The theme button is a toggle, so its accessible name is the thing being
  // switched on ("dark theme, on/off"), not the act.
  darkTheme: "Giao diện tối", // NEW
  palettePlaceholder: "Gõ để tìm trang tri thức hoặc mở nhanh một mục…", // NEW
  paletteNoResults: "Không tìm thấy kết quả.", // NEW
  paletteSearching: "Đang tìm…", // NEW
  paletteHintTree: "trang tri thức", // NEW
  paletteHintGo: "mở nhanh", // NEW
  yourSpaces: "không gian", // NEW
  modules: "Mô-đun", // NEW
  // Knowledge graph / wiki-links — NEW pending humanities review
  graph: "Bản đồ tri thức", // NEW
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
  graphHelp: "Kéo một chấm để ghim nó vào chỗ mới. Giữ Ctrl và lăn chuột để phóng to. Kéo nền để di chuyển bản đồ.", // NEW
  graphKeyboardHelp: "Bàn phím: Tab để đi giữa các trang, Enter để mở, P để ghim hoặc bỏ ghim, Esc để đóng thẻ xem trước.", // NEW
  graphMotionOff: "Bản đồ đang đứng yên theo thiết lập giảm chuyển động của máy bạn.", // NEW
  graphZoomGroup: "Thu phóng bản đồ", // NEW
  graphTouchHelp:
    "Chạm một chấm để mở trang. Kéo một chấm để ghim nó vào chỗ mới. Kéo nền để di chuyển bản đồ.", // NEW
  // Bảng điều khiển bản đồ: ba mục Bộ lọc / Hiển thị / Lực, dựng theo bảng
  // điều khiển của Obsidian. NEW pending humanities review.
  graphPanelFilters: "Bộ lọc", // NEW
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
  // Deadline form: reminder offsets and save results (NEW — not yet in vocabulary-vi.md)
  reminderOneDay: "1 ngày trước", // NEW
  reminderThreeDays: "3 ngày trước", // NEW
  reminderOneWeek: "1 tuần trước", // NEW
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
  adminConsole: "Quản trị", // NEW
  // Library: archive view, folders, drag-drop filing (NEW — not yet in vocabulary-vi.md)
  viewingArchivedNotice: "Đang xem tư liệu đã thu hồi.", // NEW
  backToLibrary: "Quay lại thư viện", // NEW
  viewArchivedLink: "Xem tư liệu đã thu hồi", // NEW
  folderEmptyTitle: "Thư mục trống.", // NEW
  folderEmptyHint: "Chuyển tư liệu vào đây từ trang chi tiết, hoặc tải tệp lên rồi chọn thư mục này.", // NEW
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
  exportPandocMissing: "máy chủ chưa cài pandoc nên tệp xuất là bản HTML đơn giản, không phải docx/pdf.", // NEW
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
  timeColumn: "Thời điểm", // NEW
  actorColumn: "Người thực hiện", // NEW
  actionColumn: "Hành động", // NEW
  targetColumn: "Đối tượng", // NEW
  detailsColumn: "Chi tiết", // NEW
  systemActor: "Hệ thống", // NEW — no actor on the row (a system job)
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
  inviteRoleAria: "Vai trò của thành viên được mời", // NEW
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
} as const;

// State labels. `unprocessable`, trust `candidate/trusted/rejected` come from
// the vocabulary doc; the rest are NEW pending humanities review.
export const extractionLabel: Record<string, string> = {
  pending: "Đang chờ xử lý", // NEW
  processed: "Đã xử lý", // NEW
  unprocessable: "Không xử lý được",
};

export const trustLabel: Record<string, string> = {
  unknown: "Chưa đánh giá", // NEW
  candidate: "Chờ thẩm định",
  trusted: "Đáng tin",
  rejected: "Không dùng",
  archived: "Đã lưu trữ",
};

export const gapStateLabel: Record<string, string> = {
  submitted: "Đã gửi", // NEW
  triaged: "Đã tiếp nhận", // NEW
  converted_to_branch: "Đã chuyển thành chuyên đề", // NEW
  rejected: "Không dùng",
  archived: "Đã lưu trữ",
};

export const loanStateLabel: Record<string, string> = {
  requested: "Chờ duyệt", // NEW
  approved: "Đã duyệt", // NEW
  declined: "Từ chối", // NEW
  borrowed: "Đang mượn", // NEW
  overdue: "Quá hạn", // NEW
  returned: "Đã trả", // NEW
};

export const itemStatusLabel: Record<string, string> = {
  available: "Sẵn sàng", // NEW
  borrowed: "Đang được mượn", // NEW
  lost: "Thất lạc", // NEW
  repair: "Đang sửa chữa", // NEW
};

// Verification labels come verbatim from vocabulary-vi.md § Term Map.
export const verificationLabel: Record<string, string> = {
  no_source: "Chưa có nguồn dẫn",
  unverified: "Chưa thẩm định",
  verified: "Đã thẩm định",
  archived: "Đã lưu trữ",
};

export const curationStateLabel: Record<string, string> = {
  under_correction: "Đang hiệu đính", // NEW
  ready_for_review: "Chờ duyệt xuất bản", // NEW
  promoted: "Đã xuất bản", // NEW
  rejected: "Không dùng",
};

export const reviewStateLabel: Record<string, string> = {
  queued: "Đang chờ", // NEW
  assigned: "Đã giao", // NEW
  in_review: "Đang duyệt", // NEW
  changes_requested: "Cần chỉnh sửa", // NEW
  approved: "Đã duyệt", // NEW
  rejected: "Không dùng",
};

export const reviewTaskTypeLabel: Record<string, string> = {
  correction: "Hiệu đính", // NEW
  gap_triage: "Tiếp nhận đề xuất", // NEW
  publish: "Xuất bản",
  merge: "Gộp trang", // NEW
  archive: "Lưu trữ", // NEW
  operational: "Vận hành", // NEW
};

export const linkTypeLabel: Record<string, string> = {
  related: "Liên quan", // NEW
  supports: "Bổ trợ", // NEW
  contrasts: "Đối chiếu", // NEW
  part_of: "Thuộc về", // NEW
};

export const deadlineTypeLabel: Record<string, string> = {
  conference: "Hội thảo", // NEW
  funding: "Tài trợ", // NEW
  report: "Báo cáo", // NEW
  milestone: "Cột mốc", // NEW
};

export const taskStateLabel: Record<string, string> = {
  todo: "Cần làm", // NEW
  doing: "Đang làm", // NEW
  done: "Hoàn thành", // NEW
  archived: "Đã lưu trữ",
};

/** Weekday column heads, Monday first — the week a Vietnamese calendar shows. */
export const weekdayShort = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]; // NEW

export const channelLabel: Record<string, string> = {
  in_app: "Trong ứng dụng", // NEW
  email: "Email", // NEW
  zalo: "Zalo", // NEW
};

// One user-facing sentence per notification event type (matrix events).
export const notificationEventLabel: Record<string, string> = {
  "source.processing_failed": "Tư liệu bạn gửi không xử lý được (tệp gốc vẫn được lưu)", // NEW
  "source.assigned": "Bạn được giao việc hiệu đính", // NEW
  "source.ready_for_review": "Có tư liệu chờ duyệt xuất bản", // NEW
  "tree.node.published": "Tư liệu bạn gửi đã được xuất bản lên cây tri thức", // NEW
  "loan.approved": "Yêu cầu mượn sách đã được duyệt", // NEW
  "loan.borrowed": "Bạn đã nhận sách; nhớ hạn trả", // NEW
  "loan.returned": "Phiếu mượn đã ghi nhận trả sách", // NEW
  "loan.declined": "Yêu cầu mượn sách bị từ chối", // NEW
  "loan.overdue": "Phiếu mượn đã quá hạn trả", // NEW
  "deadline.approaching": "Sắp đến hạn chót của dự án", // NEW
  "comment.created": "Bạn được nhắc đến trong một thảo luận", // NEW
};

export const roleLabel: Record<string, string> = {
  user: "Thành viên", // NEW
  editor: "Biên tập viên", // NEW
  admin_op: "Quản trị/Vận hành", // NEW
};

// ---------------------------------------------------------------------------
// Guarded lookups — the UI never shows a raw internal term (ui-principles.md).
//
// `map[key] ?? key` was the old fallback and it LEAKS: a key the map has not
// caught up with (a new event type, a new enum member) renders as
// "source.ready_for_review" in a Vietnamese screen. The guarded accessors
// below make a gap loud in development (console.warn) and neutral in
// production (a Vietnamese fallback), never technical.
// ---------------------------------------------------------------------------

/** Neutral Vietnamese stand-ins, used only when a map has no entry. */
const FALLBACK = {
  event: "Cập nhật mới", // NEW
  state: "Không rõ trạng thái", // NEW
  kind: "Không rõ loại", // NEW
  role: "Chưa rõ vai trò", // NEW
  channel: "Kênh khác", // NEW
} as const;

/** The one lookup: warn loudly in dev, degrade to Vietnamese in production. */
function guarded(
  map: Record<string, string>,
  mapName: string,
  key: string | null | undefined,
  fallback: string,
): string {
  if (key != null) {
    const label = map[key];
    if (label !== undefined) return label;
  }
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      `[vi] ${mapName} has no Vietnamese label for ${JSON.stringify(key)} — showing "${fallback}". Add the entry to src/lib/vi.ts.`,
    );
  }
  return fallback;
}

/** Notification event → one user-facing Vietnamese sentence. */
export const eventLabel = (eventType: string | null | undefined): string =>
  guarded(notificationEventLabel, "notificationEventLabel", eventType, FALLBACK.event);

export const extractionStateLabel = (v: string | null | undefined): string =>
  guarded(extractionLabel, "extractionLabel", v, FALLBACK.state);
export const trustStateLabel = (v: string | null | undefined): string =>
  guarded(trustLabel, "trustLabel", v, FALLBACK.state);
export const gapLabel = (v: string | null | undefined): string =>
  guarded(gapStateLabel, "gapStateLabel", v, FALLBACK.state);
export const loanLabel = (v: string | null | undefined): string =>
  guarded(loanStateLabel, "loanStateLabel", v, FALLBACK.state);
export const itemLabel = (v: string | null | undefined): string =>
  guarded(itemStatusLabel, "itemStatusLabel", v, FALLBACK.state);
export const verificationStateLabel = (v: string | null | undefined): string =>
  guarded(verificationLabel, "verificationLabel", v, FALLBACK.state);
export const curationLabel = (v: string | null | undefined): string =>
  guarded(curationStateLabel, "curationStateLabel", v, FALLBACK.state);
export const reviewLabel = (v: string | null | undefined): string =>
  guarded(reviewStateLabel, "reviewStateLabel", v, FALLBACK.state);
export const taskLabel = (v: string | null | undefined): string =>
  guarded(taskStateLabel, "taskStateLabel", v, FALLBACK.state);
export const reviewTypeLabel = (v: string | null | undefined): string =>
  guarded(reviewTaskTypeLabel, "reviewTaskTypeLabel", v, FALLBACK.kind);
export const deadlineKindLabel = (v: string | null | undefined): string =>
  guarded(deadlineTypeLabel, "deadlineTypeLabel", v, FALLBACK.kind);
export const nodeLinkTypeLabel = (v: string | null | undefined): string =>
  guarded(linkTypeLabel, "linkTypeLabel", v, FALLBACK.kind);
export const userRoleLabel = (v: string | null | undefined): string =>
  guarded(roleLabel, "roleLabel", v, FALLBACK.role);
export const notifyChannelLabel = (v: string | null | undefined): string =>
  guarded(channelLabel, "channelLabel", v, FALLBACK.channel);

// ---------------------------------------------------------------------------
// Dates. `toLocaleString("vi-VN")` with no options prints seconds — every row
// of every table read `20:26:57 20/7/2026`. Nobody schedules to the second, so
// the app has exactly two shapes: a moment, and a day.
// ---------------------------------------------------------------------------

/** A moment: `20:26 20/7/2026`. For "last updated", "stored at", timestamps. */
export const when = (d: Date | string | null | undefined): string =>
  d ? new Date(d).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—";

/** A day: `20/7/2026`. For due dates and anything a person says out loud. */
export const day = (d: Date | string | null | undefined): string =>
  d ? new Date(d).toLocaleDateString("vi-VN") : "—";

/**
 * How far off a deadline is, in words. A date chip that only changes colour
 * says nothing to a reader who cannot see the colour — globals.css is explicit
 * that a state is never carried by hue alone.
 */
export function untilLabel(due: Date, now: Date): string | null {
  const days = Math.ceil((due.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return `Quá hạn ${-days} ngày`;
  if (days === 0) return "Hôm nay";
  if (days === 1) return "Ngày mai";
  if (days <= 7) return `Còn ${days} ngày`;
  return null; // far off: the date alone is the whole story
}

/**
 * How long there is to do the work, in words — the owner's "thời gian cho phép
 * để xử lý công việc". A deadline alone says when to stop; a span says how much
 * room the work has, which is what a workload board is read for.
 *
 * Null when there is no span to speak of (no start, or a start after the
 * deadline, which is a data mistake the card must not dress up as a duration).
 *
 * ponytail: whole days by wall-clock difference, and weeks only at exact
 * multiples of seven. "1 tuần 3 ngày" is a precision nobody plans in, and the
 * seven-day rounding a fancier version needs is where off-by-one bugs live.
 */
export function spanLabel(start: Date | string, due: Date | string): string | null {
  const days = Math.round(
    (new Date(due).getTime() - new Date(start).getTime()) / 86_400_000,
  );
  if (days < 0) return null;
  if (days === 0) return "Trong ngày";
  if (days % 7 === 0) return `${days / 7} tuần`;
  return `${days} ngày`;
}

// ---------------------------------------------------------------------------
// Badge tones — the visual half of a state label.
//
// A tone is assigned by MEANING, not one colour per enum value: thirty-odd
// states across nine maps collapse onto five tones, so a reader learns the
// vocabulary once and it holds everywhere.
//
//   waiting   — queued, nothing has happened yet (the quietest chip)
//   active    — someone is working on it right now (chàm indigo)
//   attention — a human must act, or it is at risk (hổ phách amber)
//   done      — finished, and finished well (canopy green)
//   stopped   — ended without succeeding, or withdrawn (son vermilion)
//
// Two states keep their own long-standing treatment instead: `archived` stays
// subdued (design-system.md: archived is subdued, not alarming — never
// vermilion) and `no_source` keeps its dashed unfilled edge, which already
// encodes "incomplete" by shape.
//
// Colour is never the only carrier: the chip still prints the Vietnamese word,
// and globals.css adds a left bar / ring to separate the tones whose colours
// converge under deuteranopia. Kind, type, role and count chips are NOT states
// and stay on the neutral chip on purpose — tinting them would spend the
// vocabulary on things that have no lifecycle.
// ---------------------------------------------------------------------------

export type BadgeTone =
  | "waiting"
  | "active"
  | "attention"
  | "done"
  | "stopped"
  | "archived"
  | "no_source";

const TONE_CLASS: Record<BadgeTone, string> = {
  waiting: "badge tone-waiting",
  active: "badge tone-active",
  attention: "badge tone-attention",
  done: "badge tone-done",
  stopped: "badge tone-stopped",
  archived: "badge tone-archived",
  no_source: "badge tone-no-source",
};

/** What an unknown state degrades to — the same neutral chip as before. */
const NEUTRAL_CHIP = "badge muted";

const toneTables = new Map<
  Record<string, string>,
  { name: string; tones: Record<string, BadgeTone> }
>();

/** Bind a label map to its state→tone table, keyed by the map itself. */
function withTones(
  map: Record<string, string>,
  name: string,
  tones: Record<string, BadgeTone>,
): void {
  toneTables.set(map, { name, tones });
}

withTones(extractionLabel, "extractionLabel", {
  pending: "waiting",
  processed: "done",
  unprocessable: "attention",
});

withTones(trustLabel, "trustLabel", {
  unknown: "waiting",
  candidate: "waiting",
  trusted: "done",
  rejected: "stopped",
  archived: "archived",
});

withTones(gapStateLabel, "gapStateLabel", {
  submitted: "waiting",
  triaged: "active",
  converted_to_branch: "done",
  rejected: "stopped",
  archived: "archived",
});

withTones(loanStateLabel, "loanStateLabel", {
  requested: "waiting",
  approved: "done",
  declined: "stopped",
  borrowed: "active",
  overdue: "attention",
  returned: "done",
});

withTones(itemStatusLabel, "itemStatusLabel", {
  available: "done",
  borrowed: "active",
  lost: "stopped",
  repair: "active",
});

withTones(verificationLabel, "verificationLabel", {
  no_source: "no_source",
  unverified: "attention",
  verified: "done",
  archived: "archived",
});

withTones(curationStateLabel, "curationStateLabel", {
  under_correction: "active",
  ready_for_review: "attention",
  promoted: "done",
  rejected: "stopped",
});

withTones(reviewStateLabel, "reviewStateLabel", {
  queued: "waiting",
  assigned: "active",
  in_review: "active",
  changes_requested: "attention",
  approved: "done",
  rejected: "stopped",
});

withTones(taskStateLabel, "taskStateLabel", {
  todo: "waiting",
  doing: "active",
  done: "done",
  archived: "archived",
});

/**
 * The class list for a state badge: `badgeClass(loanStateLabel, state)`.
 *
 * Mirrors `guarded()` above — a state the tone table has not caught up with
 * is loud in development and neutral in production, never a broken chip.
 */
export function badgeClass(
  map: Record<string, string>,
  value: string | null | undefined,
): string {
  const table = toneTables.get(map);
  if (table && value != null) {
    const tone = table.tones[value];
    if (tone !== undefined) return TONE_CLASS[tone];
  }
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      table
        ? `[vi] ${table.name} has no badge tone for ${JSON.stringify(value)} — showing the neutral chip. Add the state to the tone table in src/lib/vi.ts.`
        : `[vi] badgeClass was given a label map with no tone table — showing the neutral chip. Register it with withTones() in src/lib/vi.ts.`,
    );
  }
  return NEUTRAL_CHIP;
}

/**
 * The same chips for the few badges whose tone is derived rather than looked
 * up from an enum (an overdue date, a published flag). Keeps the class strings
 * in this module so no component hardcodes one.
 */
export const badgeToneClass = (tone: BadgeTone): string => TONE_CLASS[tone];
