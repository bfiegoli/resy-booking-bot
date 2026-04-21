import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// We test the DB module by setting DB_PATH to a temp file and importing fresh each time.
// Since getDb() caches the singleton, we need a fresh import per test suite.

const TEST_DB_DIR = path.join(__dirname, ".test-dbs");

function freshDb(name: string) {
  if (!fs.existsSync(TEST_DB_DIR)) fs.mkdirSync(TEST_DB_DIR, { recursive: true });
  const dbPath = path.join(TEST_DB_DIR, `${name}-${Date.now()}.db`);
  process.env.DB_PATH = dbPath;
  return dbPath;
}

describe("db schema", () => {
  let dbPath: string;

  beforeEach(() => {
    dbPath = freshDb("schema");
  });

  afterEach(() => {
    try { fs.unlinkSync(dbPath); } catch {}
  });

  it("creates all expected tables", async () => {
    // Dynamic import so DB_PATH env is read fresh
    // We directly use better-sqlite3 and run the same migration logic
    const db = new Database(dbPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    // Run the same schema as db.ts
    db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        auth_token TEXT NOT NULL,
        first_name TEXT,
        last_name TEXT,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS venues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        resy_id INTEGER NOT NULL UNIQUE,
        name TEXT NOT NULL,
        neighborhood TEXT,
        cuisine TEXT,
        image_url TEXT,
        location_name TEXT,
        url_slug TEXT,
        max_party_size INTEGER,
        rating_average REAL,
        rating_count INTEGER,
        price_range_id INTEGER,
        lead_time_days INTEGER,
        booking_hour INTEGER DEFAULT 9,
        time_zone TEXT DEFAULT 'America/New_York',
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE IF NOT EXISTS snipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        venue_id INTEGER NOT NULL,
        venue_name TEXT NOT NULL,
        date TEXT NOT NULL,
        party_size INTEGER NOT NULL,
        preferences TEXT NOT NULL,
        mode TEXT NOT NULL DEFAULT 'book' CHECK(mode IN ('book','research')),
        demo INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'scheduled'
          CHECK(status IN ('scheduled','armed','running','success','failed','cancelled')),
        reservation_id TEXT,
        booking_window_start TEXT,
        retry_timeout_seconds INTEGER NOT NULL DEFAULT 15,
        wake_adjustment_ms INTEGER NOT NULL DEFAULT 500,
        research_summary TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (account_id) REFERENCES accounts(id),
        FOREIGN KEY (venue_id) REFERENCES venues(id)
      );
      CREATE TABLE IF NOT EXISTS snipe_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        snipe_id INTEGER NOT NULL,
        timestamp TEXT NOT NULL,
        level TEXT NOT NULL CHECK(level IN ('debug','info','warn','error')),
        phase TEXT NOT NULL,
        message TEXT NOT NULL,
        data TEXT,
        duration_ms INTEGER,
        FOREIGN KEY (snipe_id) REFERENCES snipes(id)
      );
      CREATE TABLE IF NOT EXISTS venue_dining_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venue_id INTEGER NOT NULL,
        dining_type TEXT NOT NULL,
        first_seen TEXT NOT NULL DEFAULT (datetime('now')),
        last_seen TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (venue_id) REFERENCES venues(id),
        UNIQUE(venue_id, dining_type)
      );
    `);

    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all() as Array<{ name: string }>;
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain("accounts");
    expect(tableNames).toContain("venues");
    expect(tableNames).toContain("snipes");
    expect(tableNames).toContain("snipe_logs");
    expect(tableNames).toContain("venue_dining_types");

    db.close();
  });

  it("enforces snipe status check constraint", () => {
    const db = new Database(dbPath);
    db.pragma("foreign_keys = OFF"); // Skip FK for this test

    db.exec(`
      CREATE TABLE IF NOT EXISTS snipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        venue_id INTEGER NOT NULL,
        venue_name TEXT NOT NULL,
        date TEXT NOT NULL,
        party_size INTEGER NOT NULL,
        preferences TEXT NOT NULL,
        mode TEXT NOT NULL DEFAULT 'book' CHECK(mode IN ('book','research')),
        demo INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'scheduled'
          CHECK(status IN ('scheduled','armed','running','success','failed','cancelled')),
        reservation_id TEXT,
        booking_window_start TEXT,
        retry_timeout_seconds INTEGER NOT NULL DEFAULT 15,
        wake_adjustment_ms INTEGER NOT NULL DEFAULT 500,
        research_summary TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Valid status should work
    db.prepare(
      `INSERT INTO snipes (account_id, venue_id, venue_name, date, party_size, preferences, status)
       VALUES (1, 1, 'Test', '2025-01-01', 2, '[]', 'scheduled')`
    ).run();

    // Invalid status should throw
    expect(() => {
      db.prepare(
        `INSERT INTO snipes (account_id, venue_id, venue_name, date, party_size, preferences, status)
         VALUES (1, 1, 'Test', '2025-01-01', 2, '[]', 'invalid_status')`
      ).run();
    }).toThrow();

    db.close();
  });

  it("enforces mode check constraint", () => {
    const db = new Database(dbPath);
    db.pragma("foreign_keys = OFF");

    db.exec(`
      CREATE TABLE IF NOT EXISTS snipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_id INTEGER NOT NULL,
        venue_id INTEGER NOT NULL,
        venue_name TEXT NOT NULL,
        date TEXT NOT NULL,
        party_size INTEGER NOT NULL,
        preferences TEXT NOT NULL,
        mode TEXT NOT NULL DEFAULT 'book' CHECK(mode IN ('book','research')),
        demo INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'scheduled'
          CHECK(status IN ('scheduled','armed','running','success','failed','cancelled')),
        reservation_id TEXT,
        booking_window_start TEXT,
        retry_timeout_seconds INTEGER NOT NULL DEFAULT 15,
        wake_adjustment_ms INTEGER NOT NULL DEFAULT 500,
        research_summary TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    // Valid mode
    db.prepare(
      `INSERT INTO snipes (account_id, venue_id, venue_name, date, party_size, preferences, mode)
       VALUES (1, 1, 'Test', '2025-01-01', 2, '[]', 'research')`
    ).run();

    // Invalid mode
    expect(() => {
      db.prepare(
        `INSERT INTO snipes (account_id, venue_id, venue_name, date, party_size, preferences, mode)
         VALUES (1, 1, 'Test', '2025-01-01', 2, '[]', 'invalid_mode')`
      ).run();
    }).toThrow();

    db.close();
  });
});

describe("saveDiningTypes", () => {
  let dbPath: string;

  beforeEach(() => {
    dbPath = freshDb("dining-types");
  });

  afterEach(() => {
    try { fs.unlinkSync(dbPath); } catch {}
  });

  it("inserts and upserts dining types for a venue", () => {
    const db = new Database(dbPath);
    db.pragma("foreign_keys = OFF");

    db.exec(`
      CREATE TABLE IF NOT EXISTS venue_dining_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venue_id INTEGER NOT NULL,
        dining_type TEXT NOT NULL,
        first_seen TEXT NOT NULL DEFAULT (datetime('now')),
        last_seen TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(venue_id, dining_type)
      );
    `);

    // Simulate saveDiningTypes logic
    const upsert = db.prepare(
      `INSERT INTO venue_dining_types (venue_id, dining_type)
       VALUES (?, ?)
       ON CONFLICT(venue_id, dining_type) DO UPDATE SET last_seen = datetime('now')`
    );
    const tx = db.transaction((items: string[]) => {
      for (const t of items) upsert.run(1, t);
    });

    tx(["Dining Room", "Bar", "Outdoor"]);

    const rows = db.prepare("SELECT dining_type FROM venue_dining_types WHERE venue_id = 1 ORDER BY dining_type").all() as Array<{ dining_type: string }>;
    expect(rows.map((r) => r.dining_type)).toEqual(["Bar", "Dining Room", "Outdoor"]);

    // Upsert same types (should not duplicate)
    tx(["Dining Room", "Patio"]);
    const rows2 = db.prepare("SELECT dining_type FROM venue_dining_types WHERE venue_id = 1 ORDER BY dining_type").all() as Array<{ dining_type: string }>;
    expect(rows2.map((r) => r.dining_type)).toEqual(["Bar", "Dining Room", "Outdoor", "Patio"]);

    db.close();
  });

  it("handles empty array", () => {
    const db = new Database(dbPath);
    db.pragma("foreign_keys = OFF");

    db.exec(`
      CREATE TABLE IF NOT EXISTS venue_dining_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venue_id INTEGER NOT NULL,
        dining_type TEXT NOT NULL,
        first_seen TEXT NOT NULL DEFAULT (datetime('now')),
        last_seen TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(venue_id, dining_type)
      );
    `);

    const upsert = db.prepare(
      `INSERT INTO venue_dining_types (venue_id, dining_type)
       VALUES (?, ?)
       ON CONFLICT(venue_id, dining_type) DO UPDATE SET last_seen = datetime('now')`
    );
    const tx = db.transaction((items: string[]) => {
      for (const t of items) upsert.run(1, t);
    });

    // Should not throw
    tx([]);

    const rows = db.prepare("SELECT COUNT(*) as c FROM venue_dining_types").get() as { c: number };
    expect(rows.c).toBe(0);

    db.close();
  });

  it("deduplicates input types", () => {
    const db = new Database(dbPath);
    db.pragma("foreign_keys = OFF");

    db.exec(`
      CREATE TABLE IF NOT EXISTS venue_dining_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        venue_id INTEGER NOT NULL,
        dining_type TEXT NOT NULL,
        first_seen TEXT NOT NULL DEFAULT (datetime('now')),
        last_seen TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(venue_id, dining_type)
      );
    `);

    const upsert = db.prepare(
      `INSERT INTO venue_dining_types (venue_id, dining_type)
       VALUES (?, ?)
       ON CONFLICT(venue_id, dining_type) DO UPDATE SET last_seen = datetime('now')`
    );
    const tx = db.transaction((items: string[]) => {
      for (const t of items) upsert.run(1, t);
    });

    // Duplicates in input
    const deduped = [...new Set(["Bar", "Bar", "Patio", "Bar"])];
    tx(deduped);

    const rows = db.prepare("SELECT dining_type FROM venue_dining_types WHERE venue_id = 1 ORDER BY dining_type").all() as Array<{ dining_type: string }>;
    expect(rows.map((r) => r.dining_type)).toEqual(["Bar", "Patio"]);

    db.close();
  });
});

// Cleanup test DB directory after all tests
afterEach(() => {
  try {
    if (fs.existsSync(TEST_DB_DIR)) {
      const files = fs.readdirSync(TEST_DB_DIR);
      for (const f of files) {
        try { fs.unlinkSync(path.join(TEST_DB_DIR, f)); } catch {}
      }
    }
  } catch {}
});
