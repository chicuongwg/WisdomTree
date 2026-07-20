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
type SpaceMember = { userId: string; displayName: string; role: string };

export function SpaceAdmin({ spaces, allMembers }: { spaces: Space[]; allMembers: Member[] }) {
  const create = useMutation();
  const change = useMutation();
  const [name, setName] = useState("");
  const [spaceId, setSpaceId] = useState(spaces[0]?.id ?? "");
  const [members, setMembers] = useState<SpaceMember[] | null>(null);
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
    setMembers(null);
    void fetch(`/api/spaces/${spaceId}/members`)
      .then(async (res) => (res.ok ? ((await res.json()) as SpaceMember[]) : []))
      .catch(() => [] as SpaceMember[])
      .then((rows) => alive && setMembers(rows));
    return () => {
      alive = false;
    };
  }, [spaceId, tick]);

  const candidates = allMembers.filter((m) => !(members ?? []).some((sm) => sm.userId === m.id));

  async function createSpace(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // TODO(vi): move to src/lib/vi.ts
    if (await create.run("/api/spaces", { body: { name }, ok: "Đã tạo kho." })) setName("");
  }

  return (
    <>
      <section className="panel">
        <h2>{T.space}</h2>
        {spaces.length === 0 ? (
          // TODO(vi): move to src/lib/vi.ts
          <Empty title="Chưa có kho nào." hint="Tạo kho đầu tiên bằng biểu mẫu bên dưới." panel={false} />
        ) : (
          <div className="record-scroll">
            <table className="list">
              <thead>
                <tr>
                  {/* TODO(vi): move to src/lib/vi.ts */}
                  <th scope="col">Tên kho</th>
                  <th scope="col">Số thành viên</th>
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
                      {s.id === spaceId ? (members?.length ?? T.loading) : <span className="muted">—</span>}
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
            {/* TODO(vi): move to src/lib/vi.ts */}
            <label htmlFor="sa-name">Tên kho mới</label>
            <input id="sa-name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <button type="submit" disabled={create.busy || !name.trim()}>
            {/* TODO(vi): move to src/lib/vi.ts */}
            {create.busy ? T.loading : "Tạo kho"}
          </button>
        </form>
      </section>

      <section className="panel">
        {/* TODO(vi): move to src/lib/vi.ts */}
        <h2>Thành viên theo kho</h2>
        {spaces.length === 0 ? (
          // TODO(vi): move to src/lib/vi.ts
          <p className="muted">Tạo một kho trước, rồi thêm thành viên tại đây.</p>
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
            {members === null ? (
              <p className="muted">{T.loading}</p>
            ) : members.length === 0 ? (
              // TODO(vi): move to src/lib/vi.ts
              <Empty title="Kho này chưa có thành viên." panel={false} />
            ) : (
              <div className="record-scroll">
                <table className="list">
                  <thead>
                    <tr>
                      <th scope="col">Thành viên</th>
                      {/* TODO(vi): move to src/lib/vi.ts */}
                      <th scope="col">Vai trò</th>
                      <th scope="col">
                        <span className="muted">Thao tác</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => (
                      <tr key={m.userId}>
                        <td>{m.displayName}</td>
                        <td>{userRoleLabel(m.role)}</td>
                        <td>
                          <ConfirmButton
                            // TODO(vi): move to src/lib/vi.ts
                            label="Gỡ khỏi kho"
                            title="Gỡ thành viên khỏi kho?"
                            body={`${m.displayName} sẽ không còn xem hoặc nộp tư liệu trong kho này. Có thể thêm lại sau.`}
                            className="danger"
                            disabled={change.busy}
                            onConfirm={() => {
                              void change
                                .run(`/api/spaces/${spaceId}/members/${m.userId}`, {
                                  method: "DELETE",
                                  // TODO(vi): move to src/lib/vi.ts
                                  ok: "Đã gỡ thành viên.",
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
                  {/* TODO(vi): move to src/lib/vi.ts */}
                  <label htmlFor="sa-add">Thêm thành viên</label>
                  <select id="sa-add" value={addId} onChange={(e) => setAddId(e.target.value)}>
                    {/* TODO(vi): move to src/lib/vi.ts */}
                    <option value="">— Chọn thành viên —</option>
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
                      // TODO(vi): move to src/lib/vi.ts
                      .run(`/api/spaces/${spaceId}/members`, { body: { userId: addId }, ok: "Đã thêm thành viên." })
                      .then((done) => {
                        if (done) {
                          setAddId("");
                          setTick((t) => t + 1);
                        }
                      });
                  }}
                >
                  {/* TODO(vi): move to src/lib/vi.ts */}
                  {change.busy ? T.loading : "Thêm"}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
