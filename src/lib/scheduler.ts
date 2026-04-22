import { getDb, type Snipe } from "./db";
import { decrypt } from "./crypto";
import { getVenueConfig } from "./resy-api";
import { executeSnipe } from "./sniper";

const activeTimers = new Map<number, NodeJS.Timeout>();
// setTimeout uses a 32-bit signed int — delays beyond this fire immediately
const MAX_TIMEOUT = 2 ** 31 - 1;

function log(
  snipeId: number,
  level: "debug" | "info" | "warn" | "error",
  phase: string,
  message: string,
  data?: unknown
) {
  const db = getDb();
  const timestamp = new Date().toISOString();
  db.prepare(
    `INSERT INTO snipe_logs (snipe_id, timestamp, level, phase, message, data)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(snipeId, timestamp, level, phase, message, data ? JSON.stringify(data) : null);
  console.log(`[SCHEDULER] [snipe:${snipeId}] ${message}`);
}

export function computeBookingWindowStart(
  date: string,
  leadTimeDays: number,
  bookingHour: number,
  timeZone: string
): Date {
  // Parse the target reservation date
  const [year, month, day] = date.split("-").map(Number);

  // Subtract lead time to get the date bookings open
  const openDate = new Date(Date.UTC(year, month - 1, day));
  openDate.setUTCDate(openDate.getUTCDate() - leadTimeDays);

  const oYear = openDate.getUTCFullYear();
  const oMonth = openDate.getUTCMonth(); // 0-indexed
  const oDay = openDate.getUTCDate();

  // Binary search for the UTC timestamp that corresponds to bookingHour:00:00
  // in the venue's timezone. This correctly handles DST transitions.
  // Start with a naive UTC guess, then adjust.
  let guess = new Date(Date.UTC(oYear, oMonth, oDay, bookingHour, 0, 0));

  for (let i = 0; i < 4; i++) {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(guess);
    const get = (t: string) => parseInt(parts.find((p) => p.type === t)?.value ?? "0");
    const localHour = get("hour");
    const localDay = get("day");

    const hourDiff = bookingHour - localHour;
    const dayDiff = oDay - localDay;
    const totalHourAdjust = hourDiff + dayDiff * 24;

    if (totalHourAdjust === 0) break;
    guess = new Date(guess.getTime() + totalHourAdjust * 3600000);
  }

  return guess;
}

export async function armSnipe(snipe: Snipe): Promise<void> {
  const db = getDb();

  // Demo mode: fire in 2 seconds, skip all window calculation
  if (snipe.demo) {
    log(snipe.id, "info", "schedule", `DEMO mode — firing in 2 seconds`);
    const fakeWindow = new Date(Date.now() + 2000).toISOString();
    db.prepare(
      "UPDATE snipes SET booking_window_start = ?, status = 'armed', updated_at = datetime('now') WHERE id = ?"
    ).run(fakeWindow, snipe.id);

    const timer = setTimeout(() => {
      activeTimers.delete(snipe.id);
      fireSnipe(snipe);
    }, 2000);
    timer.unref?.();
    activeTimers.set(snipe.id, timer);
    return;
  }

  const venue = db.prepare("SELECT * FROM venues WHERE id = ?").get(snipe.venue_id) as {
    resy_id: number;
    name: string;
    lead_time_days: number | null;
    booking_hour: number;
    time_zone: string;
  } | undefined;

  if (!venue) {
    log(snipe.id, "error", "schedule", "Venue not found");
    return;
  }

  let leadTimeDays = venue.lead_time_days;

  if (leadTimeDays == null) {
    const account = db.prepare("SELECT * FROM accounts WHERE id = ?").get(snipe.account_id) as
      | { auth_token: string }
      | undefined;
    const apiKey = process.env.RESY_API_KEY!;

    if (account) {
      log(snipe.id, "info", "schedule", `Fetching lead time for ${venue.name} from Resy API...`);
      const config = await getVenueConfig(apiKey, decrypt(account.auth_token), venue.resy_id);
      if (config.ok && config.data) {
        leadTimeDays = config.data.lead_time_in_days;
        db.prepare("UPDATE venues SET lead_time_days = ? WHERE id = ?").run(leadTimeDays, snipe.venue_id);
        log(snipe.id, "info", "schedule", `Lead time: ${leadTimeDays} days`);
      } else {
        log(snipe.id, "warn", "schedule", `Could not fetch lead time, defaulting to 14 days`, {
          error: config.error,
        });
        leadTimeDays = 14;
      }
    } else {
      leadTimeDays = 14;
    }
  }

  const bookingWindowStart = computeBookingWindowStart(
    snipe.date,
    leadTimeDays,
    venue.booking_hour,
    venue.time_zone
  );

  const wakeTime = new Date(bookingWindowStart.getTime() - snipe.wake_adjustment_ms);
  const msUntilWake = wakeTime.getTime() - Date.now();

  db.prepare(
    "UPDATE snipes SET booking_window_start = ?, status = 'armed', updated_at = datetime('now') WHERE id = ?"
  ).run(bookingWindowStart.toISOString(), snipe.id);

  log(snipe.id, "info", "schedule", `Booking window opens: ${bookingWindowStart.toISOString()}`);
  log(snipe.id, "info", "schedule", `Wake time (with ${snipe.wake_adjustment_ms}ms adjustment): ${wakeTime.toISOString()}`);

  if (msUntilWake <= 0) {
    log(snipe.id, "info", "schedule", "Booking window already open — executing immediately");
    fireSnipe(snipe);
    return;
  }

  const hours = Math.floor(msUntilWake / 3600000);
  const mins = Math.floor((msUntilWake % 3600000) / 60000);
  const secs = Math.floor((msUntilWake % 60000) / 1000);
  log(snipe.id, "info", "schedule", `Sleeping ${hours}h ${mins}m ${secs}s until wake`);

  if (activeTimers.has(snipe.id)) {
    clearTimeout(activeTimers.get(snipe.id)!);
  }

  const scheduleWithSafeDelay = (delay: number) => {
    if (delay > MAX_TIMEOUT) {
      const timer = setTimeout(() => scheduleWithSafeDelay(delay - MAX_TIMEOUT), MAX_TIMEOUT);
      timer.unref?.();
      activeTimers.set(snipe.id, timer);
    } else {
      const timer = setTimeout(() => {
        activeTimers.delete(snipe.id);
        fireSnipe(snipe);
      }, delay);
      timer.unref?.();
      activeTimers.set(snipe.id, timer);
    }
  };

  scheduleWithSafeDelay(msUntilWake);
}

async function fireSnipe(snipe: Snipe) {
  const db = getDb();
  const freshSnipe = db.prepare("SELECT * FROM snipes WHERE id = ?").get(snipe.id) as Snipe | undefined;
  if (!freshSnipe || freshSnipe.status === "cancelled") {
    log(snipe.id, "info", "schedule", "Snipe was cancelled before firing");
    return;
  }

  log(snipe.id, "info", "wake", `WOKE UP — starting snipe execution`);
  log(snipe.id, "info", "wake", `Current time: ${new Date().toISOString()}`);
  if (freshSnipe.booking_window_start) {
    const diff = Date.now() - new Date(freshSnipe.booking_window_start).getTime();
    log(
      snipe.id,
      "info",
      "wake",
      `${diff < 0 ? Math.abs(diff) + "ms BEFORE" : diff + "ms AFTER"} booking window open`
    );
  }

  await executeSnipe(freshSnipe);
}

export function cancelSnipe(snipeId: number): boolean {
  const timer = activeTimers.get(snipeId);
  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(snipeId);
    const db = getDb();
    db.prepare("UPDATE snipes SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?").run(snipeId);
    log(snipeId, "info", "schedule", "Snipe cancelled");
    return true;
  }
  return false;
}

export function getSchedulerStatus() {
  return {
    active_timers: Array.from(activeTimers.keys()),
    count: activeTimers.size,
  };
}

export async function loadPendingSnipes() {
  const db = getDb();
  const pending = db
    .prepare("SELECT * FROM snipes WHERE status IN ('scheduled', 'armed')")
    .all() as Snipe[];

  console.log(`[SCHEDULER] Loading ${pending.length} pending snipe(s)...`);
  for (const snipe of pending) {
    await armSnipe(snipe);
  }
}
