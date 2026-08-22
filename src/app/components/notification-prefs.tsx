"use client";

import { useState } from "react";
import { eventLabel, T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { Say } from "@/app/components/say";

// Per-event on/off preferences: absent row = notified; the form always shows
// the merged view served by the API.

type Pref = { eventType: string; enabled: boolean };

export function NotificationPrefsForm({ initial }: { initial: Pref[] }) {
  const m = useMutation();
  const [prefs, setPrefs] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);

  function toggle(eventType: string, on: boolean) {
    setPrefs((prev) => prev.map((p) => (p.eventType === eventType ? { ...p, enabled: on } : p)));
    setMessage(null);
  }

  async function save() {
    setMessage(null);
    // The answer is the merged view, so it replaces what is on screen. The
    // boxes are disabled across the round trip below: without that, a toggle
    // made mid-flight was overwritten here without a word.
    const saved = await m.runJson<Pref[]>("/api/notifications/preferences", {
      method: "PATCH",
      body: prefs,
    });
    if (!saved) return;
    setPrefs(saved);
    setMessage("Đã lưu tùy chọn nhận thông báo.");
  }

  // Fragment: the panel spaces its own children, and a wrapper element
  // absorbs that spacing.
  return (
    <>
      <div className="record-scroll">
        <table className="list">
          <thead>
            <tr>
              <th scope="col">{T.eventColumn}</th>
              <th scope="col">{T.notifications}</th>
            </tr>
          </thead>
          <tbody>
            {prefs.map((p) => (
              <tr key={p.eventType}>
                <td>{eventLabel(p.eventType)}</td>
                <td>
                  <input
                    type="checkbox"
                    aria-label={eventLabel(p.eventType)}
                    disabled={m.busy}
                    checked={p.enabled}
                    onChange={(e) => toggle(p.eventType, e.target.checked)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* "Đã lưu" was .muted — the same grey as a timestamp, so the one thing
          the reader was waiting for looked like metadata. */}
      <Say error={m.error} ok={message} />
      <div className="button-row">
        <button onClick={save} disabled={m.busy}>
          {m.busy ? T.loading : T.save}
        </button>
      </div>
    </>
  );
}
