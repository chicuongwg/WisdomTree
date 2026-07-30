import assert from "node:assert/strict";
import {
  ApiError,
  forbidden,
  handleApi,
  notFound,
  unauthorized,
  versionConflict,
} from "@/lib/errors";

export async function run() {
  for (const [error, status, code] of [
    [unauthorized(), 401, "unauthorized"],
    [forbidden(), 403, "forbidden"],
    [notFound(), 404, "not_found"],
    [versionConflict(), 409, "version_conflict"],
  ] as const) {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, status);
    assert.equal(error.toBody().code, code);
  }

  const details = await handleApi(async () => {
    throw new ApiError(422, "invalid", "Bad input", { field: "title" });
  });
  assert.equal(details.status, 422);
  assert.deepEqual(await details.json(), {
    code: "invalid",
    message: "Bad input",
    details: { field: "title" },
  });

  const duplicate = await handleApi(async () => {
    throw {
      cause: {
        code: "23505",
        constraint: "loan_tickets_one_active_per_borrower",
      },
    };
  });
  assert.equal(duplicate.status, 409);
  assert.equal((await duplicate.json()).code, "loan_already_active");
}
