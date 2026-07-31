import { T } from "./vi";

const vi = {
  ...T,
  candidateReview: "Bản trích xuất cá nhân",
  aiLibrarian: "Thủ thư AI",
  workspaceKind: "Phân loại không gian làm việc",
  skipNavigation: "Bỏ qua điều hướng",
  roleUser: "Thành viên",
  roleEditor: "Biên tập viên",
  roleAdmin: "Quản trị viên",
};

export function shellCopy() {
  return vi;
}
