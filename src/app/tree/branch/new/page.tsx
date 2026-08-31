import { requireUser, toPrincipal } from "@/lib/page";
import { T } from "@/lib/vi";
import { BranchForm } from "@/app/components/branch-form";
import { listMemberSpaces } from "@/modules/storage/service";

export const metadata = { title: T.createBranch };

// Screen: Create Branch (`/tree/branch/new`) — Editor, Admin/Op (team branches) or any user (personal branches).
export default async function CreateBranchPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const canManageTeam =
    user.role === "admin_op" || user.spaceMemberships.some((membership) => membership.role === "manager");
  const defaultScope = canManageTeam
    ? sp.scope === "personal"
      ? "personal"
      : "team"
    : "personal";

  return (
    <main className="page">
      <h1>{defaultScope === "personal" ? "Tạo chuyên đề cá nhân" : T.createBranch}</h1>
      <p className="muted">
        Chuyên đề là ngữ cảnh chủ đề cho các trang tri thức. Sau khi tạo, bạn có thể thêm trang mới
        hoặc xuất bản từ tư liệu đã hiệu đính.
      </p>
      <div className="panel">
        <BranchForm
          scope={defaultScope}
          spaces={
            defaultScope === "team"
              ? (await listMemberSpaces(toPrincipal(user))).filter(
                  (space) =>
                    user.role === "admin_op" ||
                    user.spaceMemberships.some(
                      (membership) => membership.spaceId === space.id && membership.role === "manager",
                    ),
                )
              : []
          }
        />
      </div>
    </main>
  );
}
