"use client";

import { useState } from "react";
import { T, userRoleLabel } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { SayMutation } from "./say";
import { ConfirmButton } from "./confirm-button";

// Admin Console, System section: every account and the two levers an
// Admin/Op has over one — role and enabled/disabled. The guards worth
// seeing (last_admin, self_disable) live server-side in modules/auth/admin;
// this surface just relays their messages through SayMutation.

type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  disabled: boolean;
};

const ROLES = ["user", "editor", "admin_op"] as const;

export function UserAdmin({ users }: { users: AdminUser[] }) {
  const change = useMutation();
  // Each row's pending role pick, only while it differs from the record.
  const [picks, setPicks] = useState<Record<string, string>>({});

  return (
    <>
      <SayMutation m={change} />
      <div className="record-scroll">
        <table className="list">
          <thead>
            <tr>
              {/* TODO(vi): move to src/lib/vi.ts */}
              <th scope="col">Thành viên</th>
              <th scope="col">Email</th>
              <th scope="col">Vai trò</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">
                <span className="muted">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const pick = picks[u.id] ?? u.role;
              return (
                <tr key={u.id} className={u.disabled ? "muted" : undefined}>
                  <td>{u.displayName}</td>
                  <td>{u.email}</td>
                  <td>
                    <div className="button-row">
                      <select
                        // TODO(vi): move to src/lib/vi.ts
                        aria-label={`Vai trò của ${u.displayName}`}
                        value={pick}
                        disabled={change.busy}
                        onChange={(e) => setPicks((p) => ({ ...p, [u.id]: e.target.value }))}
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {userRoleLabel(r)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="secondary"
                        disabled={change.busy || pick === u.role}
                        onClick={() => {
                          void change
                            .run(`/api/admin/users/${u.id}`, {
                              method: "PATCH",
                              body: { role: pick },
                              // TODO(vi): move to src/lib/vi.ts
                              ok: "Đã đổi vai trò.",
                            })
                            .then((done) => {
                              // Success: the refreshed server row now carries the
                              // pick, so drop the local override either way it
                              // resolves — on failure the select snaps back to
                              // the truth instead of lying next to the error.
                              if (done) setPicks(({ [u.id]: _, ...rest }) => rest);
                            });
                        }}
                      >
                        {/* TODO(vi): move to src/lib/vi.ts */}
                        Đổi vai trò
                      </button>
                    </div>
                  </td>
                  <td>
                    {u.disabled ? (
                      // TODO(vi): move to src/lib/vi.ts
                      <span className="badge tone-stopped">Đã vô hiệu hoá</span>
                    ) : (
                      // TODO(vi): move to src/lib/vi.ts
                      <span className="badge tone-done">Đang hoạt động</span>
                    )}
                  </td>
                  <td>
                    {u.disabled ? (
                      <button
                        type="button"
                        className="secondary"
                        disabled={change.busy}
                        onClick={() => {
                          void change.run(`/api/admin/users/${u.id}`, {
                            method: "PATCH",
                            body: { disabled: false },
                            // TODO(vi): move to src/lib/vi.ts
                            ok: "Đã kích hoạt lại tài khoản.",
                          });
                        }}
                      >
                        {/* TODO(vi): move to src/lib/vi.ts */}
                        {change.busy ? T.loading : "Kích hoạt lại"}
                      </button>
                    ) : (
                      <ConfirmButton
                        // TODO(vi): move to src/lib/vi.ts
                        label="Vô hiệu hoá"
                        title="Vô hiệu hoá tài khoản?"
                        body={`${u.displayName} sẽ không đăng nhập được cho đến khi được kích hoạt lại. Dữ liệu của người này được giữ nguyên.`}
                        className="danger"
                        disabled={change.busy}
                        onConfirm={() => {
                          void change.run(`/api/admin/users/${u.id}`, {
                            method: "PATCH",
                            body: { disabled: true },
                            // TODO(vi): move to src/lib/vi.ts
                            ok: "Đã vô hiệu hoá tài khoản.",
                          });
                        }}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
