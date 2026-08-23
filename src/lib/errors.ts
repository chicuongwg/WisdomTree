import { NextResponse } from "next/server";

// The one Error shape every API route returns:
// { code, message, details? } — message is developer-facing English; the FE
// translates known codes to Vietnamese (src/lib/vi/errors.ts).

export type ErrorBody = {
  code: string;
  message: string;
  details?: Record<string, unknown>;
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }

  toBody(): ErrorBody {
    return {
      code: this.code,
      message: this.message,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

export const unauthorized = () =>
  new ApiError(401, "unauthorized", "Sign-in required.");
// Denied writes → 403; message uses the vocabulary term.
export const forbidden = () => new ApiError(403, "forbidden", "Access denied.");
// Out-of-scope reads → 404, never 403, so cross-space existence is not leaked.
export const notFound = () => new ApiError(404, "not_found", "Not found.");
export const versionConflict = () =>
  new ApiError(
    409,
    "version_conflict",
    "The content was just updated by someone else. Reload and try again.",
  );

type PgError = { code?: string; constraint?: string };

/**
 * Route-handler wrapper: converts ApiError to the contract Error shape and
 * maps the one-active-loan-per-borrower partial-unique-index violation to the
 * 409 the OpenAPI contract promises on POST /catalog/{itemId}/loan/request.
 * Since a title may hold several copies, that index is what keeps one person
 * from taking two of the same book; running out of copies is a different
 * refusal, raised in circulation/service.ts before the insert.
 */
export async function handleApi(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(err.toBody(), { status: err.status });
    }
    // Drizzle wraps the driver error; the pg fields live on `cause`.
    const raw = err as PgError & { cause?: PgError };
    const pg = raw?.code === "23505" ? raw : raw?.cause;
    if (pg?.code === "23505" && pg.constraint === "loan_tickets_one_active_per_borrower") {
      const body: ErrorBody = {
        code: "loan_already_active",
        message:
          "You already hold an active loan for this title; one copy per person.",
      };
      return NextResponse.json(body, { status: 409 });
    }
    console.error(err);
    const body: ErrorBody = {
      code: "internal_error",
      message: "Something went wrong. Try again later.",
    };
    return NextResponse.json(body, { status: 500 });
  }
}
