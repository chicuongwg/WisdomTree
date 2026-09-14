import type { ButtonHTMLAttributes, ReactNode } from "react";
import { classNames } from "../shared";
import { VisuallyHidden } from "./visually-hidden";
import styles from "./primitives.module.css";

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
      className={classNames(styles.button, styles[variant], className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <span className={styles.spinner} aria-hidden="true" /> : leadingIcon}
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
    <Button {...props} aria-label={label} className={classNames(styles.iconButton, className)}>
      {children}
    </Button>
  );
}
