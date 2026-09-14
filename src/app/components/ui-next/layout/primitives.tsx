import type { FormHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { classNames } from "../shared";
import styles from "./primitives.module.css";

export type ContentWidth = "reading" | "standard" | "wide" | "full";

export interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  width?: ContentWidth;
}

export function PageContainer({ width = "standard", className, ...props }: PageContainerProps) {
  return <div {...props} className={classNames(styles.container, styles[width], className)} />;
}

export type StackGap = "1" | "2" | "3" | "4" | "6" | "8" | "12";
export type StackProps = (HTMLAttributes<HTMLDivElement> | FormHTMLAttributes<HTMLFormElement>) & {
  as?: "div" | "form";
  gap?: StackGap;
};

export function Stack({ as = "div", gap = "6", className, ...props }: StackProps) {
  const classes = classNames(styles.stack, styles[`gap${gap}`], className);
  if (as === "form")
    return <form {...(props as FormHTMLAttributes<HTMLFormElement>)} className={classes} />;
  return <div {...(props as HTMLAttributes<HTMLDivElement>)} className={classes} />;
}

export function Inline({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={classNames(styles.inline, className)} />;
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
    <header className={styles.pageHeader}>
      <div>
        <Heading id={titleId}>{title}</Heading>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}

export function SkipLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a className={styles.skipLink} href={href}>
      {children}
    </a>
  );
}
