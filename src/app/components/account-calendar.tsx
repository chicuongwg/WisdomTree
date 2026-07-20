"use client";

import { useMutation } from "@/lib/use-mutation";
import { SayMutation } from "@/app/components/say";
import { ConfirmButton } from "@/app/components/confirm-button";

// "Tạo liên kết mới" (`/account` § Lịch của tôi): the calendar token is a
// bearer credential, so replacing it kills every copy of the old URL — worth
// a confirm in words. The refresh repaints the server-rendered URL above the
// button, so the component itself never has to display the token.

export function RegenerateCalendarLink() {
  const m = useMutation();
  return (
    <>
      <SayMutation m={m} />
      <ConfirmButton
        // TODO(vi): move to src/lib/vi.ts
        label="Tạo liên kết mới"
        title="Tạo liên kết lịch mới?"
        body="Liên kết cũ sẽ ngừng hoạt động ngay: ứng dụng lịch nào đang dùng nó sẽ không nhận được hạn chót nữa, và bạn cần dán liên kết mới vào đó."
        confirmLabel="Tạo liên kết mới"
        className="secondary"
        disabled={m.busy}
        onConfirm={() =>
          void m.run("/api/account/calendar-token", {
            // TODO(vi): move to src/lib/vi.ts
            ok: "Đã tạo liên kết mới. Liên kết cũ không còn hoạt động.",
          })
        }
      />
    </>
  );
}
