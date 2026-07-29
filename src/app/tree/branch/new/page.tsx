import { requireUser } from "@/lib/page";
import { notFound } from "next/navigation";
import { T } from "@/lib/vi";
import { BranchForm } from "@/app/components/branch-form";

export const metadata = { title: T.createBranch };

// Screen: Create Branch (`/tree/branch/new`) — Editor, Admin/Op (team branches) or any user (personal branches).
export default async function CreateBranchPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const isEditorOrAdmin = user.role === "editor" || user.role === "admin_op";
  const defaultScope = isEditorOrAdmin ? (sp.scope === "personal" ? "personal" : "team") : "personal";

  return (
    <main className="page">
      <h1>{defaultScope === "personal" ? "Tạo chuyên đề cá nhân" : T.createBranch}</h1>
      <p className="muted">
        Chuyên đề là ngữ cảnh chủ đề cho các trang tri thức. Sau khi tạo, bạn có thể thêm trang mới
        hoặc xuất bản từ tư liệu đã hiệu đính.
      </p>
      <div className="panel">
        <BranchForm scope={defaultScope} />
      </div>
    </main>
  );
}
