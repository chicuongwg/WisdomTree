import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, toPrincipal } from "@/lib/page";
import { T } from "@/lib/vi";
import { listAllMembers, listMemberSpaces } from "@/modules/storage/service";
import { listAuditEvents, listReviewerVaults, listUsers } from "@/modules/auth/admin";
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
  const canManageSpaces = user.capabilities.includes("spaces.manage");
  const canManageUsers =
    user.capabilities.includes("users.manage") && user.capabilities.includes("capabilities.manage");
  const canReadAudit = user.capabilities.includes("audit.read");
  if (!canManageSpaces && !canManageUsers && !canReadAudit) notFound();

  const actor = toPrincipal(user);
  const [spaces, allMembers, accounts, audit, reviewerVaults] = await Promise.all([
    canManageSpaces ? listMemberSpaces(actor) : Promise.resolve([]),
    canManageSpaces ? listAllMembers(actor) : Promise.resolve([]),
    canManageUsers ? listUsers(actor) : Promise.resolve([]),
    canReadAudit ? listAuditEvents(actor, { limit: 50 }) : Promise.resolve([]),
    canManageUsers ? listReviewerVaults(actor) : Promise.resolve([]),
  ]);

  const auditRows: AuditRow[] = audit.map((r) => ({
    ...r,
    id: String(r.id),
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <main className="page">
      <h1>{T.adminConsole}</h1>
      {canManageSpaces && <SpaceAdmin spaces={spaces} allMembers={allMembers} />}

      {canManageUsers && (
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
              accessTitle: u.accessTitle,
              reviewerVaultIds: u.reviewerVaultIds,
            }))}
            reviewerVaults={reviewerVaults}
          />
        </section>
      )}

      {canReadAudit && (
        <section className="panel">
          <h2>{T.auditHeading}</h2>
          <AuditLog initial={auditRows} />
        </section>
      )}

      {/* Health moved to a page of its own (`/admin/health`), laid out as a
          dashboard. The console keeps the doorway so the section is still
          found where readers learned to look for it. */}
      {user.capabilities.includes("system.operate") && (
        <section className="panel">
          <h2>{T.healthHeading}</h2>
          <p className="muted">{T.healthPageIntro}</p>
          <p>
            <Link href="/admin/health">{T.healthOpen}</Link>
          </p>
        </section>
      )}
    </main>
  );
}
