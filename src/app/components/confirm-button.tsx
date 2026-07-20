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
 * the browser's job, not ours — except when the act removes the trigger, which
 * `parkFocus()` below covers. `<form method="dialog">` closes it and hands the
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
  const triggerRef = useRef<HTMLButtonElement>(null);

  /**
   * Where focus goes after a confirmed act. The browser hands it back to the
   * trigger on close — but a confirmed act often removes that trigger (a state
   * button that no longer applies, a panel that closes), and focus then falls
   * to <body>: the next Tab restarts at the top of the document, far from what
   * the reader just did. So on confirm we park it on the nearest thing that
   * outlives the change — the surrounding panel, else the page's <main>.
   * Cancel is left alone; nothing is removed, and the browser's own restore is
   * already right.
   */
  function parkFocus() {
    const scope = triggerRef.current?.closest<HTMLElement>(".panel, main");
    // Its heading if it has one: landing on "Tiếp nhận, heading" says where you
    // are, where landing on the container reads the whole container aloud.
    const anchor = scope?.querySelector<HTMLElement>("h1, h2, h3") ?? scope;
    if (!anchor) return;
    anchor.tabIndex = -1; // focusable by script, still out of the tab order
    anchor.focus({ preventScroll: true });
  }

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
      <button ref={triggerRef} type="button" className={className} disabled={disabled} onClick={open}>
        {label}
      </button>
      <dialog
        ref={dialogRef}
        className="confirm"
        aria-labelledby={headingId}
        aria-describedby={bodyId}
        onClose={(e) => {
          if (e.currentTarget.returnValue !== "confirm") return;
          // Park first: the trigger is still in the document here, so we can
          // find its anchor. onConfirm() is what may take it away.
          parkFocus();
          onConfirm();
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
