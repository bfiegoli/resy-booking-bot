import { NextRequest, NextResponse } from "next/server";
import { getDb, type Snipe } from "@/lib/db";
import { executeSnipe } from "@/lib/sniper";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const snipe = db.prepare("SELECT * FROM snipes WHERE id = ?").get(id) as Snipe | undefined;

  if (!snipe) {
    return NextResponse.json({ error: "Snipe not found" }, { status: 404 });
  }

  if (snipe.status === "running") {
    return NextResponse.json({ error: "Snipe is already running" }, { status: 409 });
  }

  const result = await executeSnipe(snipe);
  return NextResponse.json({ result });
}
