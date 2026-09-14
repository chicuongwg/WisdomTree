import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { classNames } from "../shared";

export const nativeControlClassName =
  "w-full min-h-10 border border-ui-border-strong rounded px-3 py-2 bg-ui-surface text-ui-text focus:outline-2 focus:outline-ui-focus disabled:opacity-60 disabled:cursor-not-allowed";

interface FieldCopy {
  label: string;
  description?: string;
  error?: string;
}

function FieldMessages({ id, description, error }: { id: string } & Omit<FieldCopy, "label">) {
  return (
    <>
      {description ? (
        <span id={`${id}-description`} className="text-ui-text-muted text-sm">
          {description}
        </span>
      ) : null}
      {error ? (
        <span id={`${id}-error`} className="m-0 text-ui-danger text-sm font-semibold" role="alert">
          {error}
        </span>
      ) : null}
    </>
  );
}

function describedBy(id: string, description?: string, error?: string) {
  return (
    [description && `${id}-description`, error && `${id}-error`].filter(Boolean).join(" ") ||
    undefined
  );
}

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement>, FieldCopy {
  id: string;
}

export function TextField({
  id,
  label,
  description,
  error,
  className,
  required,
  ...props
}: TextFieldProps) {
  return (
    <label className="grid gap-2" htmlFor={id}>
      <span
        className={classNames(
          "text-ui-text text-sm font-semibold",
          required && "after:content-['*'] after:ml-0.5 after:text-ui-danger",
        )}
      >
        {label}
      </span>
      <input
        {...props}
        id={id}
        required={required}
        aria-label={props["aria-label"] ?? label}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, description, error)}
        className={classNames(nativeControlClassName, className)}
      />
      <FieldMessages id={id} description={description} error={error} />
    </label>
  );
}

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, FieldCopy {
  id: string;
}

export function TextArea({
  id,
  label,
  description,
  error,
  className,
  required,
  ...props
}: TextAreaProps) {
  return (
    <label className="grid gap-2" htmlFor={id}>
      <span
        className={classNames(
          "text-ui-text text-sm font-semibold",
          required && "after:content-['*'] after:ml-0.5 after:text-ui-danger",
        )}
      >
        {label}
      </span>
      <textarea
        {...props}
        id={id}
        required={required}
        aria-label={props["aria-label"] ?? label}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, description, error)}
        className={classNames(nativeControlClassName, "min-h-28 resize-y", className)}
      />
      <FieldMessages id={id} description={description} error={error} />
    </label>
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement>, FieldCopy {
  id: string;
}

export function Select({
  id,
  label,
  description,
  error,
  className,
  required,
  children,
  ...props
}: SelectProps) {
  return (
    <label className="grid gap-2" htmlFor={id}>
      <span
        className={classNames(
          "text-ui-text text-sm font-semibold",
          required && "after:content-['*'] after:ml-0.5 after:text-ui-danger",
        )}
      >
        {label}
      </span>
      <select
        {...props}
        id={id}
        required={required}
        aria-label={props["aria-label"] ?? label}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy(id, description, error)}
        className={classNames(nativeControlClassName, className)}
      >
        {children}
      </select>
      <FieldMessages id={id} description={description} error={error} />
    </label>
  );
}
