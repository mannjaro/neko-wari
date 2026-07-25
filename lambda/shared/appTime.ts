import { APP_TIME_ZONE } from "./constants";

/**
 * Calendar helpers that read a UTC instant through {@link APP_TIME_ZONE}.
 *
 * Nothing here converts what we store — timestamps stay epoch ms in UTC. These
 * only answer calendar questions ("which month is this?", "is this still
 * today?") in the timezone the app's users actually live in, instead of
 * inheriting the runtime's timezone by accident.
 */

const wallClockFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

type WallClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

/** The local date and time in APP_TIME_ZONE at the given instant. */
function wallClockAt(timestamp: number): WallClock {
  const parts = wallClockFormatter.formatToParts(new Date(timestamp));
  const value = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((p) => p.type === type);
    if (!part) {
      throw new Error(`Missing "${type}" when reading time in ${APP_TIME_ZONE}`);
    }
    return Number(part.value);
  };

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

/** How far APP_TIME_ZONE runs ahead of UTC at the given instant, in ms. */
function utcOffsetMsAt(timestamp: number): number {
  const { year, month, day, hour, minute, second } = wallClockAt(timestamp);
  const asIfUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  // formatToParts truncates to whole seconds; keep the sub-second remainder out
  // of the offset so it stays an exact zone offset.
  return asIfUtc - (timestamp - (timestamp % 1000));
}

/**
 * The `YYYY-MM` bucket an instant belongs to, in APP_TIME_ZONE.
 *
 * This is what decides which month's dashboard an expense shows up on, so it
 * must not be derived with `getMonth()` — that reads the runtime's timezone.
 */
export function appYearMonth(timestamp: number): string {
  const { year, month } = wallClockAt(timestamp);
  return `${year}-${String(month).padStart(2, "0")}`;
}

/**
 * The last millisecond of the APP_TIME_ZONE day containing `timestamp`.
 *
 * Used as the ceiling for "not in the future": clients anchor a picked calendar
 * date to noon UTC, which is 21:00 in JST and therefore reads as future for
 * most of the day. Comparing against the end of the local day accepts today's
 * date from any timezone while still rejecting tomorrow onward.
 *
 * The offset is sampled at `timestamp`, so a day containing a DST transition
 * could be off by the size of that transition. APP_TIME_ZONE has no DST.
 */
export function endOfAppDay(timestamp: number): number {
  const { year, month, day } = wallClockAt(timestamp);
  const nextMidnightAsIfUtc = Date.UTC(year, month - 1, day + 1);
  return nextMidnightAsIfUtc - utcOffsetMsAt(timestamp) - 1;
}
