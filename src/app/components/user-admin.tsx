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
  /** True until the person's first Google sign-in claims the row. */
  invited: boolean;
  capabilities: string[];
};

const ROLES = ["user", "editor", "admin_op"] as const;
const CAPABILITIES = [
  "capabilities.manage",
  "users.manage",
  "audit.read",
  "catalog.manage",
  "circulation.manage",
  "spaces.manage",
  "content.review",
  "system.operate",
] as const;

export function UserAdmin({ users }: { users: AdminUser[] }) {
  const change = useMutation();
  // Each row's pending role pick, only while it differs from the record.
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [capabilityPicks, setCapabilityPicks] = useState<Record<string, string[]>>({});

  // The invite form's own round trip, kept apart from the table's so its
  // message reads next to the form that caused it.
  const invite = useMutation();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("user");

  return (
    <>
      <h3>{T.inviteMember}</h3>
      <SayMutation m={invite} />
      {/* The plain form layout every other form in the app uses: one labelled
          field per row, each the same width, the button under them. This one
          was a .button-row of three bare placeholder inputs, so the three
          controls came out three different widths on one centred line and
          matched nothing else on the screen — and a placeholder is not a
          label: it leaves the moment you type in the box. */}
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
            onChange={(e) => setInviteRole(e.target.value)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {userRoleLabel(r)}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={invite.busy}>
          {invite.busy ? T.loading : T.inviteMember}
        </button>
      </form>

      <SayMutation m={change} />
      <div className="record-scroll">
        <table className="list">
          <thead>
            <tr>
              <th scope="col">{T.membersHeading}</th>
              <th scope="col">{T.email}</th>
              <th scope="col">{T.roleColumn}</th>
              <th scope="col">Capabilities</th>
              <th scope="col">{T.state}</th>
              <th scope="col">
                <span className="muted">{T.actionsColumn}</span>
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
                        aria-label={`${T.roleOfPrefix} ${u.displayName}`}
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
                              ok: T.roleChanged,
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
                        {T.changeRole}
                      </button>
                    </div>
                  </td>
                  <td>
                    <div className="button-row">
                      <select
                        multiple
                        aria-label={`Capabilities · ${u.displayName}`}
                        value={capabilityPicks[u.id] ?? u.capabilities}
                        disabled={change.busy}
                        onChange={(event) =>
                          setCapabilityPicks((current) => ({
                            ...current,
                            [u.id]: Array.from(event.currentTarget.selectedOptions).map(
                              (option) => option.value,
                            ),
                          }))
                        }
                      >
                        {CAPABILITIES.map((capability) => (
                          <option key={capability} value={capability}>
                            {capability}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="secondary"
                        disabled={change.busy || capabilityPicks[u.id] === undefined}
                        onClick={() => {
                          void change
                            .run(`/api/admin/users/${u.id}/capabilities`, {
                              method: "PATCH",
                              body: { capabilities: capabilityPicks[u.id] ?? u.capabilities },
                              ok: T.save,
                            })
                            .then(
                              (done) =>
                                done &&
                                setCapabilityPicks(({ [u.id]: _, ...rest }) => rest),
                            );
                        }}
                      >
                        {T.save}
                      </button>
                    </div>
                  </td>
                  <td>
                    {u.disabled ? (
                      <span className="badge tone-stopped">{T.userDisabledBadge}</span>
                    ) : u.invited ? (
                      <span className="badge tone-waiting">{T.userInvitedBadge}</span>
                    ) : (
                      <span className="badge tone-done">{T.userActiveBadge}</span>
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
                            ok: T.userReenabledOk,
                          });
                        }}
                      >
                        {change.busy ? T.loading : T.reenableUser}
                      </button>
                    ) : (
                      <ConfirmButton
                        label={T.disableUser}
                        title={T.confirmDisableUserTitle}
                        body={`${u.displayName} ${T.confirmDisableUserBody}`}
                        className="danger"
                        disabled={change.busy}
                        onConfirm={() => {
                          void change.run(`/api/admin/users/${u.id}`, {
                            method: "PATCH",
                            body: { disabled: true },
                            ok: T.userDisabledOk,
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
