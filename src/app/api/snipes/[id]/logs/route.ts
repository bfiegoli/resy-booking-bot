import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const logs = db
    .prepare("SELECT * FROM snipe_logs WHERE snipe_id = ? ORDER BY timestamp ASC, id ASC")
    .all(id);
  return NextResponse.json({ logs });
}
