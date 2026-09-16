import type { HTMLAttributes } from "react";
import { classNames } from "../shared";

export type StatusTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "information"
  | "evidence"
  | "synthesis"
  | "draft"
  | "published";

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
}

export function StatusBadge({ tone = "neutral", className, children, ...props }: StatusBadgeProps) {
  return (
    <span
      {...props}
      className={classNames(
        "ui-next-status-badge",
        tone !== "neutral" && `ui-next-status-badge--${tone}`,
        className,
      )}
    >
      <span className="ui-next-status-badge__marker" aria-hidden="true" />
      {children}
    </span>
  );
}
