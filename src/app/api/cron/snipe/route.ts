import { NextRequest, NextResponse } from "next/server";
import { getDb, type Snipe } from "@/lib/db";
import { executeSnipe } from "@/lib/sniper";

// Vercel Pro: up to 300s function duration
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  // Verify cron secret in production to prevent unauthorized triggers
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  const now = Date.now();

  // Find snipes whose booking window opens within the next 90 seconds
  // (cron fires every minute, so 90s gives us overlap buffer)
  const cutoff = new Date(now + 90_000).toISOString();

  const dueSnipes = db
    .prepare(
      `SELECT * FROM snipes
       WHERE status IN ('scheduled', 'armed')
         AND booking_window_start IS NOT NULL
         AND booking_window_start <= ?
       ORDER BY booking_window_start ASC`
    )
    .all(cutoff) as Snipe[];

  if (dueSnipes.length === 0) {
    return NextResponse.json({ message: "No snipes due", checked_at: new Date().toISOString() });
  }

  const results = [];

  for (const snipe of dueSnipes) {
    const windowStart = new Date(snipe.booking_window_start!).getTime();
    const wakeTime = windowStart - snipe.wake_adjustment_ms;
    const msToWait = wakeTime - Date.now();

    // Log that we're picking up this snipe
    const timestamp = new Date().toISOString();
    db.prepare(
      `INSERT INTO snipe_logs (snipe_id, timestamp, level, phase, message, data)
       VALUES (?, ?, 'info', 'cron', ?, ?)`
    ).run(
      snipe.id,
      timestamp,
      `Cron picked up snipe. Window opens in ${Math.round(msToWait / 1000)}s. Busy-waiting...`,
      JSON.stringify({ window_start: snipe.booking_window_start, wake_time: new Date(wakeTime).toISOString() })
    );

    // Busy-wait until the exact wake time (sub-second precision)
    if (msToWait > 0) {
      // Coarse wait with setTimeout for most of the duration (saves CPU)
      const coarseWait = msToWait - 50;
      if (coarseWait > 0) {
        await new Promise((resolve) => setTimeout(resolve, coarseWait));
      }
      // Tight spin loop for the final 50ms (maximum precision)
      while (Date.now() < wakeTime) {
        // spin
      }
    }

    db.prepare(
      `INSERT INTO snipe_logs (snipe_id, timestamp, level, phase, message)
       VALUES (?, ?, 'info', 'cron', ?)`
    ).run(
      snipe.id,
      new Date().toISOString(),
      `Busy-wait complete. Firing snipe. ${Date.now() - windowStart}ms relative to window open.`
    );

    const result = await executeSnipe(snipe);
    results.push({ snipe_id: snipe.id, ...result });
  }

  return NextResponse.json({ results });
}
