# Resy Bot 2.0

Automated restaurant reservation sniper for [Resy](https://resy.com). Calculates exactly when booking windows open, wakes up at the right moment, and books your preferred table before anyone else can.

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)
![SQLite](https://img.shields.io/badge/SQLite-WAL-green?logo=sqlite)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)

---

## How It Works

```
You pick a restaurant + date
  → Bot calculates when the booking window opens (lead time + timezone-aware)
  → Bot sleeps until that exact moment
  → Wakes up, queries Resy API in a tight retry loop
  → Matches your time/table preferences in priority order
  → Books the first match
  → Logs every step with millisecond precision
```

Most restaurants release reservations on a rolling window (e.g., 30 days out at 9:00 AM ET). The bot handles all of this automatically — lead time detection, timezone math, DST transitions, and sub-second wake timing.

---

## Features

### Booking Engine
- **Priority-based preferences** — ranked list of time + dining type combos, matched in order
- **Sub-second precision** — wakes up early (configurable ms adjustment) and retries in a tight loop
- **Multi-date support** — queue the same restaurant for multiple dates in one shot
- **Automatic lead time detection** — fetches from Resy's `/config` endpoint per venue

### Discovery Mode
- Pick a target date, search restaurants by name/cuisine/neighborhood
- See which booking windows are opening soon with urgency badges:
  - **Green** — reservations available now
  - **Red** — opens today
  - **Amber** — opens within 48 hours
  - **Blue** — upcoming (3+ days)
- One-click "Queue Booking" pre-fills the booking form

### Research Mode
- Observe slot releases without booking anything
- Tracks every slot: time, dining type, party size range
- Monitors how quickly slots disappear
- Generates a summary: total unique slots, peak availability, timeline

### Multi-Account
- Add multiple Resy accounts with encrypted token storage (AES-256-GCM)
- Select which account books each reservation
- Default account auto-selected

### Demo Mode
- Fires in 2 seconds with realistic mock data
- Tests the full flow (scheduling, wake, find, match, book) without hitting Resy
- Useful for verifying setup before going live

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, Turbopack) |
| Language | TypeScript 5.8 |
| Database | SQLite via better-sqlite3 (WAL mode) |
| Styling | Tailwind CSS 4 |
| Testing | Vitest |
| Deployment | Docker / Railway / Vercel |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                    # Dashboard — splash, stats, active bookings
│   ├── discover/page.tsx           # Restaurant discovery with urgency badges
│   ├── login/page.tsx              # Password gate (optional)
│   ├── settings/page.tsx           # Multi-account management
│   ├── snipes/
│   │   ├── new/page.tsx            # Create booking or research run
│   │   └── [id]/page.tsx           # Snipe detail view + execution logs
│   └── api/
│       ├── auth/route.ts           # Account CRUD (login, list, delete)
│       ├── login/route.ts          # Site password authentication
│       ├── discover/route.ts       # Search + booking window enrichment
│       ├── snipes/route.ts         # List + create snipes
│       ├── snipes/[id]/route.ts    # Get + cancel individual snipe
│       ├── snipes/[id]/logs/       # Execution log retrieval
│       ├── snipes/[id]/run/        # Manual trigger
│       ├── cron/snipe/route.ts     # Vercel cron — checks for due snipes
│       └── venues/                 # Search, save, config, dining types
├── components/
│   ├── nav.tsx                     # Top navigation
│   └── emoji.tsx                   # Cross-platform emoji wrapper
├── lib/
│   ├── resy-api.ts                 # Resy HTTP client (search, find, book)
│   ├── sniper.ts                   # Core booking logic + retry loop
│   ├── scheduler.ts                # Timer management + window calculation
│   ├── db.ts                       # SQLite schema, migrations, types
│   ├── crypto.ts                   # AES-256-GCM encrypt/decrypt
│   └── demo-data.ts               # Mock slot generation for demo mode
├── middleware.ts                   # Password gate + auth cookie
└── instrumentation.ts             # Loads pending snipes on server start
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### 1. Clone and install

```bash
git clone https://github.com/bfiegoli/resy-booking-bot.git
cd resy-booking-bot
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# Required
RESY_API_KEY=VbWk7s3L4KiK5fzlO7JD3Q5EYolJI7n5
ENCRYPTION_KEY=<64-char hex string>

# Optional
SITE_PASSWORD=<password to gate the UI>
CRON_SECRET=<bearer token for cron endpoint>
DB_PATH=./resy-sniper.db
```

