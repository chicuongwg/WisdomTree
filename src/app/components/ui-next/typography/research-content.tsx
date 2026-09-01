import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { classNames } from "../shared";

export interface ResearchContentProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  children: ReactNode;
}

export function ResearchContent({
  as: Component = "article",
  className,
  dir = "auto",
  ...props
}: ResearchContentProps) {
  return (
    <Component {...props} dir={dir} className={classNames("ui-next-research-content", className)} />
  );
}
