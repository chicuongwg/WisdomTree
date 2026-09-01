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
      className={classNames("ui-next-surface", `ui-next-surface--${tone}`, className)}
    />
  );
}
