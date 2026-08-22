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

const ROLES = ["user", "editor", "admin_op"] as const;
type Role = (typeof ROLES)[number];

type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  disabled: boolean;
  /** True until the person's first Google sign-in claims the row. */
  invited: boolean;
};

export function UserAdmin({ users }: { users: AdminUser[] }) {
  const change = useMutation();
  const [rolePicks, setRolePicks] = useState<Record<string, Role>>({});

  // The invite form's own round trip, kept apart from the table's so its
  // message reads next to the form that caused it.
  const invite = useMutation();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("user");

  return (
    <>
      <h3>{T.inviteMember}</h3>
      <SayMutation m={invite} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void invite
            .run("/api/admin/users/invite", {
              body: { email: inviteEmail, displayName: inviteName, role: inviteRole },
              ok: T.inviteSent,
            })
            .then((done) => {
              if (done) {
                setInviteEmail("");
                setInviteName("");
                setInviteRole("user");
              }
            });
        }}
      >
        <div className="field">
          <label htmlFor="invite-email">{T.email}</label>
          <input
            id="invite-email"
            type="email"
            required
            value={inviteEmail}
            disabled={invite.busy}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="invite-name">{T.displayNameLabel}</label>
          <input
            id="invite-name"
            type="text"
            required
            value={inviteName}
            disabled={invite.busy}
            onChange={(e) => setInviteName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="invite-role">{T.roleColumn}</label>
          <select
            id="invite-role"
            value={inviteRole}
            disabled={invite.busy}
            onChange={(e) => setInviteRole(e.target.value as Role)}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {userRoleLabel(role)}
              </option>
            ))}
          </select>
        </div>
        <p>
          <button type="submit" disabled={invite.busy || !inviteEmail || !inviteName}>
            {invite.busy ? T.loading : T.inviteMember}
          </button>
        </p>
      </form>

      <SayMutation m={change} />
      <div className="record-scroll">
        <table className="list">
          <thead>
            <tr>
              <th scope="col">{T.displayNameLabel}</th>
              <th scope="col">{T.email}</th>
              <th scope="col">{T.roleColumn}</th>
              <th scope="col">{T.state}</th>
              <th scope="col">
                <span className="muted">Thao tác</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const picked = rolePicks[u.id] ?? (u.role as Role);
              return (
                <tr key={u.id}>
                  <td>
                    {u.displayName}
                    {u.invited && <span className="badge muted"> {T.userInvitedBadge}</span>}
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className="button-row">
                      <select
                        aria-label={`${T.roleColumn} — ${u.displayName}`}
                        value={picked}
                        disabled={change.busy}
                        onChange={(e) =>
                          setRolePicks((prev) => ({ ...prev, [u.id]: e.target.value as Role }))
                        }
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {userRoleLabel(role)}
                          </option>
                        ))}
                      </select>
                      {picked !== u.role && (
                        <button
                          type="button"
                          disabled={change.busy}
                          onClick={() =>
                            void change.run(`/api/admin/users/${u.id}`, {
                              method: "PATCH",
                              body: { role: picked },
                              ok: T.roleChanged,
                            })
                          }
                        >
                          {change.busy ? T.loading : T.save}
                        </button>
                      )}
                    </span>
                  </td>
                  <td>{u.disabled ? T.userDisabledBadge : T.userActiveBadge}</td>
                  <td>
                    <ConfirmButton
                      className={u.disabled ? undefined : "danger"}
                      disabled={change.busy}
                      label={u.disabled ? T.reenableUser : T.disableUser}
                      title={u.disabled ? T.reenableUser : T.confirmDisableUserTitle}
                      body={u.disabled ? `${u.displayName} sẽ đăng nhập được trở lại.` : `${u.displayName} ${T.confirmDisableUserBody}`}
                      onConfirm={() =>
                        void change.run(`/api/admin/users/${u.id}`, {
                          method: "PATCH",
                          body: { disabled: !u.disabled },
                          ok: u.disabled ? T.userReenabledOk : T.userDisabledOk,
                        })
                      }
                    />
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
