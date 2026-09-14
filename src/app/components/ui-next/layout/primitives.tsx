import type { FormHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { classNames } from "../shared";

export type ContentWidth = "reading" | "standard" | "wide" | "full";

export interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  width?: ContentWidth;
}

export function PageContainer({ width = "standard", className, ...props }: PageContainerProps) {
  return (
    <div
      {...props}
      className={classNames("ui-next-container", `ui-next-container--${width}`, className)}
    />
  );
}

export type StackGap = "1" | "2" | "3" | "4" | "6" | "8" | "12";
export type StackProps = (HTMLAttributes<HTMLDivElement> | FormHTMLAttributes<HTMLFormElement>) & {
  as?: "div" | "form";
  gap?: StackGap;
};

export function Stack({ as = "div", gap = "6", className, ...props }: StackProps) {
  const classes = classNames("ui-next-stack", `ui-next-stack--gap-${gap}`, className);
  if (as === "form")
    return <form {...(props as FormHTMLAttributes<HTMLFormElement>)} className={classes} />;
  return <div {...(props as HTMLAttributes<HTMLDivElement>)} className={classes} />;
}

export function Inline({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={classNames("ui-next-inline", className)} />;
}

export interface PageHeaderProps {
  title: string;
  titleId?: string;
  headingLevel?: 1 | 2;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({
  title,
  titleId,
  headingLevel = 1,
  description,
  actions,
}: PageHeaderProps) {
  const Heading = headingLevel === 2 ? "h2" : "h1";
  return (
    <header className="ui-next-page-header">
      <div>
        <Heading id={titleId}>{title}</Heading>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="ui-next-page-header__actions">{actions}</div> : null}
    </header>
  );
}

export function SkipLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className="ui-next-skip-link" href={href}>
      {children}
    </a>
  );
}
