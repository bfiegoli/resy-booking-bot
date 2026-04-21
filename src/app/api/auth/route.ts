import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { login } from "@/lib/resy-api";
import { encrypt } from "@/lib/crypto";

export async function GET() {
  const db = getDb();
  const accounts = db
    .prepare("SELECT id, email, first_name, last_name, is_default, created_at, updated_at FROM accounts ORDER BY is_default DESC, created_at ASC")
    .all();
  return NextResponse.json({ accounts });
}

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const apiKey = process.env.RESY_API_KEY!;
  const result = await login(apiKey, email, password);

  if (!result.ok || !result.data) {
    return NextResponse.json(
      { error: result.error ?? "Login failed", status: result.status },
      { status: 401 }
    );
  }

  const db = getDb();
  const existingCount = db.prepare("SELECT COUNT(*) as count FROM accounts").get() as { count: number };

  db.prepare(
    `INSERT INTO accounts (email, auth_token, first_name, last_name, is_default, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(email) DO UPDATE SET
       auth_token = excluded.auth_token,
       first_name = excluded.first_name,
       last_name = excluded.last_name,
       updated_at = datetime('now')`
  ).run(email, encrypt(result.data.token), result.data.first_name, result.data.last_name, existingCount.count === 0 ? 1 : 0);

  const account = db.prepare("SELECT id, email, first_name, last_name, is_default FROM accounts WHERE email = ?").get(email);

  return NextResponse.json({ success: true, account });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  const db = getDb();
  const activeSnipes = db.prepare("SELECT COUNT(*) as count FROM snipes WHERE account_id = ? AND status IN ('scheduled','armed','running')").get(id) as { count: number };
  if (activeSnipes.count > 0) {
    return NextResponse.json({ error: `Account has ${activeSnipes.count} active snipe(s). Cancel them first.` }, { status: 400 });
  }
  db.prepare("DELETE FROM accounts WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
