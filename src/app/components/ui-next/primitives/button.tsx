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

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-ui-accent hover:enabled:bg-ui-accent-hover text-white",
  secondary:
    "bg-ui-surface border-ui-border-strong text-ui-text hover:enabled:bg-ui-surface-sunken",
  ghost: "bg-transparent text-ui-text hover:enabled:bg-ui-surface-sunken",
  danger: "bg-ui-danger text-white hover:enabled:brightness-90",
};

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
      className={classNames(
        "ui-next-button min-h-10 inline-flex items-center justify-center gap-2 border border-transparent rounded-[0.375rem] px-4 py-2 font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 transition-colors",
        `ui-next-button--${variant}`,
        variantClasses[variant],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <span
          className="inline-block w-4 h-4 border-2 border-current border-r-transparent rounded-full animate-spin"
          aria-hidden="true"
        />
      ) : (
        leadingIcon
      )}
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
    <Button
      {...props}
      aria-label={label}
      className={classNames("ui-next-icon-button w-10 !px-2", className)}
    >
      {children}
    </Button>
  );
}
