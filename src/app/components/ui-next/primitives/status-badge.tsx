import type { HTMLAttributes } from "react";
import { classNames } from "../shared";
import styles from "./primitives.module.css";

export type StatusTone = "neutral" | "accent" | "success" | "warning" | "danger" | "information";

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
}

export function StatusBadge({ tone = "neutral", className, children, ...props }: StatusBadgeProps) {
  return (
    <span
      {...props}
      className={classNames(styles.badge, tone === "neutral" ? undefined : styles[tone], className)}
    >
      <span className={styles.marker} aria-hidden="true" />
      {children}
    </span>
  );
}
