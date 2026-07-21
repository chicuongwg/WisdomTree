/**
 * The app's clock.
 *
 * Every screen here was formatting dates in "whatever zone the code happened
 * to be running in". Server components got the server's zone (UTC in the
 * container), client components got the reader's browser zone, and the two
 * disagreed by seven hours — so a deadline's row and the edit form beside it
 * could print two different days for the same moment, and a task due at 03:00
 * Vietnam time landed in the previous day's cell on the calendar.
 *
 * The fix is not "use the reader's zone". This is one team in one country
 * working from one set of shelves; a librarian and a researcher discussing
 * "hạn thứ Ba" mean the same Tuesday. So the app has ONE display zone, named
 * here, and every date on every screen is rendered in it no matter where the
 * code runs.
 *
 * Vietnam has had a single fixed offset since 1975 and observes no daylight
 * saving, which is why the arithmetic below is allowed to be a constant rather
 * than a lookup. If this app ever serves a zone that changes offset, the
 * OFFSET_MS shortcut is the one thing here that must become an Intl call —
 * APP_TZ already is one.
 */

export const APP_TZ = "Asia/Ho_Chi_Minh";

/** The same offset, in the two shapes the rest of the file needs. */
const OFFSET_MS = 7 * 60 * 60 * 1000;
const OFFSET_ISO = "+07:00";

/**
 * The same instant, shifted so that the UTC getters read the app's wall clock.
 *
 * This is the trick that lets ordinary date arithmetic — "which day is this",
 * "the Monday of this week" — be written once and be correct, instead of every
 * call site remembering to ask Intl. Work in this space, use getUTC*, and
 * convert back at the edges with `fromAppClock`.
 */
export const toAppClock = (d: Date): Date => new Date(d.getTime() + OFFSET_MS);

/** The inverse: an app-wall-clock date back to the real instant. */
export const fromAppClock = (d: Date): Date => new Date(d.getTime() - OFFSET_MS);

/** Midnight in the app's zone, as a real instant. */
export const startOfAppDay = (d: Date): Date => {
  const a = toAppClock(d);
  return fromAppClock(new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate())));
};

/**
 * Which day this instant falls on, counted from the epoch, in the app's zone.
 * Two instants share a day exactly when these match — which is what "hôm nay"
 * and "còn 3 ngày" actually mean, and what subtracting milliseconds and
 * dividing by 86,400,000 does not.
 */
export const appDayNumber = (d: Date): number =>
  Math.floor(toAppClock(d).getTime() / 86_400_000);

/**
 * An instant as the string `<input type="datetime-local">` wants — the app's
 * wall clock, not the browser's.
 */
export function toAppInput(iso: string | Date | null): string {
  if (!iso) return "";
  const a = toAppClock(new Date(iso));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${a.getUTCFullYear()}-${pad(a.getUTCMonth() + 1)}-${pad(a.getUTCDate())}T${pad(
    a.getUTCHours(),
  )}:${pad(a.getUTCMinutes())}`;
}

/**
 * The inverse: what the reader typed into that box is a wall clock in the
 * app's zone, so it is stamped with the app's offset rather than handed to
 * `new Date()`, which would read it in the browser's.
 */
export function fromAppInput(value: string): Date {
  return new Date(`${value}:00${OFFSET_ISO}`);
}
