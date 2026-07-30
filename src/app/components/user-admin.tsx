"use client";

import { useState } from "react";
import { T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { SayMutation } from "./say";
import { ConfirmButton } from "./confirm-button";
import { ACCESS_TITLES, type AccessTitle } from "@/modules/auth/access-titles";

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
  accessTitle: AccessTitle | null;
  reviewerVaultIds: string[];
};

type ReviewerVault = { id: string; name: string };

export function UserAdmin({
  users,
  reviewerVaults,
}: {
  users: AdminUser[];
  reviewerVaults: ReviewerVault[];
}) {
  const change = useMutation();
  const [picks, setPicks] = useState<Record<string, AccessTitle>>({});
  const [reviewerPicks, setReviewerPicks] = useState<Record<string, string[]>>({});

  // The invite form's own round trip, kept apart from the table's so its
  // message reads next to the form that caused it.
  const invite = useMutation();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteTitle, setInviteTitle] = useState<AccessTitle>("member");
  const [inviteReviewerVaultIds, setInviteReviewerVaultIds] = useState<string[]>([]);

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
              body: {
                email: inviteEmail,
                displayName: inviteName,
                accessTitle: inviteTitle,
                reviewerVaultIds: inviteReviewerVaultIds,
              },
              ok: T.inviteSent,
            })
            .then((done) => {
              if (done) {
                setInviteEmail("");
                setInviteName("");
                setInviteTitle("member");
                setInviteReviewerVaultIds([]);
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
          <label htmlFor="invite-role">Chức danh</label>
          <select
            id="invite-role"
            value={inviteTitle}
            disabled={invite.busy}
            onChange={(e) => setInviteTitle(e.target.value as AccessTitle)}
          >
            {ACCESS_TITLES.map((title) => (
              <option key={title.key} value={title.key}>
                {title.label}
              </option>
            ))}
          </select>
        </div>
        {inviteTitle === "reviewer" && (
          <ReviewerVaultPicker
            id="invite-reviewer-vaults"
            vaults={reviewerVaults}
            value={inviteReviewerVaultIds}
            onChange={setInviteReviewerVaultIds}
          />
        )}
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
              <th scope="col">Chức danh</th>
              <th scope="col">{T.state}</th>
              <th scope="col">
                <span className="muted">{T.actionsColumn}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const pick = picks[u.id] ?? u.accessTitle ?? "";
              const selectedReviewerVaults = reviewerPicks[u.id] ?? u.reviewerVaultIds;
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
                        onChange={(e) =>
                          setPicks((p) => ({
                            ...p,
                            [u.id]: e.target.value as AccessTitle,
                          }))
                        }
                      >
                        {u.accessTitle === null && (
                          <option value="" disabled>
                            Cấu hình cũ — chọn chức danh mới
                          </option>
                        )}
                        {ACCESS_TITLES.map((title) => (
                          <option key={title.key} value={title.key}>
                            {title.label}
                          </option>
                        ))}
                      </select>
                      {pick === "reviewer" && (
                        <ReviewerVaultPicker
                          id={`reviewer-vaults-${u.id}`}
                          vaults={reviewerVaults}
                          value={selectedReviewerVaults}
                          onChange={(value) =>
                            setReviewerPicks((current) => ({ ...current, [u.id]: value }))
                          }
                        />
                      )}
                      <button
                        type="button"
                        className="secondary"
                        disabled={
                          change.busy ||
                          !pick ||
                          (pick === u.accessTitle &&
                            selectedReviewerVaults.join() === u.reviewerVaultIds.join())
                        }
                        onClick={() => {
                          void change
                            .run(`/api/admin/users/${u.id}/access-title`, {
                              method: "PATCH",
                              body: {
                                accessTitle: pick,
                                reviewerVaultIds: pick === "reviewer" ? selectedReviewerVaults : [],
                              },
                              ok: T.roleChanged,
                            })
                            .then((done) => {
                              // Success: the refreshed server row now carries the
                              // pick, so drop the local override either way it
                              // resolves — on failure the select snaps back to
                              // the truth instead of lying next to the error.
                              if (done) {
                                setPicks(({ [u.id]: _, ...rest }) => rest);
                                setReviewerPicks(({ [u.id]: _, ...rest }) => rest);
                              }
                            });
                        }}
                      >
                        Áp dụng
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

function ReviewerVaultPicker({
  id,
  vaults,
  value,
  onChange,
}: {
  id: string;
  vaults: ReviewerVault[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <fieldset id={id}>
      <legend>Kho dùng chung được thẩm định</legend>
      {vaults.length === 0 ? (
        <span className="muted">Bạn chưa sở hữu kho dùng chung nào.</span>
      ) : (
        vaults.map((vault) => (
          <label key={vault.id}>
            <input
              type="checkbox"
              checked={value.includes(vault.id)}
              onChange={(event) =>
                onChange(
                  event.currentTarget.checked
                    ? [...value, vault.id]
                    : value.filter((id) => id !== vault.id),
                )
              }
            />
            {vault.name}
          </label>
        ))
      )}
    </fieldset>
  );
}
