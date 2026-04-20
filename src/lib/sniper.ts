import { getDb, saveDiningTypes, type Snipe, type Preference } from "./db";
import { decrypt } from "./crypto";
import {
  findReservation,
  getReservationDetails,
  bookReservation,
  type Slot,
  type FindResponse,
  type ApiCallResult,
} from "./resy-api";
import {
  demoFindReservation,
  demoGetDetails,
  demoBook,
  resetDemoState,
} from "./demo-data";

type LogLevel = "debug" | "info" | "warn" | "error";

function log(
  snipeId: number,
  level: LogLevel,
  phase: string,
  message: string,
  data?: unknown,
  duration_ms?: number
) {
  const db = getDb();
  const timestamp = new Date().toISOString();
  const dataStr = data !== undefined ? JSON.stringify(data) : null;
  db.prepare(
    `INSERT INTO snipe_logs (snipe_id, timestamp, level, phase, message, data, duration_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(snipeId, timestamp, level, phase, message, dataStr, duration_ms ?? null);
  const prefix = `[${timestamp}] [${phase.toUpperCase().padEnd(8)}]`;
  console.log(`${prefix} ${message}`);
}

function parseSlotTime(dateStart: string): string {
  const parts = dateStart.split(" ");
  if (parts.length < 2) return dateStart;
  return parts[1].slice(0, 5);
}

function formatSlotSummary(slots: Slot[]): string[] {
  return slots.map((s) => {
    const time = parseSlotTime(s.date.start);
    const type = s.config.type;
    const seats = `${s.size.min}-${s.size.max}`;
    return `${time} ${type} (seats ${seats})`;
  });
}

function matchPreferences(
  slots: Slot[],
  preferences: Preference[]
): { slot: Slot; prefIndex: number; prefLabel: string } | null {
  for (let i = 0; i < preferences.length; i++) {
    const pref = preferences[i];
    const match = slots.find((s) => {
      const slotTime = parseSlotTime(s.date.start);
      if (slotTime !== pref.time) return false;
      if (pref.dining_type && s.config.type !== pref.dining_type) return false;
      return true;
    });
    if (match) {
      const label = pref.dining_type
        ? `${pref.time} ${pref.dining_type}`
        : `${pref.time} (any type)`;
      return { slot: match, prefIndex: i, prefLabel: label };
    }
  }
  return null;
}

async function prewarmConnection(apiKey: string, authToken: string): Promise<number> {
  const start = performance.now();
  try {
    await fetch("https://api.resy.com/2/config?venue_id=1", {
      method: "GET",
      headers: {
        Authorization: `ResyAPI api_key="${apiKey}"`,
        "x-resy-auth-token": authToken,
        accept: "application/json",
        "user-agent": "Mozilla/5.0",
        origin: "https://widgets.resy.com",
        referer: "https://widgets.resy.com/",
      },
    });
  } catch {}
  return Math.round(performance.now() - start);
}

export type SnipeResult = {
  success: boolean;
  reservation_id: string | null;
  reason: string;
  total_attempts: number;
  total_duration_ms: number;
  slots_seen: number;
};

type ResearchSlotSnapshot = {
  time: string;
  type: string;
  min_seats: number;
  max_seats: number;
  first_seen_ms: number;
  last_seen_ms: number;
  seen_count: number;
};

export type ResearchSummary = {
  total_sweeps: number;
  duration_ms: number;
  total_unique_slots: number;
  peak_available: number;
  slots: ResearchSlotSnapshot[];
  timeline: Array<{ ms: number; available: number }>;
};

async function doFind(
  snipe: Snipe,
  apiKey: string,
  authToken: string,
  venueResyId: number
): Promise<ApiCallResult<FindResponse>> {
  if (snipe.demo) {
    return demoFindReservation(snipe.date, snipe.party_size);
  }
  return findReservation(apiKey, authToken, venueResyId, snipe.date, snipe.party_size);
}

// ─── RESEARCH MODE ───

async function executeResearch(snipe: Snipe): Promise<SnipeResult> {
  const db = getDb();
  const account = db.prepare("SELECT * FROM accounts WHERE id = ?").get(snipe.account_id) as
    | { email: string; auth_token: string }
    | undefined;

  if (!account) {
    log(snipe.id, "error", "auth", `No account found (id: ${snipe.account_id})`);
    return { success: false, reservation_id: null, reason: "Account not found", total_attempts: 0, total_duration_ms: 0, slots_seen: 0 };
  }

  const apiKey = process.env.RESY_API_KEY!;
  const authToken = snipe.demo ? "demo" : decrypt(account.auth_token);
  const venue = db.prepare("SELECT * FROM venues WHERE id = ?").get(snipe.venue_id) as
    | { resy_id: number; name: string }
    | undefined;

  if (!venue) {
    log(snipe.id, "error", "setup", `Venue not found`);
    return { success: false, reservation_id: null, reason: "Venue not found", total_attempts: 0, total_duration_ms: 0, slots_seen: 0 };
  }

  db.prepare("UPDATE snipes SET status = 'running', updated_at = datetime('now') WHERE id = ?").run(snipe.id);

  if (snipe.demo) resetDemoState();

  log(snipe.id, "info", "start", `RESEARCH mode${snipe.demo ? " (DEMO)" : ""} for ${venue.name} on ${snipe.date}`);

  if (!snipe.demo) {
    const warmMs = await prewarmConnection(apiKey, authToken);
    log(snipe.id, "info", "prewarm", `TLS pre-warmed (${warmMs}ms)`, null, warmMs);
  }

  const researchStart = performance.now();
  const researchDuration = snipe.retry_timeout_seconds * 1000;
  const deadline = researchStart + researchDuration;

  const slotMap = new Map<string, ResearchSlotSnapshot>();
  const timeline: Array<{ ms: number; available: number }> = [];
  let sweepCount = 0;
  let peakAvailable = 0;

  // Sweep interval: fast at first (catch the drop), then slow down
  const getSweepDelay = (elapsed: number) => {
    if (elapsed < 5000) return 200;
    if (elapsed < 15000) return 500;
    if (elapsed < 30000) return 1000;
    return 2000;
  };

  while (performance.now() < deadline) {
    sweepCount++;
    const elapsed = Math.round(performance.now() - researchStart);

    const result = await doFind(snipe, apiKey, authToken, venue.resy_id);

    if (!result.ok) {
      log(snipe.id, "warn", "find", `Sweep #${sweepCount}: API error`, { error: result.error }, result.duration_ms);
      await new Promise((r) => setTimeout(r, 500));
      continue;
    }

    const venues = result.data?.results?.venues ?? [];
    const slots = venues.flatMap((v) => v.slots ?? []);

    if (slots.length > peakAvailable) peakAvailable = slots.length;
    timeline.push({ ms: elapsed, available: slots.length });

    for (const slot of slots) {
      const time = parseSlotTime(slot.date.start);
      const key = `${time}|${slot.config.type}|${slot.size.min}-${slot.size.max}`;
      const existing = slotMap.get(key);
      if (existing) {
        existing.last_seen_ms = elapsed;
        existing.seen_count++;
      } else {
        slotMap.set(key, {
          time,
          type: slot.config.type,
          min_seats: slot.size.min,
          max_seats: slot.size.max,
          first_seen_ms: elapsed,
          last_seen_ms: elapsed,
          seen_count: 1,
        });
      }
    }

    if (slots.length > 0 && (sweepCount <= 5 || sweepCount % 10 === 0)) {
      log(snipe.id, "info", "find", `Sweep #${sweepCount}: ${slots.length} slots available (+${elapsed}ms)`, {
        slots: formatSlotSummary(slots),
      }, result.duration_ms);
    } else if (slots.length === 0 && sweepCount <= 10) {
      log(snipe.id, "info", "find", `Sweep #${sweepCount}: 0 slots (+${elapsed}ms)`, null, result.duration_ms);
    }

    const delay = getSweepDelay(elapsed);
    await new Promise((r) => setTimeout(r, delay));
  }

  const totalMs = Math.round(performance.now() - researchStart);
  const allSlots = Array.from(slotMap.values()).sort((a, b) => a.time.localeCompare(b.time) || a.type.localeCompare(b.type));

  const uniqueTypes = [...new Set(allSlots.map((s) => s.type))];
  if (uniqueTypes.length > 0 && !snipe.demo) {
    saveDiningTypes(snipe.venue_id, uniqueTypes);
  }

  const summary: ResearchSummary = {
    total_sweeps: sweepCount,
    duration_ms: totalMs,
    total_unique_slots: allSlots.length,
    peak_available: peakAvailable,
    slots: allSlots,
    timeline,
  };

  db.prepare(
    "UPDATE snipes SET status = 'success', research_summary = ?, updated_at = datetime('now') WHERE id = ?"
  ).run(JSON.stringify(summary), snipe.id);

  log(snipe.id, "info", "done", `Research complete: ${sweepCount} sweeps, ${allSlots.length} unique slots found, peak ${peakAvailable} available at once`, summary);

  if (allSlots.length === 0) {
    log(snipe.id, "warn", "analysis", `No slots were ever observed during the ${snipe.retry_timeout_seconds}s observation window.`);
  } else {
    const fastGone = allSlots.filter((s) => {
      const lifespan = s.last_seen_ms - s.first_seen_ms;
      return lifespan < 5000 && ["19:00", "19:30", "20:00"].includes(s.time);
    });
    if (fastGone.length > 0) {
      log(snipe.id, "info", "analysis", `${fastGone.length} prime-time slots disappeared in under 5 seconds — heavy competition`);
    }
  }

  return {
    success: true,
    reservation_id: null,
    reason: `Observed ${allSlots.length} unique slots over ${sweepCount} sweeps`,
    total_attempts: sweepCount,
    total_duration_ms: totalMs,
    slots_seen: allSlots.length,
  };
}

