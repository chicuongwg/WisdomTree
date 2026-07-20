"use client";

import { T } from "@/lib/vi";
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
        label={T.regenerateCalendarLink}
        title={T.confirmRegenerateCalendarTitle}
        body={T.confirmRegenerateCalendarBody}
        confirmLabel={T.regenerateCalendarLink}
        className="secondary"
        disabled={m.busy}
        onConfirm={() =>
          void m.run("/api/account/calendar-token", {
            ok: T.calendarLinkRegenerated,
          })
        }
      />
    </>
  );
}
