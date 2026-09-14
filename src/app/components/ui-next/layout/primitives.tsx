import type { FormHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { classNames } from "../shared";

export type ContentWidth = "reading" | "standard" | "wide" | "full";

export interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  width?: ContentWidth;
}

const widthClasses: Record<ContentWidth, string> = {
  reading: "max-w-[72ch]",
  standard: "max-w-[64rem]",
  wide: "max-w-[90rem]",
  full: "w-full",
};

export function PageContainer({ width = "standard", className, ...props }: PageContainerProps) {
  return (
    <div
      {...props}
      className={classNames(
        "ui-next-container w-full mx-auto px-4 md:px-8",
        widthClasses[width],
        `ui-next-container--${width}`,
        className,
      )}
    />
  );
}

export type StackGap = "1" | "2" | "3" | "4" | "6" | "8" | "12";
export type StackProps = (HTMLAttributes<HTMLDivElement> | FormHTMLAttributes<HTMLFormElement>) & {
  as?: "div" | "form";
  gap?: StackGap;
};

const gapClasses: Record<StackGap, string> = {
  "1": "gap-1",
  "2": "gap-2",
  "3": "gap-3",
  "4": "gap-4",
  "6": "gap-6",
  "8": "gap-8",
  "12": "gap-12",
};

export function Stack({ as = "div", gap = "6", className, ...props }: StackProps) {
  const classes = classNames("ui-next-stack flex flex-col", gapClasses[gap], className);
  if (as === "form")
    return <form {...(props as FormHTMLAttributes<HTMLFormElement>)} className={classes} />;
  return <div {...(props as HTMLAttributes<HTMLDivElement>)} className={classes} />;
}

export function Inline({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...props}
      className={classNames("ui-next-inline flex flex-row flex-wrap items-center gap-3", className)}
    />
  );
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
    <header className="ui-next-page-header flex flex-col md:flex-row md:items-start justify-between gap-6">
      <div className="min-w-0">
        <Heading
          id={titleId}
          className={classNames(
            "m-0 font-bold leading-tight break-words",
            headingLevel === 2 ? "text-xl" : "text-2xl",
          )}
        >
          {title}
        </Heading>
        {description ? (
          <p className="mt-2 text-ui-text-secondary max-w-[65ch] text-sm md:text-base">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="ui-next-page-header__actions flex flex-wrap items-center gap-2 shrink-0 max-w-full">
          {actions}
        </div>
      ) : null}
    </header>
  );
}

export function SkipLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      className="ui-next-skip-link fixed top-2 left-2 z-50 -translate-y-[160%] focus:translate-y-0 p-3 bg-ui-surface text-ui-text rounded border border-ui-border shadow transition-transform"
      href={href}
    >
      {children}
    </a>
  );
}
