import type { HTMLAttributes } from "react";
import { classNames } from "../shared";
import styles from "./primitives.module.css";

export type SurfaceTone = "default" | "raised" | "sunken";

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  tone?: SurfaceTone;
}

export function Surface({ tone = "default", className, ...props }: SurfaceProps) {
  return (
    <div
      {...props}
      className={classNames(
        styles.surface,
        tone === "default" ? undefined : styles[tone],
        className,
      )}
    />
  );
}
