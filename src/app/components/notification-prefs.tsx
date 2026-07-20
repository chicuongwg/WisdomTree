"use client";

import { useState } from "react";
import { notifyChannelLabel, eventLabel, T } from "@/lib/vi";

// Per-event channel preferences (notifications.md): absent row = default
// matrix; this form always shows the merged view served by the API.

type Pref = { eventType: string; channels: string[] };
const CHANNELS = ["in_app", "email", "zalo"] as const;

export function NotificationPrefsForm({ initial }: { initial: Pref[] }) {
  const [prefs, setPrefs] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    setBusy(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/notifications/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { message?: string } | null;
      setError(err?.message ?? "Có lỗi xảy ra. Vui lòng thử lại sau.");
    } else {
      setPrefs((await res.json()) as Pref[]);
      setMessage("Đã lưu tùy chọn nhận thông báo.");
    }
    setBusy(false);
  }

  return (
    <div>
      <table className="list">
        <thead>
          <tr>
            <th scope="col">Sự kiện</th>
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
                    checked={p.channels.includes(c)}
                    onChange={(e) => toggle(p.eventType, c, e.target.checked)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {error && <p className="error-text">{error}</p>}
      {message && <p className="muted">{message}</p>}
      <p>
        <button onClick={save} disabled={busy}>
          {busy ? T.loading : T.save}
        </button>
      </p>
    </div>
  );
}
