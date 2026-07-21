/**
 * The app's clock, checked from a zone that is NOT the app's.
 *
 * This is the whole point of the file: the faults it guards against only
 * appear when the process is set to something other than Vietnam, which is
 * exactly what a UTC container is and exactly what nobody's laptop is. So the
 * suite re-runs itself under a few hostile TZ settings and expects identical
 * answers from all of them.
 */
import { execFileSync } from "node:child_process";
import {
  APP_TZ,
  appDayNumber,
  fromAppInput,
  startOfAppDay,
  toAppClock,
  toAppInput,
} from "../src/lib/time";
import { day, untilLabel, when } from "../src/lib/vi";

const ZONES = ["UTC", "America/Los_Angeles", "Pacific/Kiritimati", APP_TZ];

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : ` — got ${actual}, want ${expected}`}`);
}

// A moment chosen to sit on the far side of midnight from most zones:
// 2026-07-21T20:30Z is 03:30 on the 22nd in Vietnam.
const LATE = new Date("2026-07-21T20:30:00Z");
// And one on the near side: 06:00 on the 21st in Vietnam.
const EARLY = new Date("2026-07-20T23:00:00Z");

function suite() {
  console.log(`TZ=${process.env.TZ ?? "(unset)"}`);

  // The two that used to disagree with each other.
  check("day() of a 03:30-Vietnam moment", day(LATE), "22/7/2026");
  check("day() of a 06:00-Vietnam moment", day(EARLY), "21/7/2026");
  // `dateStyle: "short"` in vi-VN is a two-digit year — that is the app's
  // house style for a timestamp, and the point here is the 22nd, not the 21st.
  check("when() prints the app's wall clock", when(LATE), "03:30 22/7/26");

  // The datetime-local round trip: what the box shows, and what comes back.
  check("toAppInput", toAppInput(LATE.toISOString()), "2026-07-22T03:30");
  check(
    "fromAppInput inverts it",
    fromAppInput(toAppInput(LATE.toISOString())).toISOString(),
    LATE.toISOString(),
  );
  check("fromAppInput reads the box as Vietnam time", fromAppInput("2026-07-22T03:30").toISOString(), LATE.toISOString());

  // Day boundaries — what the calendar buckets by.
  check("startOfAppDay", startOfAppDay(LATE).toISOString(), "2026-07-21T17:00:00.000Z");
  check("two moments in one Vietnam day share a day number", appDayNumber(LATE), appDayNumber(new Date("2026-07-22T16:59:00Z")));
  check("and differ from the next one", appDayNumber(LATE) + 1, appDayNumber(new Date("2026-07-22T17:00:00Z")));

  // untilLabel counted elapsed milliseconds and called anything under 24h
  // "Hôm nay". A deadline at 09:00 tomorrow, read at 22:00 tonight, is 11
  // hours away and is NOT today.
  const tonight = new Date("2026-07-21T15:00:00Z"); // 22:00 in Vietnam
  const tomorrowMorning = new Date("2026-07-22T02:00:00Z"); // 09:00 next day
  check("untilLabel: 11 hours across midnight is tomorrow", untilLabel(tomorrowMorning, tonight), "Ngày mai");
  check("untilLabel: same day", untilLabel(new Date("2026-07-21T16:00:00Z"), tonight), "Hôm nay");
  check("untilLabel: yesterday is overdue", untilLabel(new Date("2026-07-20T10:00:00Z"), tonight), "Quá hạn 1 ngày");

  // toAppClock is what the calendar grid runs on: UTC getters must spell out
  // the Vietnamese wall clock.
  const a = toAppClock(LATE);
  check("toAppClock date", a.getUTCDate(), 22);
  check("toAppClock hour", a.getUTCHours(), 3);
}

if (process.env.TIME_TEST_CHILD) {
  suite();
  process.exit(failures ? 1 : 0);
}

// Parent: run the suite once per hostile zone.
let bad = 0;
for (const tz of ZONES) {
  try {
    const out = execFileSync(process.execPath, [
      "--import", "tsx",
      new URL(import.meta.url).pathname,
    ], {
      env: { ...process.env, TZ: tz, TIME_TEST_CHILD: "1" },
      encoding: "utf8",
    });
    process.stdout.write(out);
  } catch (e) {
    const err = e as { stdout?: string };
    process.stdout.write(err.stdout ?? "");
    bad++;
  }
}
console.log(bad ? `\n${bad} zone(s) failed.` : `\nThe app's clock reads the same from all ${ZONES.length} zones.`);
process.exit(bad ? 1 : 0);
