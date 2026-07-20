import { notFound } from "next/navigation";
import { requireUser, toPrincipal } from "@/lib/page";
import { when } from "@/lib/vi";
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
      {/* TODO(vi): move to src/lib/vi.ts */}
      <h1>Quản trị</h1>
      <SpaceAdmin spaces={spaces} allMembers={allMembers} />

      <section className="panel">
        {/* TODO(vi): move to src/lib/vi.ts */}
        <h2>Thành viên</h2>
        <UserAdmin
          users={accounts.map((u) => ({
            id: u.id,
            email: u.email,
            displayName: u.displayName,
            role: u.role,
            disabled: u.disabledAt !== null,
          }))}
        />
      </section>

      <section className="panel">
        {/* TODO(vi): move to src/lib/vi.ts */}
        <h2>Nhật ký hệ thống</h2>
        <AuditLog initial={auditRows} />
      </section>

      <section className="panel">
        {/* TODO(vi): move to src/lib/vi.ts */}
        <h2>Sức khoẻ hệ thống</h2>
        <div className="record-scroll">
          <table className="list">
            <tbody>
              <tr>
                {/* TODO(vi): move to src/lib/vi.ts */}
                <th scope="row">Cơ sở dữ liệu</th>
                <td>
                  {dbOk ? (
                    <span className="badge tone-done">Hoạt động bình thường</span>
                  ) : (
                    <span className="badge tone-attention">Không kết nối được</span>
                  )}
                </td>
              </tr>
              <tr>
                {/* TODO(vi): move to src/lib/vi.ts */}
                <th scope="row">Công việc nền</th>
                <td>
                  {Object.keys(health.jobCounts).length === 0 ? (
                    // TODO(vi): move to src/lib/vi.ts
                    <span className="muted">Chưa có công việc nào</span>
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
                {/* TODO(vi): move to src/lib/vi.ts */}
                <th scope="row">Phiếu mượn quá hạn</th>
                <td>{health.overdueLoanCount}</td>
              </tr>
              <tr>
                {/* TODO(vi): move to src/lib/vi.ts */}
                <th scope="row">Sự kiện chờ gửi</th>
                <td>{health.outboxUndispatchedCount}</td>
              </tr>
              <tr>
                {/* TODO(vi): move to src/lib/vi.ts */}
                <th scope="row">Xuất dữ liệu gần nhất</th>
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
                    // TODO(vi): move to src/lib/vi.ts
                    <span className="muted">Chưa xuất lần nào</span>
                  )}
                </td>
              </tr>
              <tr>
                {/* TODO(vi): move to src/lib/vi.ts */}
                <th scope="row">Sao lưu</th>
                <td>
                  {health.backupStatus === "not_configured" ? (
                    // TODO(vi): move to src/lib/vi.ts
                    <span className="muted">Chưa cấu hình sao lưu</span>
                  ) : (
                    <>
                      <code className="muted">{health.backupStatus}</code> · {when(health.lastBackupAt)}
                    </>
                  )}
                </td>
              </tr>
              <tr>
                {/* TODO(vi): move to src/lib/vi.ts */}
                <th scope="row">Thành phần suy giảm</th>
                <td>
                  {health.degradedComponents.length === 0 ? (
                    // TODO(vi): move to src/lib/vi.ts
                    <span className="muted">Không có</span>
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
