import { requireUser } from "@/lib/page";
import { LibrarianForm } from "@/app/components/librarian-form";

export const metadata = { title: "Thủ thư AI" };

export default async function LibrarianPage() {
  await requireUser();
  return (
    <main className="page">
      <h1>Thủ thư AI</h1>
      <p className="muted">
        Câu trả lời chỉ dùng các ghi chú chính và tư liệu bạn được phép đọc. Mỗi câu trả lời kèm
        liên kết tới nguồn.
      </p>
      <LibrarianForm />
    </main>
  );
}
