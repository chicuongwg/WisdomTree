import type { ButtonHTMLAttributes, ReactNode } from "react";
import { classNames } from "../shared";
import { VisuallyHidden } from "./visually-hidden";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  loadingLabel?: string;
  leadingIcon?: ReactNode;
}

export function Button({
  variant = "secondary",
  loading = false,
  loadingLabel = "Loading",
  leadingIcon,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      className={classNames("ui-next-button", `ui-next-button--${variant}`, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <span className="ui-next-spinner" aria-hidden="true" /> : leadingIcon}
      <span>{children}</span>
      {loading ? <VisuallyHidden>{loadingLabel}</VisuallyHidden> : null}
    </button>
  );
}

export interface IconButtonProps extends Omit<ButtonProps, "aria-label" | "children"> {
  "aria-label": string;
  children: ReactNode;
}

export function IconButton({
  "aria-label": label,
  className,
  children,
  ...props
}: IconButtonProps) {
  return (
    <Button {...props} aria-label={label} className={classNames("ui-next-icon-button", className)}>
      {children}
    </Button>
  );
}
