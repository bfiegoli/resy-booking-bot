import Database from "better-sqlite3";
import path from "path";

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), "resy-sniper.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    migrate(_db);
  }
  return _db;
}

function migrate(db: Database.Database) {
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

    CREATE INDEX IF NOT EXISTS idx_snipe_logs_snipe_id ON snipe_logs(snipe_id);
    CREATE INDEX IF NOT EXISTS idx_snipes_status ON snipes(status);
  `);

  // Migrations for existing DBs
  const cols = db.prepare("PRAGMA table_info(snipes)").all() as Array<{ name: string }>;
  const colNames = new Set(cols.map((c) => c.name));
  if (!colNames.has("mode")) {
    db.exec(`ALTER TABLE snipes ADD COLUMN mode TEXT NOT NULL DEFAULT 'book'`);
  }
  if (!colNames.has("demo")) {
    db.exec(`ALTER TABLE snipes ADD COLUMN demo INTEGER NOT NULL DEFAULT 0`);
  }
  if (!colNames.has("research_summary")) {
    db.exec(`ALTER TABLE snipes ADD COLUMN research_summary TEXT`);
  }

  const venueCols = db.prepare("PRAGMA table_info(venues)").all() as Array<{ name: string }>;
  const venueColNames = new Set(venueCols.map((c) => c.name));
  if (!venueColNames.has("cache_updated_at")) {
    db.exec(`ALTER TABLE venues ADD COLUMN cache_updated_at TEXT`);
  }
}

export type Account = {
  id: number;
  email: string;
  auth_token: string;
  first_name: string | null;
  last_name: string | null;
  is_default: number;
  created_at: string;
  updated_at: string;
};

export type Venue = {
  id: number;
  resy_id: number;
  name: string;
  neighborhood: string | null;
  cuisine: string | null;
  image_url: string | null;
  location_name: string | null;
  url_slug: string | null;
  max_party_size: number | null;
  rating_average: number | null;
  rating_count: number | null;
  price_range_id: number | null;
  lead_time_days: number | null;
  booking_hour: number;
  time_zone: string;
  cache_updated_at: string | null;
  created_at: string;
};

export type Snipe = {
  id: number;
  account_id: number;
  venue_id: number;
  venue_name: string;
  date: string;
  party_size: number;
  preferences: string;
  mode: "book" | "research";
  demo: number;
  status: string;
  reservation_id: string | null;
  booking_window_start: string | null;
  retry_timeout_seconds: number;
  wake_adjustment_ms: number;
  research_summary: string | null;
  created_at: string;
  updated_at: string;
};

export function saveDiningTypes(venueId: number, types: string[]) {
  const db = getDb();
  const upsert = db.prepare(
    `INSERT INTO venue_dining_types (venue_id, dining_type)
     VALUES (?, ?)
     ON CONFLICT(venue_id, dining_type) DO UPDATE SET last_seen = datetime('now')`
  );
  const tx = db.transaction((items: string[]) => {
    for (const t of items) upsert.run(venueId, t);
  });
  tx([...new Set(types)]);
}

export type SnipeLog = {
  id: number;
  snipe_id: number;
  timestamp: string;
  level: string;
  phase: string;
  message: string;
  data: string | null;
  duration_ms: number | null;
};

export type Preference = {
  time: string;
  dining_type?: string;
};
