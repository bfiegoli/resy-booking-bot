import { NextRequest, NextResponse } from "next/server";
import { getDb, saveDiningTypes } from "@/lib/db";
import { findReservation } from "@/lib/resy-api";
import { decrypt } from "@/lib/crypto";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const venueId = Number(id);
  const db = getDb();

  // Check DB first
  let rows = db
    .prepare(
      "SELECT dining_type FROM venue_dining_types WHERE venue_id = ? ORDER BY dining_type"
    )
    .all(venueId) as Array<{ dining_type: string }>;

  if (rows.length > 0) {
    return NextResponse.json({ dining_types: rows.map((r) => r.dining_type) });
  }

  // Nothing cached — try a live fetch from Resy
  const venue = db.prepare("SELECT resy_id FROM venues WHERE id = ?").get(venueId) as
    | { resy_id: number }
    | undefined;
  const account = db
    .prepare("SELECT auth_token FROM accounts ORDER BY is_default DESC LIMIT 1")
    .get() as { auth_token: string } | undefined;

  if (!venue || !account) {
    return NextResponse.json({ dining_types: [] });
  }

  const apiKey = process.env.RESY_API_KEY!;
  const authToken = decrypt(account.auth_token);

  // Try today + next few days to find any available slots
  const today = new Date();
  for (let offset = 0; offset <= 7; offset++) {
    const d = new Date(today);
    d.setDate(d.getDate() + offset);
    const dateStr = d.toISOString().slice(0, 10);

    const result = await findReservation(apiKey, authToken, venue.resy_id, dateStr, 2);
    if (!result.ok) continue;

    const venues = result.data?.results?.venues ?? [];
    const slots = venues.flatMap((v) => v.slots ?? []);
    const types = [...new Set(slots.map((s) => s.config.type))];

    if (types.length > 0) {
      saveDiningTypes(venueId, types);
      return NextResponse.json({ dining_types: types.sort() });
    }
  }

  return NextResponse.json({ dining_types: [] });
}
