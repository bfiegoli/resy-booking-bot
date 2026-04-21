import { NextRequest, NextResponse } from "next/server";
import { searchVenues, getVenueConfig, getVenueDetails } from "@/lib/resy-api";
import { getDb, type Account } from "@/lib/db";
import { decrypt } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json({ error: "Query parameter 'q' required" }, { status: 400 });
  }

  const apiKey = process.env.RESY_API_KEY!;
  const result = await searchVenues(apiKey, query, 15);

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  const hits = result.data?.search?.hits ?? [];
  const venues = hits.map((h) => ({
    resy_id: h.id.resy,
    name: h.name,
    neighborhood: h.neighborhood,
    locality: h.locality,
    cuisine: h.cuisine,
    image_url: h.images?.[0] ?? null,
    url_slug: h.url_slug,
    max_party_size: h.max_party_size,
    rating_average: h.rating?.average,
    rating_count: h.rating?.count,
    price_range_id: h.price_range_id,
    why_we_like_it: h.content?.find((c) => c.name === "why_we_like_it")?.body ?? null,
    lead_time_days: null as number | null,
    booking_hour: null as number | null,
    time_zone: null as string | null,
  }));

  const db = getDb();
  const account = db.prepare(
    "SELECT * FROM accounts ORDER BY is_default DESC LIMIT 1"
  ).get() as Account | undefined;

  if (account && venues.length > 0) {
    try {
      const token = decrypt(account.auth_token);
      const [configs, details] = await Promise.all([
        Promise.allSettled(venues.map((v) => getVenueConfig(apiKey, token, v.resy_id))),
        Promise.allSettled(venues.map((v) => getVenueDetails(apiKey, token, v.resy_id))),
      ]);
      configs.forEach((c, i) => {
        if (c.status === "fulfilled" && c.value.ok && c.value.data) {
          venues[i].lead_time_days = c.value.data.lead_time_in_days ?? null;
        }
      });
      details.forEach((d, i) => {
        if (d.status === "fulfilled" && d.value.ok && d.value.data?.locale?.time_zone) {
          venues[i].time_zone = d.value.data.locale.time_zone;
        }
      });
    } catch {}
  }

  return NextResponse.json({ venues, total: result.data?.search?.nbHits ?? 0 });
}

export async function POST(req: NextRequest) {
  const venue = await req.json();
  const db = getDb();

  db.prepare(
    `INSERT INTO venues (resy_id, name, neighborhood, cuisine, image_url, location_name, url_slug, max_party_size, rating_average, rating_count, price_range_id, time_zone)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(resy_id) DO UPDATE SET
       name = excluded.name,
       neighborhood = excluded.neighborhood,
       cuisine = excluded.cuisine,
       image_url = excluded.image_url,
       location_name = excluded.location_name,
       url_slug = excluded.url_slug,
       max_party_size = excluded.max_party_size,
       rating_average = excluded.rating_average,
       rating_count = excluded.rating_count,
       price_range_id = excluded.price_range_id,
       time_zone = COALESCE(excluded.time_zone, time_zone)`
  ).run(
    venue.resy_id,
    venue.name,
    venue.neighborhood,
    venue.cuisine?.join(", ") ?? null,
    venue.image_url,
    venue.locality,
    venue.url_slug,
    venue.max_party_size,
    venue.rating_average,
    venue.rating_count,
    venue.price_range_id,
    venue.time_zone ?? null
  );

  const saved = db.prepare("SELECT * FROM venues WHERE resy_id = ?").get(venue.resy_id);
  return NextResponse.json({ venue: saved });
}
