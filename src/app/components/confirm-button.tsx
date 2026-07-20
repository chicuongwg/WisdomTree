"use client";

import { useId, useRef } from "react";
import { T } from "@/lib/vi";

/**
 * A button that asks before it fires — the one confirmation step in the app.
 *
 * Every irreversible act (lưu trữ, gộp trang, không dùng, từ chối, ghi nhận
 * trả sách) goes through here, so the question always looks and behaves the
 * same. The question itself is never generic: `title` names the act and `body`
 * says what changes and whether it can be taken back.
 *
 * The modal is the platform's own `<dialog>` + `showModal()`: focus trapping,
 * Escape-to-close, the inert background and returning focus to the trigger are
 * the browser's job, not ours. `<form method="dialog">` closes it and hands the
 * pressed button's value to `onClose` — no open/closed state to keep in sync.
 *
 * Cancel is focused on open and sits first, so a hurried Enter or Escape
 * always lands on the harmless choice.
 */
export function ConfirmButton({
  label,
  title,
  body,
  confirmLabel,
  onConfirm,
  className,
  disabled,
}: {
  label: string;
  title: string;
  body: string;
  /** Defaults to the trigger's own label. */
  confirmLabel?: string;
  onConfirm: () => void;
  /** Same button classes as anywhere else ("danger", "secondary", …). */
  className?: string;
  disabled?: boolean;
}) {
  const headingId = useId();
  const bodyId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  function open() {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // Escape leaves returnValue untouched, so clear last time's answer first.
    dialog.returnValue = "";
    dialog.showModal();
    cancelRef.current?.focus();
  }

  return (
    <>
      <button type="button" className={className} disabled={disabled} onClick={open}>
        {label}
      </button>
      <dialog
        ref={dialogRef}
        className="confirm"
        aria-labelledby={headingId}
        aria-describedby={bodyId}
        onClose={(e) => {
          if (e.currentTarget.returnValue === "confirm") onConfirm();
        }}
      >
        <form method="dialog">
          <h2 id={headingId}>{title}</h2>
          <p id={bodyId}>{body}</p>
          <div className="button-row confirm-actions">
            <button ref={cancelRef} type="submit" value="cancel" className="secondary">
              {T.cancel}
            </button>
            <button type="submit" value="confirm" className={className}>
              {confirmLabel ?? label}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
