"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "../primitives/button";
import { classNames } from "../shared";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  closeLabel: string;
  children?: ReactNode;
  placement?: "center" | "end";
  size?: "standard" | "wide";
  footer?: ReactNode;
  headerActions?: ReactNode;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  closeLabel,
  children,
  placement = "center",
  size = "standard",
  footer,
  headerActions,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      restoreFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  function handleClose() {
    onClose();
    requestAnimationFrame(() => restoreFocusRef.current?.focus());
  }

  return (
    <dialog
      ref={dialogRef}
      className={classNames(
        "ui-next-dialog",
        `ui-next-dialog--${size}`,
        placement === "end" && "ui-next-dialog--end",
      )}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClick={(e) => {
        if (e.target === dialogRef.current) {
          handleClose();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        handleClose();
      }}
      onClose={() => {
        if (open) onClose();
        requestAnimationFrame(() => restoreFocusRef.current?.focus());
      }}
    >
      <div className="ui-next-dialog__header">
        <div>
          <h2 id={titleId}>{title}</h2>
          {description ? <p id={descriptionId}>{description}</p> : null}
        </div>
        <div className="ui-next-dialog__header-actions">
          {headerActions}
          <Button type="button" variant="ghost" onClick={handleClose}>
            {closeLabel}
          </Button>
        </div>
      </div>
      <div className="ui-next-dialog__body">{children}</div>
      {footer ? <div className="ui-next-dialog__footer">{footer}</div> : null}
    </dialog>
  );
}
