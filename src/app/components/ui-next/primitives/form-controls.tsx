import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { classNames } from "../shared";

export const nativeControlClassName = "ui-next-control";

interface FieldCopy {
  label: string;
  description?: string;
  error?: string;
}

function FieldMessages({ id, description, error }: { id: string } & Omit<FieldCopy, "label">) {
  return (
    <>
      {description ? (
        <span id={`${id}-description`} className="ui-next-field__description">
          {description}
        </span>
      ) : null}
      {error ? (
        <span id={`${id}-error`} className="ui-next-field__error" role="alert">
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
    <label className="ui-next-field" htmlFor={id}>
      <span
        className={classNames("ui-next-field__label", required && "ui-next-field__label--required")}
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
        className={classNames("ui-next-control", className)}
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
    <label className="ui-next-field" htmlFor={id}>
      <span
        className={classNames("ui-next-field__label", required && "ui-next-field__label--required")}
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
        className={classNames("ui-next-control", className)}
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
    <label className="ui-next-field" htmlFor={id}>
      <span
        className={classNames("ui-next-field__label", required && "ui-next-field__label--required")}
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
        className={classNames("ui-next-control", className)}
      >
        {children}
      </select>
      <FieldMessages id={id} description={description} error={error} />
    </label>
  );
}
