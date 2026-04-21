import { NextRequest, NextResponse } from "next/server";
import { getDb, type Account } from "@/lib/db";
import { getVenueConfig } from "@/lib/resy-api";
import { decrypt } from "@/lib/crypto";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const venue = db.prepare("SELECT * FROM venues WHERE id = ? OR resy_id = ?").get(id, id) as
    | { id: number; resy_id: number; booking_hour: number; time_zone: string }
    | undefined;

  if (!venue) {
    return NextResponse.json({ error: "Venue not found" }, { status: 404 });
  }

  const account = db.prepare(
    "SELECT * FROM accounts ORDER BY is_default DESC LIMIT 1"
  ).get() as Account | undefined;

  if (!account) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const apiKey = process.env.RESY_API_KEY!;
  const authToken = decrypt(account.auth_token);
  const result = await getVenueConfig(apiKey, authToken, venue.resy_id);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  const leadTimeDays = result.data?.lead_time_in_days ?? null;
  if (leadTimeDays != null) {
    db.prepare("UPDATE venues SET lead_time_days = ? WHERE id = ?").run(leadTimeDays, venue.id);
  }

  return NextResponse.json({
    lead_time_days: leadTimeDays,
    booking_hour: venue.booking_hour,
    time_zone: venue.time_zone,
    duration_ms: result.duration_ms,
  });
}
