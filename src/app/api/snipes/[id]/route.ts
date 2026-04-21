import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { cancelSnipe } from "@/lib/scheduler";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const snipe = db.prepare("SELECT * FROM snipes WHERE id = ?").get(id);
  if (!snipe) {
    return NextResponse.json({ error: "Snipe not found" }, { status: 404 });
  }
  return NextResponse.json({ snipe });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const snipe = db.prepare("SELECT * FROM snipes WHERE id = ?").get(id) as { id: number; status: string } | undefined;
  if (!snipe) {
    return NextResponse.json({ error: "Snipe not found" }, { status: 404 });
  }

  cancelSnipe(snipe.id);
  db.prepare("UPDATE snipes SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
