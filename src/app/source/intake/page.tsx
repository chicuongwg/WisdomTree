import { requireUser, toPrincipal } from "@/lib/page";
import { listMemberSpaces } from "@/modules/storage/service";
import { T } from "@/lib/vi";
import { UploadForm } from "@/app/components/upload-form";
import { GapRequestForm } from "@/app/components/gap-request-form";

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
      {/* The second intake mode (user-screen-specs.md § intake mode selector):
          no file to hand over, just a request for something missing. */}
      <div className="panel">
        <h2>{T.gapRequest}</h2>
        <p className="muted">{T.gapRequestHint}</p>
        <GapRequestForm />
      </div>
    </main>
  );
}
