import { ApiError } from "@/lib/errors";

export type ApplicationErrorClass =
  | "not_found"
  | "forbidden"
  | "invalid_input"
  | "version_conflict"
  | "invalid_state"
  | "internal_error";

export type ApplicationErrorDto = {
  error: ApplicationErrorClass;
  reason: string;
  status: number;
  details?: Record<string, unknown>;
};

/** Stable target-delivery error shape; never forwards driver/internal messages. */
export function toApplicationError(error: unknown): ApplicationErrorDto {
  if (!(error instanceof ApiError)) {
    return { error: "internal_error", reason: "internal_error", status: 500 };
  }
  const category: ApplicationErrorClass =
    error.code === "not_found" || error.status === 404
      ? "not_found"
      : error.code === "forbidden" || error.status === 403
        ? "forbidden"
        : error.code === "version_conflict" || error.code === "draft_version_conflict"
          ? "version_conflict"
          : error.code === "invalid_state" || error.code.endsWith("_state")
            ? "invalid_state"
            : error.status >= 400 && error.status < 500
              ? "invalid_input"
              : "internal_error";
  return {
    error: category,
    reason: error.code,
    status: error.status,
    ...(error.details ? { details: error.details } : {}),
  };
}
