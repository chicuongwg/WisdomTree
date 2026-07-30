import { requireUser, toPrincipal } from "@/lib/page";
import { listBranches } from "@/modules/knowledge/service";
import { listPersonalCandidates } from "@/modules/storage/candidates";
import { CandidateReviewList } from "@/app/components/candidate-review-list";

export const metadata = { title: "Kho tạm chờ duyệt" };

export default async function CandidateReviewPage() {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const [candidates, branches] = await Promise.all([
    listPersonalCandidates(actor),
    listBranches(actor),
  ]);
  const personalBranches = branches
    .filter((branch) => branch.scope === "personal")
    .map((branch) => ({ id: branch.id, name: branch.name }));

  return (
    <main className="page">
      <h1>Kho tạm chờ duyệt</h1>
      <p className="muted">
        Bản trích xuất chỉ để kiểm tra. Nội dung này không thể sửa và chưa xuất hiện trên graph.
        Khi duyệt và evolve, hệ thống mới tạo bản Markdown chính trong kho cá nhân.
      </p>
      <CandidateReviewList candidates={candidates} branches={personalBranches} />
    </main>
  );
}
