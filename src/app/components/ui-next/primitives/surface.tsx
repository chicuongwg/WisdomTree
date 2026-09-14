import type { HTMLAttributes } from "react";
import { classNames } from "../shared";

export type SurfaceTone = "default" | "raised" | "sunken";

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  tone?: SurfaceTone;
}

export function Surface({ tone = "default", className, ...props }: SurfaceProps) {
  return (
    <div
      {...props}
      className={classNames(
        "ui-next-surface border border-ui-border rounded-md p-6",
        tone === "raised"
          ? "bg-ui-surface-raised shadow-md"
          : tone === "sunken"
            ? "bg-ui-surface-sunken"
            : "bg-ui-surface",
        className,
      )}
    />
  );
}
