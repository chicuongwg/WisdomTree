"use client";

import { T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { SayMutation } from "./say";

export function ExtractionRetryAction({
  sourceId,
  versionId,
  mimeType,
}: {
  sourceId: string;
  versionId: string;
  mimeType: string;
}) {
  const m = useMutation();
  const method =
    mimeType === "application/pdf" || mimeType.startsWith("image/") ? "ocr" : "pandoc";
  const supported =
    method === "ocr" ||
    [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.oasis.opendocument.text",
      "text/html",
      "application/rtf",
    ].includes(mimeType);

  if (!supported) return null;

  return (
    <>
      <SayMutation m={m} />
      <button
        type="button"
        className="secondary"
        disabled={m.busy}
        onClick={() =>
          void m.run(`/api/source/${sourceId}/version/${versionId}/extract`, {
            body: { method },
            ok: "Đã bắt đầu trích xuất lại.",
          })
        }
      >
        {m.busy ? T.loading : method === "ocr" ? "Thử lại bằng OCR" : "Thử lại bằng Pandoc"}
      </button>
    </>
  );
}
