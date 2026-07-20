import Link from "next/link";
import { T } from "@/lib/vi";

// Renders inside the root layout, so a signed-in reader keeps the rail and the
// sidebar and is never stranded. The link is for the signed-out shell, which
// has only the brand mark, and for anyone who followed a dead link and wants
// one obvious way on.
export default function NotFound() {
  return (
    <main className="page">
      <h1>Không tìm thấy nội dung này.</h1>
      <p className="muted">Nội dung không tồn tại hoặc không thuộc kho của bạn.</p>
      <div className="button-row">
        <Link className="button" href="/">
          {T.home}
        </Link>
      </div>
    </main>
  );
}