// ─── BOOK MODE ───

async function executeBook(snipe: Snipe): Promise<SnipeResult> {
  const db = getDb();
  const account = db.prepare("SELECT * FROM accounts WHERE id = ?").get(snipe.account_id) as
    | { email: string; auth_token: string }
    | undefined;

  if (!account) {
    log(snipe.id, "error", "auth", `No account found (id: ${snipe.account_id})`);
    return { success: false, reservation_id: null, reason: "Resy account not found. Go to Settings and add an account.", total_attempts: 0, total_duration_ms: 0, slots_seen: 0 };
  }

  const apiKey = process.env.RESY_API_KEY!;
  const authToken = snipe.demo ? "demo" : decrypt(account.auth_token);
  log(snipe.id, "info", "auth", `Using account: ${account.email}${snipe.demo ? " (DEMO)" : ""}`);
  const preferences: Preference[] = JSON.parse(snipe.preferences);
  const venue = db.prepare("SELECT * FROM venues WHERE id = ?").get(snipe.venue_id) as
    | { resy_id: number; name: string }
    | undefined;

  if (!venue) {
    log(snipe.id, "error", "setup", `Venue ID ${snipe.venue_id} not found in database`);
    return { success: false, reservation_id: null, reason: "Venue not found in database", total_attempts: 0, total_duration_ms: 0, slots_seen: 0 };
  }

  db.prepare("UPDATE snipes SET status = 'running', updated_at = datetime('now') WHERE id = ?").run(snipe.id);

  if (snipe.demo) resetDemoState();

  log(snipe.id, "info", "start", `Snipe started${snipe.demo ? " (DEMO)" : ""} for ${venue.name} on ${snipe.date}, party of ${snipe.party_size}`);
  log(snipe.id, "info", "start", `Preferences: ${preferences.map((p, i) => `${i + 1}) ${p.time}${p.dining_type ? " " + p.dining_type : " (any)"}`).join(", ")}`);
  log(snipe.id, "info", "start", `Retry timeout: ${snipe.retry_timeout_seconds}s`);

  if (!snipe.demo) {
    const warmMs = await prewarmConnection(apiKey, authToken);
    log(snipe.id, "info", "prewarm", `TLS connection pre-warmed (${warmMs}ms)`, null, warmMs);
  }

  const snipeStart = performance.now();
  const deadline = snipeStart + snipe.retry_timeout_seconds * 1000;
  let attempt = 0;
  let totalSlotsEverSeen = 0;
  let lastSlotsSeen: string[] = [];
  const allUniqueSlots = new Set<string>();

  const BURST_SIZE = 5;

  while (performance.now() < deadline) {
    const burstCount = attempt === 0 ? BURST_SIZE : 1;
    attempt += burstCount;

    const findPromises: Promise<ApiCallResult<FindResponse>>[] = [];
    for (let i = 0; i < burstCount; i++) {
      findPromises.push(doFind(snipe, apiKey, authToken, venue.resy_id));
    }

    const findResults = await Promise.all(findPromises);
    const fastestOk = findResults
      .filter((r) => r.ok)
      .sort((a, b) => a.duration_ms - b.duration_ms)[0];

    if (burstCount > 1) {
      const times = findResults.map((r) => `${r.duration_ms}ms`).join(", ");
      log(snipe.id, "info", "find", `Burst of ${burstCount} requests: [${times}]`, null, findResults[0]?.duration_ms);
    }

    const findResult = fastestOk ?? findResults[0];

    if (!findResult.ok) {
      log(snipe.id, "warn", "find", `Attempt #${attempt}: API error (${findResult.duration_ms}ms)`, {
        status: findResult.status,
        error: findResult.error,
      }, findResult.duration_ms);

      if (findResult.status === 412) {
        log(snipe.id, "error", "find", "HTTP 412 — you may already have a reservation at this venue", {
          raw: findResult.raw.slice(0, 1000),
        });
        db.prepare("UPDATE snipes SET status = 'failed', updated_at = datetime('now') WHERE id = ?").run(snipe.id);
        return {
          success: false,
          reservation_id: null,
          reason: "Already have a reservation at this venue (HTTP 412)",
          total_attempts: attempt,
          total_duration_ms: Math.round(performance.now() - snipeStart),
          slots_seen: totalSlotsEverSeen,
        };
      }
      continue;
    }

    const venues = findResult.data?.results?.venues ?? [];
    const slots = venues.flatMap((v) => v.slots ?? []);

    if (slots.length === 0) {
      if (attempt <= BURST_SIZE + 1 || attempt % 20 === 0) {
        log(snipe.id, "info", "find", `Attempt #${attempt}: 0 slots (${findResult.duration_ms}ms)`, null, findResult.duration_ms);
      }
      continue;
    }

    totalSlotsEverSeen += slots.length;
    const slotSummary = formatSlotSummary(slots);
    slotSummary.forEach((s) => allUniqueSlots.add(s));
    lastSlotsSeen = slotSummary;

    if (!snipe.demo) {
      const types = [...new Set(slots.map((s) => s.config.type))];
      if (types.length > 0) saveDiningTypes(snipe.venue_id, types);
    }

    log(
      snipe.id,
      "info",
      "find",
      `Attempt #${attempt}: ${slots.length} slots found! (${findResult.duration_ms}ms)`,
      { slots: slotSummary },
      findResult.duration_ms
    );

    const match = matchPreferences(slots, preferences);

    if (!match) {
      log(
        snipe.id,
        "warn",
        "match",
        `No preference matched. Available: ${slotSummary.join(", ")}`,
        {
          available: slotSummary,
          wanted: preferences.map((p) => `${p.time}${p.dining_type ? " " + p.dining_type : ""}`),
        }
      );
      continue;
    }

    const matchTime = parseSlotTime(match.slot.date.start);
    log(
      snipe.id,
      "info",
      "match",
      `MATCH on preference #${match.prefIndex + 1}: ${match.prefLabel} → slot ${matchTime} ${match.slot.config.type}`,
      { config_token: match.slot.config.token }
    );

    // DETAILS
    let detailsResult;
    if (snipe.demo) {
      detailsResult = demoGetDetails();
    } else {
      detailsResult = await getReservationDetails(
        apiKey,
        authToken,
        match.slot.config.token,
        snipe.date,
        snipe.party_size
      );
    }

    if (!detailsResult.ok) {
      log(snipe.id, "error", "details", `Failed to get reservation details (${detailsResult.duration_ms}ms)`, {
        status: detailsResult.status,
        error: detailsResult.error,
      }, detailsResult.duration_ms);
      continue;
    }

    const bookToken = detailsResult.data?.book_token?.value;
    const paymentMethods = detailsResult.data?.user?.payment_methods ?? [];

    if (!bookToken) {
      log(snipe.id, "error", "details", "No book_token in response", {
        raw: detailsResult.raw.slice(0, 1000),
      });
      continue;
    }

    log(snipe.id, "info", "details", `Got book_token (${detailsResult.duration_ms}ms)`, null, detailsResult.duration_ms);

    // BOOK
    let bookResult;
    if (snipe.demo) {
      bookResult = demoBook();
    } else {
      const paymentId = paymentMethods.length > 0 ? paymentMethods[0].id : undefined;
      bookResult = await bookReservation(apiKey, authToken, bookToken, paymentId);
    }

    if (!bookResult.ok) {
      log(snipe.id, "error", "book", `Booking failed! (${bookResult.duration_ms}ms)`, {
        status: bookResult.status,
        error: bookResult.error,
        raw: bookResult.raw.slice(0, 2000),
      }, bookResult.duration_ms);

      if (bookResult.status === 412) {
        log(snipe.id, "error", "book", "HTTP 412 — reservation conflict. Someone beat us to it or you already have one.");
      }
      continue;
    }

    const reservationId = String(bookResult.data?.reservation_id ?? "unknown");
    const totalMs = Math.round(performance.now() - snipeStart);

    log(snipe.id, "info", "book", `RESERVATION CONFIRMED${snipe.demo ? " (DEMO)" : ""}! ID: ${reservationId} (${bookResult.duration_ms}ms)`, {
      reservation_id: reservationId,
      resy_token: bookResult.data?.resy_token,
    }, bookResult.duration_ms);

    log(snipe.id, "info", "done", `Total: ${totalMs}ms | ${attempt} attempts`);

    db.prepare(
      "UPDATE snipes SET status = 'success', reservation_id = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(reservationId, snipe.id);

    return {
      success: true,
      reservation_id: reservationId,
      reason: `Booked ${matchTime} ${match.slot.config.type} on attempt #${attempt}`,
      total_attempts: attempt,
      total_duration_ms: totalMs,
      slots_seen: totalSlotsEverSeen,
    };
  }

  // TIMEOUT
  const totalMs = Math.round(performance.now() - snipeStart);

  log(snipe.id, "error", "timeout", `TIMED OUT after ${snipe.retry_timeout_seconds}s (${attempt} attempts)`);

  if (totalSlotsEverSeen === 0) {
    log(snipe.id, "error", "analysis", `ZERO slots returned across ${attempt} attempts. No inventory released for ${snipe.date}.`);
  } else {
    log(snipe.id, "error", "analysis", `Slots existed but none matched your preferences.`, {
      your_preferences: preferences.map((p) => `${p.time}${p.dining_type ? " " + p.dining_type : ""}`),
      all_slots_seen: Array.from(allUniqueSlots),
      last_slots_available: lastSlotsSeen,
    });
  }

  db.prepare("UPDATE snipes SET status = 'failed', updated_at = datetime('now') WHERE id = ?").run(snipe.id);

  return {
    success: false,
    reservation_id: null,
    reason: totalSlotsEverSeen === 0
      ? `No inventory released (${attempt} attempts in ${totalMs}ms)`
      : `Preferences not matched (${attempt} attempts in ${totalMs}ms)`,
    total_attempts: attempt,
    total_duration_ms: totalMs,
    slots_seen: totalSlotsEverSeen,
  };
}

// ─── ENTRY POINT ───

export async function executeSnipe(snipe: Snipe): Promise<SnipeResult> {
  if (snipe.mode === "research") {
    return executeResearch(snipe);
  }
  return executeBook(snipe);
}
