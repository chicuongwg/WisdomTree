"use client";

import { useState } from "react";

type Answer = {
  answer: string;
  model: string;
  citations: Array<{ id: string; title: string; href: string; refLabel?: string }>;
};

export function LibrarianForm() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/librarian/answer", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ question }),
    });
    const body = (await response.json().catch(() => null)) as
      | Answer
      | { message?: string }
      | null;
    if (!response.ok) {
      setError(body && "message" in body ? (body.message ?? "Không thể hỏi thủ thư.") : "Không thể hỏi thủ thư.");
    } else {
      setAnswer(body as Answer);
    }
    setBusy(false);
  }

  return (
    <>
      <form onSubmit={submit}>
        <div className="field">
          <label htmlFor="librarian-question">Câu hỏi</label>
          <textarea
            id="librarian-question"
            rows={4}
            required
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            disabled={busy}
          />
        </div>
        <button type="submit" disabled={busy}>
          {busy ? "Đang tìm…" : "Hỏi thủ thư"}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {answer && (
        <section className="panel">
          <h2>Trả lời</h2>
          <p>{answer.answer}</p>
          <h3>Nguồn đã dùng</h3>
          {answer.citations.length ? (
            <ol>
              {answer.citations.map((citation) => (
                <li key={`${citation.id}-${citation.refLabel ?? ""}`}>
                  <a href={citation.href}>{citation.title}</a>
                  {citation.refLabel ? ` — ${citation.refLabel}` : ""}
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted">Không có nguồn phù hợp.</p>
          )}
          <p className="muted">Model: {answer.model}</p>
        </section>
      )}
    </>
  );
}
