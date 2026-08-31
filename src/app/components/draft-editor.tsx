"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Markdown, type WikiIndex } from "@/lib/markdown";
import { T, translateApiError } from "@/lib/vi";
import { wikiPath } from "@/lib/wiki-path";
import { DiffView } from "./diff-view";

type Snapshot = {
  title: string;
  summary?: string | null;
  sortOrder: number;
  contentMd: string;
  tags: string[];
  links: Array<{ toNodeId: string; linkType: string }>;
};

type Draft = Snapshot & {
  id: string;
  baseVersion: number;
  draftVersion: number;
  state: "editing" | "in_review";
};

type ApiFailure = {
  code?: string;
  message?: string;
  details?: {
    current?: (Partial<Snapshot> & { draftVersion?: number }) | null;
    currentVersion?: number;
  };
};

type Conflict = {
  kind: "draft" | "official";
  currentContent: string;
  currentVersion: number;
};

export function DraftEditor({
  nodeId,
  nodeSlug,
  locale,
  official,
  officialVersion,
  baseContent: initialBaseContent,
  initialDraft,
  reviewRequired,
  wikiIndex,
}: {
  nodeId: string | null;
  nodeSlug: string;
  locale: "vi" | "en";
  official: Snapshot;
  officialVersion: number;
  baseContent: string;
  initialDraft: Draft | null;
  reviewRequired: boolean;
  wikiIndex: WikiIndex;
}) {
  const router = useRouter();
  const start = initialDraft ?? official;
  const [title, setTitle] = useState(start.title);
  const [summary, setSummary] = useState(start.summary ?? "");
  const [sortOrder, setSortOrder] = useState(start.sortOrder);
  const [contentMd, setContentMd] = useState(start.contentMd);
  const [tagsText, setTagsText] = useState(start.tags.join(", "));
  const [draftId, setDraftId] = useState(initialDraft?.id ?? null);
  const [baseVersion, setBaseVersion] = useState(initialDraft?.baseVersion ?? officialVersion);
  const draftVersion = useRef(initialDraft?.draftVersion ?? 0);
  const [state, setState] = useState(initialDraft?.state ?? "editing");
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    initialDraft ? "saved" : "idle",
  );
  const [message, setMessage] = useState("");
  const [baseContent, setBaseContent] = useState(initialBaseContent);
  const [conflict, setConflict] = useState<Conflict | null>(null);

  const snapshot = (): Snapshot => ({
    title,
    summary: summary.trim() || null,
    sortOrder,
    contentMd,
    tags: tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    links: start.links,
  });
  const latestSnapshotSignature = useRef("");
  latestSnapshotSignature.current = JSON.stringify(snapshot());

  function changed(setter: () => void) {
    setter();
    setDirty(true);
    setSaveState("idle");
    setMessage("");
  }

  async function saveNow(): Promise<string | null> {
    if (state !== "editing" || conflict) return draftId;
    const sent = snapshot();
    const sentSignature = JSON.stringify(sent);
    setSaveState("saving");
    const response = await fetch(
      nodeId ? `/api/tree/nodes/${nodeId}/draft?locale=${locale}` : `/api/tree/drafts/${draftId}`,
      {
        method: nodeId ? "PUT" : "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...sent,
          baseVersion,
          expectedDraftVersion: draftVersion.current,
        }),
      },
    );
    const body = (await response.json().catch(() => null)) as (Draft & ApiFailure) | null;
    if (!response.ok) {
      const current = body?.details?.current;
      if (body?.code === "draft_version_conflict" && current) {
        setConflict({
          kind: "draft",
          currentContent: current.contentMd ?? "",
          currentVersion: current.draftVersion ?? draftVersion.current,
        });
      } else if (body?.code === "official_version_conflict" && current) {
        setConflict({
          kind: "official",
          currentContent: current.contentMd ?? "",
          currentVersion: body.details?.currentVersion ?? officialVersion,
        });
      }
      setSaveState("error");
      setMessage(translateApiError(body?.code, body?.details, body?.message));
      return null;
    }
    setDraftId(body!.id);
    draftVersion.current = body!.draftVersion;
    setDirty(latestSnapshotSignature.current !== sentSignature);
    setSaveState("saved");
    return body!.id;
  }

  useEffect(() => {
    if (!dirty || state !== "editing" || conflict) return;
    const timer = setTimeout(() => void saveNow(), 2_000);
    return () => clearTimeout(timer);
  }, [title, summary, sortOrder, contentMd, tagsText, dirty, state, conflict]);

  async function finish(action: "publish" | "submit-review") {
    setMessage("");
    const id = dirty || !draftId ? await saveNow() : draftId;
    if (!id) return;
    setSaveState("saving");
    const response = await fetch(`/api/tree/drafts/${id}/${action}`, { method: "POST" });
    const body = (await response.json().catch(() => null)) as
      ({ nodeId?: string; state?: string } & ApiFailure) | null;
    if (!response.ok) {
      const current = body?.details?.current;
      if (body?.code === "official_version_conflict" && current) {
        setConflict({
          kind: "official",
          currentContent: current.contentMd ?? "",
          currentVersion: body.details?.currentVersion ?? officialVersion,
        });
      }
      setSaveState("error");
      setMessage(translateApiError(body?.code, body?.details, body?.message));
      return;
    }
    if (action === "submit-review") {
      setState("in_review");
      setSaveState("saved");
      setMessage("Đã gửi duyệt. Bản chính thức hiện tại vẫn không thay đổi.");
    } else {
      const publishedNodeId = body?.nodeId ?? nodeId;
      if (!publishedNodeId) return;
      router.push(
        locale === "en"
          ? `${wikiPath(publishedNodeId, nodeSlug)}?lang=en`
          : wikiPath(publishedNodeId, nodeSlug),
      );
      router.refresh();
    }
  }

  async function rebase() {
    if (!nodeId || !draftId || !conflict || conflict.kind !== "official") return;
    const response = await fetch(`/api/tree/drafts/${draftId}/rebase`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...snapshot(),
        expectedOfficialVersion: conflict.currentVersion,
        expectedDraftVersion: draftVersion.current,
      }),
    });
    const body = (await response.json().catch(() => null)) as (Draft & ApiFailure) | null;
    if (!response.ok) {
      setMessage(translateApiError(body?.code, body?.details, body?.message));
      return;
    }
    setBaseVersion(conflict.currentVersion);
    setBaseContent(conflict.currentContent);
    draftVersion.current = body!.draftVersion;
    setConflict(null);
    setDirty(false);
    setSaveState("saved");
    setMessage("Đã đặt nội dung hiện tại trên phiên bản chính thức mới.");
  }

  const disabled = state === "in_review";
  return (
    <form onSubmit={(event) => event.preventDefault()}>
      <p className="meta" aria-live="polite">
        {saveState === "saving"
          ? "Đang lưu bản nháp…"
          : saveState === "saved"
            ? "Đã lưu bản nháp"
            : saveState === "error"
              ? "Chưa lưu được bản nháp"
              : "Thay đổi sẽ tự lưu sau 2 giây."}
      </p>
      {message && <p className={saveState === "error" ? "notice" : "meta"}>{message}</p>}
      {conflict && (
        <section className="panel" aria-label="Xử lý xung đột">
          <h2>Xử lý xung đột</h2>
          <p className="muted">Bản gốc → bản hiện tại</p>
          <DiffView before={baseContent} after={conflict.currentContent} />
          <p className="muted">Bản gốc → nội dung của bạn</p>
          <DiffView before={baseContent} after={contentMd} />
          <p className="muted">Hãy sửa nội dung bên dưới thành bản hợp nhất rồi tiếp tục.</p>
          {conflict.kind === "official" ? (
            <button type="button" onClick={() => void rebase()}>
              Đặt bản hợp nhất trên phiên bản mới
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                draftVersion.current = conflict.currentVersion;
                setConflict(null);
                setDirty(true);
              }}
            >
              Tiếp tục với nội dung đang soạn
            </button>
          )}
        </section>
      )}
      <div className="field">
        <label htmlFor="draft-title">{T.title}</label>
        <input
          id="draft-title"
          value={title}
          onChange={(event) => changed(() => setTitle(event.target.value))}
          disabled={disabled}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="draft-summary">Tóm tắt</label>
        <input
          id="draft-summary"
          value={summary}
          onChange={(event) => changed(() => setSummary(event.target.value))}
          disabled={disabled}
        />
      </div>
      <div className="field">
        <label htmlFor="draft-order">Thứ tự</label>
        <input
          id="draft-order"
          type="number"
          value={sortOrder}
          onChange={(event) => changed(() => setSortOrder(Number(event.target.value)))}
          disabled={disabled}
        />
      </div>
      <div className="split">
        <div className="field wide">
          <label htmlFor="draft-content">{T.contentMd}</label>
          <textarea
            id="draft-content"
            className="editor"
            value={contentMd}
            onChange={(event) => changed(() => setContentMd(event.target.value))}
            disabled={disabled}
            required
          />
        </div>
        <div>
          <p className="muted">{T.preview}</p>
          <div className="preview-pane" aria-label={T.preview}>
            <Markdown content={contentMd} wikiIndex={wikiIndex} />
          </div>
        </div>
      </div>
      <div className="field">
        <label htmlFor="draft-tags">{T.tags} (phân cách bằng dấu phẩy)</label>
        <input
          id="draft-tags"
          value={tagsText}
          onChange={(event) => changed(() => setTagsText(event.target.value))}
          disabled={disabled || locale === "en"}
        />
      </div>
      {state === "in_review" ? (
        <p className="notice">Bản nháp đang chờ duyệt và không thể sửa.</p>
      ) : (
        <p>
          <button type="button" disabled={saveState === "saving"} onClick={() => void saveNow()}>
            Lưu ngay
          </button>{" "}
          <button
            type="button"
            disabled={saveState === "saving" || Boolean(conflict)}
            onClick={() => void finish(reviewRequired ? "submit-review" : "publish")}
          >
            {reviewRequired ? "Yêu cầu duyệt" : "Xuất bản"}
          </button>
        </p>
      )}
    </form>
  );
}
