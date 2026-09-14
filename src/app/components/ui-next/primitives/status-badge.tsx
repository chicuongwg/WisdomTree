import type { HTMLAttributes } from "react";
import { classNames } from "../shared";

export type StatusTone = "neutral" | "accent" | "success" | "warning" | "danger" | "information";

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
}

const toneClasses: Record<StatusTone, string> = {
  neutral: "bg-neutral-100 dark:bg-neutral-800 text-ui-text-secondary",
  accent: "bg-emerald-50 dark:bg-emerald-950 text-ui-accent",
  success: "bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200",
  warning: "bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-200",
  danger: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200",
  information: "bg-sky-100 dark:bg-sky-900 text-sky-800 dark:text-sky-200",
};

export function StatusBadge({ tone = "neutral", className, children, ...props }: StatusBadgeProps) {
  return (
    <span
      {...props}
      className={classNames(
        "ui-next-status-badge inline-flex items-center gap-2 rounded-full px-3 py-0.5 text-sm font-semibold",
        toneClasses[tone],
        className,
      )}
    >
      <span className="w-2 h-2 rounded-full bg-current" aria-hidden="true" />
      {children}
    </span>
  );
}
