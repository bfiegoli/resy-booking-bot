import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT dining_type, last_seen FROM venue_dining_types WHERE venue_id = ? ORDER BY dining_type"
    )
    .all(Number(id)) as Array<{ dining_type: string; last_seen: string }>;

  return NextResponse.json({ dining_types: rows.map((r) => r.dining_type) });
}
