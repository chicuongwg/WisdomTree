import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownView } from "@/app/components/ui-next";
import { ApiError } from "@/lib/errors";
import { getPublicNote } from "@/modules/application";

export default async function PublishedNotePage({ params }: { params: Promise<{ slug: string }> }) {
  try {
    const note = await getPublicNote((await params).slug);
    return (
      <main className="page published-research published-research--note">
        <p className="published-research__back">
          <Link href="/p">Nghiên cứu đã công bố</Link>
        </p>
        <h1>{note.title}</h1>
        <p className="published-research__metadata">
          {note.project.name} · Phiên bản công khai {note.revisionNumber}
        </p>
        {note.summary ? <p>{note.summary}</p> : null}
        <article className="published-research__content">
          <MarkdownView content={note.contentMd} />
        </article>
      </main>
    );
  } catch (error) {
    if (error instanceof ApiError && error.code === "not_found") notFound();
    throw error;
  }
}
