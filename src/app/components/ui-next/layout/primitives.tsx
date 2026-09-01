import type { HTMLAttributes, ReactNode } from "react";
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

export function Stack({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={classNames("ui-next-stack", className)} />;
}

export function Inline({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={classNames("ui-next-inline", className)} />;
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="ui-next-page-header">
      <div>
        <h1>{title}</h1>
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
