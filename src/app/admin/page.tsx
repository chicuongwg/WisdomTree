import { notFound } from "next/navigation";
import { requireUser, toPrincipal } from "@/lib/page";
import { listAllMembers, listMemberSpaces } from "@/modules/storage/service";
import { SpaceAdmin } from "@/app/components/space-admin";

// Screen: Admin Console (`/admin`, admin-op-screen-specs.md) — Content tab:
// team spaces and their memberships. The System tab is a later batch.
export default async function AdminPage() {
  const user = await requireUser();
  if (user.role !== "admin_op") notFound();

  const actor = toPrincipal(user);
  // listMemberSpaces: Admin/Op is unscoped, so this is every space.
  const [spaces, allMembers] = await Promise.all([listMemberSpaces(actor), listAllMembers(actor)]);

  return (
    <main className="page">
      {/* TODO(vi): move to src/lib/vi.ts */}
      <h1>Quản trị</h1>
      <SpaceAdmin spaces={spaces} allMembers={allMembers} />
      <section className="panel">
        {/* TODO(vi): move to src/lib/vi.ts */}
        <h2>Hệ thống</h2>
        {/* TODO: System tab (users, audit, config) lands in a later batch. */}
        <p className="muted">Phần cấu hình hệ thống sẽ có trong bản sau.</p>
      </section>
    </main>
  );
}
