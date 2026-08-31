import Link from "next/link";
import { requireUser, toPrincipal } from "@/lib/page";
import { listMemberSpaces } from "@/modules/storage/service";
import { listSpaceReleases } from "@/modules/export/service";
import { Empty } from "@/app/components/empty";
import { ReleaseActions } from "./release-actions";

export const metadata = { title: "Bản phát hành wiki" };

export default async function WikiReleasesPage({
  searchParams,
}: {
  searchParams: Promise<{ space?: string }>;
}) {
  const user = await requireUser();
  const actor = toPrincipal(user);
  const spaces = (await listMemberSpaces(actor)).filter((space) => space.type === "team");
  const requested = (await searchParams).space;
  const selected = spaces.find((space) => space.id === requested) ?? spaces[0];
  const releases = selected ? await listSpaceReleases(actor, selected.id) : [];
  const membership = selected
    ? actor.spaceMemberships.find((item) => item.spaceId === selected.id)
    : undefined;
  const canManage = actor.role === "admin_op" || membership?.role === "manager";

  return (
    <main className="page">
      <h1>Bản phát hành wiki</h1>
      <p className="muted">
        Snapshot Markdown/XML bất biến của các trang chung đã thẩm định và cho phép xuất bản.
      </p>
      {spaces.length === 0 ? (
        <Empty title="Chưa có kho nhóm" hint="Bạn chưa được cấp quyền vào kho nhóm nào." />
      ) : (
        <>
          <nav className="inline" aria-label="Chọn kho nhóm">
            {spaces.map((space) => (
              <Link
                className={space.id === selected?.id ? "button" : undefined}
                href={`/wiki/releases?space=${space.id}`}
                key={space.id}
              >
                {space.name}
              </Link>
            ))}
          </nav>
          <p>
            <ReleaseActions spaceId={selected!.id} canManage={canManage} />
          </p>
          {releases.length === 0 ? (
            <Empty
              title="Chưa có bản phát hành"
              hint="Manager có thể tạo snapshot từ nội dung đã thẩm định."
            />
          ) : (
            <div className="record-scroll">
              <table className="list">
                <thead>
                  <tr>
                    <th scope="col">Phiên bản</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col">Git commit</th>
                    <th scope="col">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {releases.map((release) => (
                    <tr key={release.id}>
                      <td>#{release.releaseNo}</td>
                      <td>{release.status}</td>
                      <td>
                        <code>{release.commitSha?.slice(0, 12) ?? "—"}</code>
                      </td>
                      <td>
                        {release.status === "released" && (
                          <ReleaseActions
                            spaceId={selected!.id}
                            releaseId={release.id}
                            canManage={canManage}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  );
}