Generate an encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 4. First-time setup

1. Go to **Settings** and add your Resy account (email + password)
2. Go to **New Booking** or **Discover** to find a restaurant
3. Pick your date(s) and time preferences
4. The bot handles the rest

---

## Database

SQLite with WAL mode and foreign key constraints. Auto-migrates on first run.

### Tables

| Table | Purpose |
|-------|---------|
| `accounts` | Resy login credentials (tokens encrypted at rest) |
| `venues` | Restaurant metadata + cached lead times (24h TTL) |
| `snipes` | Booking jobs with status, preferences, and timing |
| `snipe_logs` | Phase-by-phase execution logs with timestamps |
| `venue_dining_types` | Known table types per restaurant |

### Snipe Lifecycle

```
scheduled → armed → running → success / failed
                            → cancelled (manual)
```

---

## Deployment

### Docker

```bash
docker build -t resy-bot .
docker run -p 3000:3000 \
  -e RESY_API_KEY=... \
  -e ENCRYPTION_KEY=... \
  -v $(pwd)/data:/data \
  resy-bot
```

The database persists to `/data/resy-sniper.db`.

### Railway

Push to GitHub and connect the repo in Railway. Add environment variables in the Railway dashboard. Use a persistent volume mounted at `/data` for the SQLite database.

### Vercel

Works with Vercel's serverless functions. The cron job (`vercel.json`) fires every minute to check for due snipes:

```json
{
  "crons": [
    {
      "path": "/api/cron/snipe",
      "schedule": "* * * * *"
    }
  ]
}
```

> **Note:** SQLite on Vercel uses ephemeral `/tmp` storage. For production persistence, swap to Turso or Vercel Postgres.

---

## API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth` | GET | List all accounts |
| `/api/auth` | POST | Login to Resy + save account |
| `/api/auth` | DELETE | Remove account |
| `/api/login` | POST | Site password auth |
| `/api/snipes` | GET | List snipes (filter by `?status=`) |
| `/api/snipes` | POST | Create + arm a new snipe |
| `/api/snipes/[id]` | GET | Snipe details |
| `/api/snipes/[id]` | DELETE | Cancel snipe |
| `/api/snipes/[id]/run` | POST | Manually trigger execution |
| `/api/snipes/[id]/logs` | GET | Execution logs |
| `/api/cron/snipe` | GET | Cron trigger for serverless scheduling |
| `/api/discover` | GET | Search venues + compute booking windows |
| `/api/venues/search` | GET | Search Resy by name |
| `/api/venues/search` | POST | Save venue to local DB |
| `/api/venues/[id]/config` | GET | Fetch lead time from Resy |
| `/api/venues/[id]/dining-types` | GET | Known dining types |

---

## How Booking Windows Work

Resy restaurants have a **lead time** (e.g., 14 days) and a **booking hour** (e.g., 9:00 AM). If you want to dine on May 15 and the restaurant has a 14-day lead time opening at 9 AM ET:

```
Target date:     May 15
Lead time:       14 days
Booking opens:   May 1 at 9:00:00 AM ET
Bot wakes:       May 1 at 8:59:59.500 AM ET (500ms early)
Bot starts loop: Queries /find every ~200ms
First match:     Books immediately
```

The `computeBookingWindowStart()` function uses binary search with `Intl.DateTimeFormat` to correctly resolve the UTC timestamp for any timezone, including across DST boundaries.

---

## Preferences

Time preferences are matched in priority order against available slots:

```json
[
  { "time": "19:00", "dining_type": "Dining Room" },
  { "time": "19:00" },
  { "time": "20:00", "dining_type": "Patio" }
]
```

This means: first try 7 PM Dining Room, then any 7 PM table, then 8 PM Patio. The bot picks the first match from whatever Resy returns.

---

## Security

- **Token encryption** — Resy auth tokens stored with AES-256-GCM (IV + auth tag + ciphertext)
- **Site password** — Optional middleware gate (set `SITE_PASSWORD` env var)
- **Cron auth** — Optional `CRON_SECRET` bearer token for the scheduling endpoint
- **No tokens in logs** — Execution logs capture timing and results, never credentials

---

## Scripts

```bash
npm run dev          # Start dev server (Turbopack)
npm run build        # Production build
npm start            # Start production server
npm test             # Run tests
npm run test:watch   # Watch mode
npm run lint         # Lint
```

---

## License

MIT
