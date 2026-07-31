import { requireUser, toPrincipal } from "@/lib/page";
import { listBranches } from "@/modules/knowledge/service";
import { listPersonalCandidates } from "@/modules/storage/candidates";
import { CandidateReviewList } from "@/app/components/candidate-review-list";

export const metadata = { title: "Bản trích xuất chờ đưa vào cây cá nhân" };

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
      <h1>Bản trích xuất chờ đưa vào cây cá nhân</h1>
      <p className="muted">
        Bản trích xuất chỉ để kiểm tra. Nội dung này không thể sửa và chưa xuất hiện trên graph.
        Khi chấp nhận, hệ thống tạo một trang chưa thẩm định trong cây cá nhân; đây không phải bước
        duyệt để xuất bản lên cây chung.
      </p>
      <CandidateReviewList candidates={candidates} branches={personalBranches} />
    </main>
  );
}
