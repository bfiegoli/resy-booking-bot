import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { armSnipe } from "@/lib/scheduler";

export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const db = getDb();

  let snipes;
  if (status) {
    snipes = db.prepare("SELECT * FROM snipes WHERE status = ? ORDER BY date ASC, created_at DESC").all(status);
  } else {
    snipes = db.prepare("SELECT * FROM snipes ORDER BY date ASC, created_at DESC").all();
  }

  return NextResponse.json({ snipes });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { account_id, venue_id, venue_name, date, party_size, preferences, retry_timeout_seconds, wake_adjustment_ms, mode, demo } = body;

  const snipeMode = mode === "research" ? "research" : "book";
  const isDemo = demo ? 1 : 0;

  if (!account_id || !venue_id || !venue_name || !date) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (snipeMode === "book" && (!party_size || !preferences?.length)) {
    return NextResponse.json({ error: "Book mode requires party size and preferences" }, { status: 400 });
  }

  const db = getDb();

  const account = db.prepare("SELECT id FROM accounts WHERE id = ?").get(account_id);
  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 400 });
  }

  const venue = db.prepare("SELECT id FROM venues WHERE id = ?").get(venue_id);
  if (!venue) {
    return NextResponse.json({ error: "Venue not found. Save the venue first." }, { status: 400 });
  }

  const result = db.prepare(
    `INSERT INTO snipes (account_id, venue_id, venue_name, date, party_size, preferences, retry_timeout_seconds, wake_adjustment_ms, mode, demo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    account_id,
    venue_id,
    venue_name,
    date,
    party_size ?? 2,
    JSON.stringify(preferences ?? []),
    retry_timeout_seconds ?? (snipeMode === "research" ? 30 : 15),
    wake_adjustment_ms ?? 500,
    snipeMode,
    isDemo
  );

  const snipe = db.prepare("SELECT * FROM snipes WHERE id = ?").get(result.lastInsertRowid);

  // Arm the snipe in the scheduler
  armSnipe(snipe as any);

  return NextResponse.json({ snipe }, { status: 201 });
}
