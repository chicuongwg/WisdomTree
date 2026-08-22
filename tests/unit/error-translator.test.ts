import assert from "node:assert/strict";
import { translateApiError } from "@/lib/vi";

export const run = async () => {
  // Known code → Vietnamese.
  assert.equal(
    translateApiError("loan_already_active", undefined, "You already have an active loan."),
    "Bạn đang có phiếu mượn cho đầu sách này.",
  );
  // Interpolation from details.
  assert.match(
    translateApiError("edit_locked", { holderName: "Phạm Thu Hương" }, "Locked."),
    /Phạm Thu Hương/,
  );
  assert.match(
    translateApiError("copies_below_active_loans", { onLoan: 3 }, "3 copies out."),
    /3 cuốn/,
  );
  assert.match(translateApiError("rate_limited", { retryAfterSeconds: 9 }, "Slow down."), /9 giây/);
  // Unknown code → the server's message; nothing → generic Vietnamese.
  assert.equal(translateApiError("brand_new_code", undefined, "Server said so."), "Server said so.");
  assert.match(translateApiError(undefined, undefined, undefined), /Có lỗi xảy ra/);
};

if (import.meta.url === new URL(process.argv[1], import.meta.url).href) {
  run().catch((err) => {
    console.error(err.stack || err);
    process.exit(1);
  });
}
