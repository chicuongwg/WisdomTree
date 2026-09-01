import type { HTMLAttributes } from "react";
import { classNames } from "../shared";

export function VisuallyHidden({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} className={classNames("ui-next-visually-hidden", className)} />;
}
