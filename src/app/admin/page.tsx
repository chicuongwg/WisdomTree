import { notFound } from "next/navigation";
import { requireUser, toPrincipal } from "@/lib/page";
import { T, when } from "@/lib/vi";
import { listAllMembers, listMemberSpaces } from "@/modules/storage/service";
import { listAuditEvents, listUsers } from "@/modules/auth/admin";
import { databaseReachable, healthReport } from "@/modules/export/service";
import { SpaceAdmin } from "@/app/components/space-admin";
import { UserAdmin } from "@/app/components/user-admin";
import { AuditLog, type AuditRow } from "@/app/components/audit-log";

// Screen: Admin Console (`/admin`, admin-op-screen-specs.md) — Content
// (team spaces + memberships) then System (members, audit trail, health).
// One page, headings only.
// ponytail: tabs when the page outgrows scrolling.
export default async function AdminPage() {
  const user = await requireUser();
  if (user.role !== "admin_op") notFound();

  const actor = toPrincipal(user);
  // listMemberSpaces: Admin/Op is unscoped, so this is every space.
  const [spaces, allMembers, accounts, audit, health, dbOk] = await Promise.all([
    listMemberSpaces(actor),
    listAllMembers(actor),
    listUsers(actor),
    listAuditEvents(actor, { limit: 50 }),
    healthReport(actor),
    databaseReachable(),
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
          }))}
        />
      </section>

      <section className="panel">
        <h2>{T.auditHeading}</h2>
        <AuditLog initial={auditRows} />
      </section>

      <section className="panel">
        <h2>{T.healthHeading}</h2>
        <div className="record-scroll">
          <table className="list">
            <tbody>
              <tr>
                <th scope="row">{T.healthDatabase}</th>
                <td>
                  {dbOk ? (
                    <span className="badge tone-done">{T.healthDbOk}</span>
                  ) : (
                    <span className="badge tone-attention">{T.healthDbDown}</span>
                  )}
                </td>
              </tr>
              <tr>
                <th scope="row">{T.healthJobs}</th>
                <td>
                  {Object.keys(health.jobCounts).length === 0 ? (
                    <span className="muted">{T.healthJobsEmpty}</span>
                  ) : (
                    // The raw jobType/state keys stay: an operator surface,
                    // same rule as the audit trail's action column.
                    Object.entries(health.jobCounts).map(([jobType, states]) => (
                      <div key={jobType}>
                        <code className="muted">{jobType}</code>{" "}
                        {Object.entries(states)
                          .map(([state, n]) => `${state}: ${n}`)
                          .join(" · ")}
                      </div>
                    ))
                  )}
                </td>
              </tr>
              <tr>
                <th scope="row">{T.healthOverdueLoans}</th>
                <td>{health.overdueLoanCount}</td>
              </tr>
              <tr>
                <th scope="row">{T.healthOutbox}</th>
                <td>{health.outboxUndispatchedCount}</td>
              </tr>
              <tr>
                <th scope="row">{T.healthLastExport}</th>
                <td>
                  {health.lastExport ? (
                    <>
                      <code className="muted">{health.lastExport.state}</code> · {when(health.lastExport.updatedAt)}
                      {health.lastExport.commitSha && (
                        <>
                          {" "}
                          · <code className="muted">{health.lastExport.commitSha.slice(0, 12)}</code>
                        </>
                      )}
                    </>
                  ) : (
                    <span className="muted">{T.healthNoExport}</span>
                  )}
                </td>
              </tr>
              <tr>
                <th scope="row">{T.healthBackup}</th>
                <td>
                  {health.backupStatus === "not_configured" ? (
                    <span className="muted">{T.healthBackupNotConfigured}</span>
                  ) : (
                    <>
                      <code className="muted">{health.backupStatus}</code> · {when(health.lastBackupAt)}
                    </>
                  )}
                </td>
              </tr>
              <tr>
                <th scope="row">{T.healthDegraded}</th>
                <td>
                  {health.degradedComponents.length === 0 ? (
                    <span className="muted">{T.healthNone}</span>
                  ) : (
                    health.degradedComponents.map((c) => (
                      <div key={c}>
                        <code className="muted">{c}</code>
                      </div>
                    ))
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
