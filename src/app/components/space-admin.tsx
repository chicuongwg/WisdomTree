"use client";

import { useEffect, useState } from "react";
import { T, userRoleLabel } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { SayMutation } from "./say";
import { ConfirmButton } from "./confirm-button";
import { Empty } from "./empty";

// Admin Console: team spaces + membership. The server page hands down every
// space and every enabled member; this picks one space and manages who is in
// it against the /api/spaces/{spaceId}/members routes.

type Space = { id: string; name: string; type: string };
type Member = { id: string; displayName: string; role: string };
type SpaceMember = {
  userId: string;
  displayName: string;
  role: string;
  memberRole: "viewer" | "contributor" | "manager";
};

export function SpaceAdmin({ spaces, allMembers }: { spaces: Space[]; allMembers: Member[] }) {
  const create = useMutation();
  const change = useMutation();
  const [name, setName] = useState("");
  const [spaceId, setSpaceId] = useState(spaces[0]?.id ?? "");
  const [members, setMembers] = useState<SpaceMember[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [addId, setAddId] = useState("");
  // Bumped after add/remove so the effect refetches; useMutation's own
  // router.refresh() only re-renders the server props, not this fetch.
  const [tick, setTick] = useState(0);

  // A space created or deleted elsewhere: keep the selection valid.
  useEffect(() => {
    if (spaceId && !spaces.some((s) => s.id === spaceId)) setSpaceId(spaces[0]?.id ?? "");
    if (!spaceId && spaces[0]) setSpaceId(spaces[0].id);
  }, [spaces, spaceId]);

  useEffect(() => {
    if (!spaceId) {
      setMembers(null);
      return;
    }
    let alive = true;
    setLoadFailed(false);
    // The old rows stay on screen while the new ones are fetched. Clearing to
    // null first collapsed the table to nothing and re-expanded it on every
    // add, every removal and every change of space — the page jumped under the
    // hand that had just pressed something.
    void fetch(`/api/spaces/${spaceId}/members`)
      .then(async (res) => {
        if (!res.ok) throw new Error("load");
        return (await res.json()) as SpaceMember[];
      })
      .then((rows) => alive && setMembers(rows))
      // A list that would not load is not an empty list: resolving to [] here
      // printed "chưa có thành viên" about a space that may be full of them.
      .catch(() => alive && setLoadFailed(true));
    return () => {
      alive = false;
    };
  }, [spaceId, tick]);

  const candidates = allMembers.filter((m) => !(members ?? []).some((sm) => sm.userId === m.id));

  async function createSpace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await create.run("/api/spaces", { body: { name }, ok: T.spaceCreated })) setName("");
  }

  return (
    <>
      <section className="panel">
        <h2>{T.space}</h2>
        {spaces.length === 0 ? (
          <Empty title={T.spacesEmptyTitle} hint={T.spacesEmptyHint} panel={false} />
        ) : (
          <div className="record-scroll">
            <table className="list">
              <thead>
                <tr>
                  <th scope="col">{T.spaceNameColumn}</th>
                  <th scope="col">{T.memberCountColumn}</th>
                </tr>
              </thead>
              <tbody>
                {spaces.map((s) => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td>
                      {/* ponytail: no member-count service function — the count
                          is only known for the selected space, whose member
                          list this component already fetched. */}
                      {s.id === spaceId ? (
                        (members?.length ?? T.loading)
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <form onSubmit={createSpace}>
          <SayMutation m={create} />
          <div className="field">
            <label htmlFor="sa-name">{T.newSpaceName}</label>
            <input
              id="sa-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={create.busy || !name.trim()}>
            {create.busy ? T.loading : T.createSpace}
          </button>
        </form>
      </section>

      <section className="panel">
        <h2>{T.spaceMembersHeading}</h2>
        {spaces.length === 0 ? (
          <p className="muted">{T.spaceMembersFirstHint}</p>
        ) : (
          <>
            <SayMutation m={change} />
            <div className="field">
              <label htmlFor="sa-space">{T.space}</label>
              <select id="sa-space" value={spaceId} onChange={(e) => setSpaceId(e.target.value)}>
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            {loadFailed ? (
              <p className="error-text" role="alert">
                {T.membersLoadFailed}{" "}
                <button type="button" className="secondary" onClick={() => setTick((t) => t + 1)}>
                  {T.retry}
                </button>
              </p>
            ) : members === null ? (
              <p className="muted">{T.loading}</p>
            ) : members.length === 0 ? (
              <Empty title={T.spaceMembersEmpty} panel={false} />
            ) : (
              <div className="record-scroll">
                <table className="list">
                  <thead>
                    <tr>
                      <th scope="col">{T.memberColumn}</th>
                      <th scope="col">{T.roleColumn}</th>
                      <th scope="col">Space role</th>
                      <th scope="col">
                        <span className="muted">{T.actionsColumn}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.userId}>
                        <td>{m.displayName}</td>
                        <td>{userRoleLabel(m.role)}</td>
                        <td>
                          <select
                            aria-label={`Space role · ${m.displayName}`}
                            value={m.memberRole}
                            disabled={change.busy}
                            onChange={(event) => {
                              void change
                                .run(`/api/spaces/${spaceId}/members/${m.userId}`, {
                                  method: "PATCH",
                                  body: { memberRole: event.target.value },
                                  ok: T.save,
                                })
                                .then((done) => done && setTick((tick) => tick + 1));
                            }}
                          >
                            <option value="viewer">viewer</option>
                            <option value="contributor">contributor</option>
                            <option value="manager">manager</option>
                          </select>
                        </td>
                        <td>
                          <ConfirmButton
                            label={T.removeFromSpace}
                            title={T.confirmRemoveMemberTitle}
                            body={`${m.displayName} ${T.confirmRemoveMemberBody}`}
                            className="danger"
                            disabled={change.busy}
                            onConfirm={() => {
                              void change
                                .run(`/api/spaces/${spaceId}/members/${m.userId}`, {
                                  method: "DELETE",
                                  ok: T.memberRemoved,
                                })
                                .then((done) => done && setTick((t) => t + 1));
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {candidates.length > 0 && members !== null && (
              <div className="button-row">
                <div className="field">
                  <label htmlFor="sa-add">{T.addMember}</label>
                  <select id="sa-add" value={addId} onChange={(e) => setAddId(e.target.value)}>
                    <option value="">{T.chooseMember}</option>
                    {candidates.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.displayName} · {userRoleLabel(m.role)}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={change.busy || !addId}
                  onClick={() => {
                    void change
                      .run(`/api/spaces/${spaceId}/members`, {
                        body: { userId: addId },
                        ok: T.memberAdded,
                      })
                      .then((done) => {
                        if (done) {
                          setAddId("");
                          setTick((t) => t + 1);
                        }
                      });
                  }}
                >
                  {change.busy ? T.loading : T.addAction}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
