import { requireUser, toPrincipal } from "@/lib/page";
import { listMemberSpaces } from "@/modules/storage/service";
import { T } from "@/lib/vi";
import { UploadForm } from "@/app/components/upload-form";

export const metadata = { title: T.sourceIntake };

// Screen: Source Intake (`/source/intake`) — upload into a member space;
// store-first: the item is available in Library the moment upload returns.
export default async function SourceIntakePage() {
  const user = await requireUser();
  const spaces = await listMemberSpaces(toPrincipal(user));
  return (
    <main className="page">
      <h1>{T.sourceIntake}</h1>
      <div className="panel">
        <p className="muted">
          Tệp tối đa 100 MB. Tư liệu có thể tải xuống ngay sau khi lưu, không cần chờ xử lý.
        </p>
        <UploadForm spaces={spaces} />
      </div>
    </main>
  );
}
