import { NextRequest, NextResponse } from "next/server";
import { searchVenues, getVenueConfig, getVenueDetails } from "@/lib/resy-api";
import { getDb, type Account, type Venue } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { computeBookingWindowStart } from "@/lib/scheduler";

type Urgency = "open" | "today" | "soon" | "upcoming" | "unknown";

function getUrgency(opensAt: Date | null): Urgency {
  if (!opensAt) return "unknown";
  const now = new Date();
  if (opensAt.getTime() <= now.getTime()) return "open";

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 86400_000);
  const dayAfterStart = new Date(todayStart.getTime() + 2 * 86400_000);

  if (opensAt < tomorrowStart) return "today";
  if (opensAt < dayAfterStart) return "soon";
  return "upcoming";
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  const date = req.nextUrl.searchParams.get("date");
  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");

  if (!query) return NextResponse.json({ error: "Query parameter 'q' required" }, { status: 400 });
  if (!date) return NextResponse.json({ error: "Query parameter 'date' required" }, { status: 400 });

  const apiKey = process.env.RESY_API_KEY!;
  const geo = lat && lng ? { latitude: parseFloat(lat), longitude: parseFloat(lng) } : undefined;
  const result = await searchVenues(apiKey, query, 15, geo);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  const hits = result.data?.search?.hits ?? [];
  const db = getDb();
  const account = db.prepare("SELECT * FROM accounts ORDER BY is_default DESC LIMIT 1").get() as Account | undefined;

  const staleThreshold = new Date(Date.now() - 24 * 3600_000).toISOString();

  const venues = await Promise.all(
    hits.map(async (h) => {
      const base = {
        resy_id: h.id.resy,
        name: h.name,
        neighborhood: h.neighborhood,
        locality: h.locality,
        cuisine: h.cuisine,
        image_url: h.images?.[0] ?? null,
        rating_average: h.rating?.average ?? null,
        rating_count: h.rating?.count ?? null,
        price_range_id: h.price_range_id,
        why_we_like_it: h.content?.find((c) => c.name === "why_we_like_it")?.body ?? null,
      };

      const cached = db.prepare("SELECT * FROM venues WHERE resy_id = ?").get(h.id.resy) as Venue | undefined;

      let leadTimeDays = cached?.lead_time_days ?? null;
      let bookingHour = cached?.booking_hour ?? 9;
      let timeZone = cached?.time_zone ?? "America/New_York";
      let isCached = true;
      let dbVenueId = cached?.id ?? null;

      const cacheIsFresh = cached?.cache_updated_at && cached.cache_updated_at > staleThreshold;

      if (!cacheIsFresh && account) {
        try {
          const token = decrypt(account.auth_token);
          const [configRes, detailsRes] = await Promise.allSettled([
            getVenueConfig(apiKey, token, h.id.resy),
            getVenueDetails(apiKey, token, h.id.resy),
          ]);

          if (configRes.status === "fulfilled" && configRes.value.ok && configRes.value.data) {
            leadTimeDays = configRes.value.data.lead_time_in_days ?? null;
            isCached = false;
          }
          if (detailsRes.status === "fulfilled" && detailsRes.value.ok && detailsRes.value.data?.locale?.time_zone) {
            timeZone = detailsRes.value.data.locale.time_zone;
          }

          if (leadTimeDays !== null) {
            db.prepare(
              `INSERT INTO venues (resy_id, name, neighborhood, cuisine, image_url, location_name, lead_time_days, time_zone, cache_updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
               ON CONFLICT(resy_id) DO UPDATE SET
                 name = excluded.name,
                 neighborhood = excluded.neighborhood,
                 cuisine = excluded.cuisine,
                 image_url = excluded.image_url,
                 location_name = excluded.location_name,
                 lead_time_days = excluded.lead_time_days,
                 time_zone = COALESCE(excluded.time_zone, time_zone),
                 cache_updated_at = datetime('now')`
            ).run(h.id.resy, h.name, h.neighborhood, h.cuisine?.join(", ") ?? null, base.image_url, h.locality, leadTimeDays, timeZone);

            const saved = db.prepare("SELECT id FROM venues WHERE resy_id = ?").get(h.id.resy) as { id: number } | undefined;
            if (saved) dbVenueId = saved.id;
          }
        } catch {}
      }

      let opensAt: string | null = null;
      let daysUntilOpen: number | null = null;
      let urgency: Urgency = "unknown";

      if (leadTimeDays !== null) {
        const opensDate = computeBookingWindowStart(date, leadTimeDays, bookingHour, timeZone);
        opensAt = opensDate.toISOString();
        daysUntilOpen = Math.max(0, Math.ceil((opensDate.getTime() - Date.now()) / 86400_000));
        if (opensDate.getTime() <= Date.now()) daysUntilOpen = null;
        urgency = getUrgency(opensDate);
      }

      return {
        ...base,
        lead_time_days: leadTimeDays,
        booking_hour: bookingHour,
        time_zone: timeZone,
        opens_at: opensAt,
        days_until_open: daysUntilOpen,
        urgency,
        is_cached: isCached,
        db_venue_id: dbVenueId,
      };
    })
  );

  venues.sort((a, b) => {
    const order: Record<Urgency, number> = { today: 0, soon: 1, upcoming: 2, open: 3, unknown: 4 };
    return (order[a.urgency] ?? 5) - (order[b.urgency] ?? 5);
  });

  return NextResponse.json({ venues, target_date: date, total: result.data?.search?.nbHits ?? 0 });
}
