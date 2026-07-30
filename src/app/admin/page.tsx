import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, toPrincipal } from "@/lib/page";
import { T } from "@/lib/vi";
import { listAllMembers, listMemberSpaces } from "@/modules/storage/service";
import { listAuditEvents, listUsers } from "@/modules/auth/admin";
import { SpaceAdmin } from "@/app/components/space-admin";
import { UserAdmin } from "@/app/components/user-admin";
import { AuditLog, type AuditRow } from "@/app/components/audit-log";

export const metadata = { title: T.adminConsole };

// Screen: Admin Console (`/admin`, admin-op-screen-specs.md) — Content
// (team spaces + memberships) then System (members, audit trail, health).
// One page, headings only.
// ponytail: tabs when the page outgrows scrolling.
export default async function AdminPage() {
  const user = await requireUser();
  if (user.role !== "admin_op") notFound();

  const actor = toPrincipal(user);
  // listMemberSpaces: Admin/Op is unscoped, so this is every space.
  const [spaces, allMembers, accounts, audit] = await Promise.all([
    listMemberSpaces(actor),
    listAllMembers(actor),
    listUsers(actor),
    listAuditEvents(actor, { limit: 50 }),
  ]);

  const auditRows: AuditRow[] = audit.map((r) => ({
    ...r,
    id: String(r.id),
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <main className="page">
      <h1>{T.adminConsole}</h1>
      <SpaceAdmin spaces={spaces} allMembers={allMembers} />

      <section className="panel">
        <h2>{T.membersHeading}</h2>
        <UserAdmin
          users={accounts.map((u) => ({
            id: u.id,
            email: u.email,
            displayName: u.displayName,
            role: u.role,
            disabled: u.disabledAt !== null,
            invited: u.invited,
            capabilities: u.capabilities,
          }))}
        />
      </section>

      <section className="panel">
        <h2>{T.auditHeading}</h2>
        <AuditLog initial={auditRows} />
      </section>

      {/* Health moved to a page of its own (`/admin/health`), laid out as a
          dashboard. The console keeps the doorway so the section is still
          found where readers learned to look for it. */}
      <section className="panel">
        <h2>{T.healthHeading}</h2>
        <p className="muted">{T.healthPageIntro}</p>
        <p>
          <Link href="/admin/health">{T.healthOpen}</Link>
        </p>
      </section>
    </main>
  );
}
