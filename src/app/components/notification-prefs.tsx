"use client";

import { useState } from "react";
import { notifyChannelLabel, eventLabel, T } from "@/lib/vi";
import { useMutation } from "@/lib/use-mutation";
import { Say } from "@/app/components/say";

// Per-event channel preferences (notifications.md): absent row = default
// matrix; this form always shows the merged view served by the API.

type Pref = { eventType: string; channels: string[] };
const CHANNELS = ["in_app", "email", "zalo"] as const;

export function NotificationPrefsForm({ initial }: { initial: Pref[] }) {
  const m = useMutation();
  const [prefs, setPrefs] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);

  function toggle(eventType: string, channel: string, on: boolean) {
    setPrefs((prev) =>
      prev.map((p) =>
        p.eventType === eventType
          ? { ...p, channels: on ? [...p.channels, channel] : p.channels.filter((c) => c !== channel) }
          : p,
      ),
    );
    setMessage(null);
  }

  async function save() {
    setMessage(null);
    // The answer is the merged matrix, so it replaces what is on screen. The
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

  // Fragment for the same reason as the curation workbench: the panel spaces
  // its own children, and a wrapper element absorbs that spacing.
  return (
    <>
      <div className="record-scroll">
        <table className="list">
          <thead>
            <tr>
              <th scope="col">{T.eventColumn}</th>
              {CHANNELS.map((c) => (
                <th scope="col" key={c}>
                  {notifyChannelLabel(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {prefs.map((p) => (
              <tr key={p.eventType}>
                <td>{eventLabel(p.eventType)}</td>
                {CHANNELS.map((c) => (
                  <td key={c}>
                    <input
                      type="checkbox"
                      aria-label={`${eventLabel(p.eventType)} — ${notifyChannelLabel(c)}`}
                      disabled={m.busy}
                      checked={p.channels.includes(c)}
                      onChange={(e) => toggle(p.eventType, c, e.target.checked)}
                    />
                  </td>
                ))}
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
