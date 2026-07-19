import { requireUser } from "@/lib/page";
import { notFound } from "next/navigation";
import { T } from "@/lib/vi";
import { BranchForm } from "@/app/components/branch-form";

// Screen: Create Branch (`/tree/branch/new`) — Editor, Admin/Op.
export default async function CreateBranchPage() {
  const user = await requireUser();
  if (user.role !== "editor" && user.role !== "admin_op") notFound();

  return (
    <main className="page">
      <h1>{T.createBranch}</h1>
      <p className="muted">
        Chuyên đề là ngữ cảnh chủ đề cho các trang tri thức. Sau khi tạo, bạn có thể thêm trang mới
        hoặc xuất bản từ tư liệu đã hiệu đính.
      </p>
      <div className="panel">
        <BranchForm />
      </div>
    </main>
  );
}
