"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { E } from "@/components/emoji";

type DiscoverVenue = {
  resy_id: number;
  name: string;
  neighborhood: string;
  locality: string;
  cuisine: string[];
  image_url: string | null;
  rating_average: number | null;
  rating_count: number | null;
  price_range_id: number;
  why_we_like_it: string | null;
  lead_time_days: number | null;
  booking_hour: number;
  time_zone: string;
  opens_at: string | null;
  days_until_open: number | null;
  urgency: "open" | "today" | "soon" | "upcoming" | "unknown";
  is_cached: boolean;
  db_venue_id: number | null;
};

const priceRange = ["", "$", "$$", "$$$", "$$$$"];

const urgencyConfig = {
  open: { color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", label: "Available Now", icon: "✅" },
  today: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", label: "Opens Today", icon: "🔥" },
  soon: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", label: "Opens Tomorrow", icon: "⏳" },
  upcoming: { color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", label: "Upcoming", icon: "📅" },
  unknown: { color: "text-zinc-400", bg: "bg-zinc-500/10 border-zinc-500/20", label: "Unknown", icon: "❓" },
};

function getNextWeekend(weeksAhead: number): [string, string] {
  const now = new Date();
  const day = now.getDay();
  const daysToSat = ((6 - day + 7) % 7) || 7;
  const sat = new Date(now);
  sat.setDate(now.getDate() + daysToSat + weeksAhead * 7);
  const sun = new Date(sat);
  sun.setDate(sat.getDate() + 1);
  const fmt = (d: Date) => d.toISOString().split("T")[0];
  return [fmt(sat), fmt(sun)];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatOpensAt(opensAt: string, timeZone: string): string {
  const d = new Date(opensAt);
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  });
}

const ZIP_LOOKUP: Record<string, { lat: number; lng: number; city: string }> = {
  "10001": { lat: 40.7484, lng: -73.9967, city: "New York" },
  "10002": { lat: 40.7157, lng: -73.9863, city: "New York" },
  "10003": { lat: 40.7317, lng: -73.9893, city: "New York" },
  "10011": { lat: 40.7418, lng: -74.0002, city: "New York" },
  "10012": { lat: 40.7258, lng: -73.9981, city: "New York" },
  "10013": { lat: 40.7209, lng: -74.0048, city: "New York" },
  "10014": { lat: 40.7340, lng: -74.0054, city: "New York" },
  "10016": { lat: 40.7459, lng: -73.9781, city: "New York" },
  "10019": { lat: 40.7654, lng: -73.9858, city: "New York" },
  "10021": { lat: 40.7693, lng: -73.9588, city: "New York" },
  "10028": { lat: 40.7766, lng: -73.9538, city: "New York" },
  "10036": { lat: 40.7590, lng: -73.9895, city: "New York" },
  "10065": { lat: 40.7644, lng: -73.9632, city: "New York" },
  "10075": { lat: 40.7707, lng: -73.9555, city: "New York" },
  "11201": { lat: 40.6935, lng: -73.9897, city: "Brooklyn" },
  "11211": { lat: 40.7128, lng: -73.9535, city: "Brooklyn" },
  "11215": { lat: 40.6711, lng: -73.9866, city: "Brooklyn" },
  "11249": { lat: 40.7142, lng: -73.9654, city: "Brooklyn" },
  "90001": { lat: 33.9425, lng: -118.2551, city: "Los Angeles" },
  "90012": { lat: 34.0671, lng: -118.2404, city: "Los Angeles" },
  "90028": { lat: 34.0990, lng: -118.3268, city: "Hollywood" },
  "90210": { lat: 34.0901, lng: -118.4065, city: "Beverly Hills" },
  "90291": { lat: 33.9925, lng: -118.4615, city: "Venice" },
  "90401": { lat: 34.0195, lng: -118.4912, city: "Santa Monica" },
  "60601": { lat: 41.8862, lng: -87.6186, city: "Chicago" },
  "60614": { lat: 41.9215, lng: -87.6513, city: "Chicago" },
  "60657": { lat: 41.9400, lng: -87.6530, city: "Chicago" },
  "94102": { lat: 37.7813, lng: -122.4167, city: "San Francisco" },
  "94103": { lat: 37.7726, lng: -122.4110, city: "San Francisco" },
  "94110": { lat: 37.7484, lng: -122.4156, city: "San Francisco" },
  "33101": { lat: 25.7751, lng: -80.1948, city: "Miami" },
  "33109": { lat: 25.7617, lng: -80.1300, city: "Miami Beach" },
  "33139": { lat: 25.7862, lng: -80.1340, city: "Miami Beach" },
};

const CITY_DEFAULTS: Record<string, { lat: number; lng: number; zip: string }> = {
  "NYC": { lat: 40.7128, lng: -73.9997, zip: "10012" },
  "LA": { lat: 34.0522, lng: -118.2437, zip: "90012" },
  "Chicago": { lat: 41.8781, lng: -87.6298, zip: "60601" },
  "SF": { lat: 37.7749, lng: -122.4194, zip: "94102" },
  "Miami": { lat: 25.7617, lng: -80.1918, zip: "33139" },
};

const cuisineChips = ["Italian", "Sushi", "French", "Mexican", "Steakhouse", "Thai", "Korean", "Seafood"];

export default function DiscoverPage() {
  const [targetDate, setTargetDate] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [query, setQuery] = useState("");
  const [zipCode, setZipCode] = useState("10012");
  const [geo, setGeo] = useState<{ lat: number; lng: number }>(CITY_DEFAULTS["NYC"]);
  const [geoLabel, setGeoLabel] = useState("NYC");
  const [venues, setVenues] = useState<DiscoverVenue[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [availFilter, setAvailFilter] = useState<"all" | "available" | "upcoming">("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [thisWeekend] = useState(() => getNextWeekend(0));
  const [nextWeekend] = useState(() => getNextWeekend(1));

  const applyZip = (zip: string) => {
    const lookup = ZIP_LOOKUP[zip];
    if (lookup) {
      setGeo({ lat: lookup.lat, lng: lookup.lng });
      setGeoLabel(lookup.city);
      setVenues([]);
      setSearched(false);
    }
  };

  const applyCity = (city: string) => {
    const def = CITY_DEFAULTS[city];
    if (def) {
      setZipCode(def.zip);
      setGeo({ lat: def.lat, lng: def.lng });
      setGeoLabel(city);
      setVenues([]);
      setSearched(false);
    }
  };

  const pickDate = (date: string, label: string) => {
    setTargetDate(date);
    setDateLabel(label);
    setVenues([]);
    setSearched(false);
    setAvailFilter("all");
  };

  useEffect(() => {
    if (!query.trim() || !targetDate) {
      setVenues([]);
      setSearched(false);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearching(true);
      const params = new URLSearchParams({ q: query, date: targetDate, lat: String(geo.lat), lng: String(geo.lng) });
      fetch(`/api/discover?${params}`)
        .then((r) => r.json())
        .then((d) => {
          setVenues(d.venues ?? []);
          setSearched(true);
        })
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, targetDate, geo]);

  return (
    <div className="space-y-6 sm:space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="anim-in">
        <h1 className="text-xl sm:text-3xl font-bold tracking-tight">
          <E>🔍</E> Discover
        </h1>
        <p className="text-zinc-500 text-xs sm:text-sm mt-1">
          Find restaurants with upcoming booking windows
        </p>
      </div>

      {/* Location */}
      <div className="space-y-2 anim-in" style={{ animationDelay: "50ms" }}>
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Where?</label>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={5}
              value={zipCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 5);
                setZipCode(val);
                if (val.length === 5) applyZip(val);
              }}
              placeholder="Zip code"
              className="input !w-24 sm:!w-28 text-center text-sm tabular-nums"
            />
          </div>
          {geoLabel && (
            <span className="text-xs text-zinc-500">{geoLabel}</span>
          )}
          <div className="flex gap-1 sm:gap-1.5 ml-auto">
            {Object.keys(CITY_DEFAULTS).map((city) => (
              <button
                key={city}
                onClick={() => applyCity(city)}
                className={`px-2 sm:px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-medium transition-all ${
                  geoLabel === city
                    ? "bg-white/10 text-white"
                    : "text-zinc-600 hover:text-zinc-300"
                }`}
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Date Picker */}
      <div className="space-y-3 anim-in" style={{ animationDelay: "100ms" }}>
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">When do you want to go?</label>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
          {[
            { date: thisWeekend[0], label: "This Sat" },
            { date: thisWeekend[1], label: "This Sun" },
            { date: nextWeekend[0], label: "Next Sat" },
            { date: nextWeekend[1], label: "Next Sun" },
          ].map(({ date, label }) => (
            <button
              key={date}
              onClick={() => pickDate(date, `${label} (${formatDate(date)})`)}
              className={`px-3 py-2.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium transition-all text-center ${
                targetDate === date
                  ? "bg-resy-red/20 text-resy-red-light border border-resy-red/30"
                  : "glass hover:border-zinc-500/50"
              }`}
            >
              {label}
            </button>
          ))}
          <div className="col-span-2 sm:col-span-1">
            <input
              type="date"
              value={targetDate && ![thisWeekend[0], thisWeekend[1], nextWeekend[0], nextWeekend[1]].includes(targetDate) ? targetDate : ""}
              onChange={(e) => {
                if (e.target.value) pickDate(e.target.value, formatDate(e.target.value));
              }}
              className="input !w-full sm:!w-auto text-xs sm:text-sm px-3 py-2.5 sm:py-2"
              min={new Date().toISOString().split("T")[0]}
            />
          </div>
        </div>
        {dateLabel && (
          <p className="text-xs text-zinc-500">
            Showing reservation windows for <span className="text-zinc-300 font-medium">{dateLabel}</span>
          </p>
        )}
      </div>

      {/* Search + Cuisine Chips */}
      {targetDate && (
        <div className="space-y-3 anim-in" style={{ animationDelay: "200ms" }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, cuisine, or neighborhood..."
            autoFocus
            className="input text-sm sm:text-base"
          />
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {cuisineChips.map((s) => (
              <button
                key={s}
                onClick={() => setQuery(s)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs rounded-lg font-medium transition-all ${
                  query === s
                    ? "bg-white/10 text-white border border-zinc-600/50"
                    : "glass text-zinc-500 hover:text-zinc-200 hover:border-zinc-500/50"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Availability Filter */}
      {venues.length > 0 && !searching && (
        <div className="flex items-center gap-1.5 sm:gap-2 p-1 bg-zinc-900/50 rounded-xl w-fit anim-in">
          {([
            { key: "all", label: "All", count: venues.length },
            { key: "available", label: "Available Now", count: venues.filter((v) => v.urgency === "open").length },
            { key: "upcoming", label: "Not Yet Open", count: venues.filter((v) => v.urgency !== "open" && v.urgency !== "unknown").length },
          ] as const).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setAvailFilter(key)}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${
                availFilter === key
                  ? "bg-white/10 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {label}{count > 0 ? ` (${count})` : ""}
            </button>
          ))}
        </div>
      )}

      {/* Loading */}
      {searching && (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 border-2 border-resy-red/30 border-t-resy-red rounded-full animate-spin" />
        </div>
      )}

      {/* Results */}
      {!searching && searched && venues.length === 0 && (
        <div className="glass rounded-xl p-8 text-center">
          <div className="text-2xl mb-2"><E>🍽️</E></div>
          <div className="text-zinc-400 text-sm">No restaurants found. Try a different search.</div>
        </div>
      )}

      {!searching && venues.length > 0 && (() => {
        const filtered = availFilter === "all"
          ? venues
          : availFilter === "available"
            ? venues.filter((v) => v.urgency === "open")
            : venues.filter((v) => v.urgency !== "open" && v.urgency !== "unknown");
        return filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((venue, i) => (
              <VenueCard key={venue.resy_id} venue={venue} targetDate={targetDate} delay={i * 60} />
            ))}
          </div>
        ) : (
          <div className="glass rounded-xl p-6 text-center">
            <div className="text-zinc-400 text-sm">
              No {availFilter === "available" ? "available" : "upcoming"} restaurants in these results.
            </div>
          </div>
        );
      })()}

      {/* Prompt */}
      {!targetDate && (
        <div className="glass rounded-2xl p-8 sm:p-12 text-center anim-in" style={{ animationDelay: "200ms" }}>
          <div className="text-3xl sm:text-4xl mb-3 animate-float"><E>📅</E></div>
          <div className="text-zinc-300 text-sm font-medium">Pick a date to get started</div>
          <div className="text-zinc-500 text-xs mt-1">
            We'll show you which restaurants have booking windows opening soon
          </div>
        </div>
      )}

    </div>
  );
}

function VenueCard({ venue, targetDate, delay }: { venue: DiscoverVenue; targetDate: string; delay: number }) {
  const cfg = urgencyConfig[venue.urgency];

  return (
    <div className="glass rounded-xl p-3 sm:p-4 anim-in hover:border-zinc-600/50 transition-all" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex gap-3 sm:gap-4">
        {/* Image */}
        {venue.image_url && (
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden shrink-0 bg-zinc-800">
            <img src={venue.image_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Name + rating */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-semibold text-white truncate">{venue.name}</h3>
              <p className="text-[10px] sm:text-xs text-zinc-500 truncate">
                {venue.neighborhood}{venue.locality ? `, ${venue.locality}` : ""}
                {venue.cuisine?.length > 0 && ` · ${venue.cuisine.slice(0, 2).join(", ")}`}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {venue.rating_average && (
                <span className="text-[10px] sm:text-xs text-zinc-400">
                  <E>⭐</E> {venue.rating_average.toFixed(1)}
                </span>
              )}
              {venue.price_range_id > 0 && (
                <span className="text-[10px] sm:text-xs text-zinc-600 ml-1">{priceRange[venue.price_range_id]}</span>
              )}
            </div>
          </div>

          {/* Urgency */}
          <div className="mt-1.5 sm:mt-2 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1 sm:gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-semibold border w-fit ${cfg.bg} ${cfg.color}`}>
              <E>{cfg.icon}</E> {cfg.label}
            </span>
            {venue.opens_at && venue.urgency !== "open" && (
              <span className="text-[10px] sm:text-xs text-zinc-500">
                {formatOpensAt(venue.opens_at, venue.time_zone)}
              </span>
            )}
            {venue.urgency === "unknown" && (
              <span className="text-[10px] text-zinc-600">Lead time not available</span>
            )}
          </div>

          {venue.why_we_like_it && (
            <p className="text-[10px] sm:text-xs text-zinc-500 mt-1.5 line-clamp-2">{venue.why_we_like_it}</p>
          )}

          {/* Action */}
          <div className="mt-2.5 flex gap-2">
            <Link
              href={`/snipes/new?venue_resy_id=${venue.resy_id}&venue_name=${encodeURIComponent(venue.name)}&date=${targetDate}&from=discover`}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] sm:text-xs font-medium bg-gradient-to-r from-resy-red to-resy-red-light text-white rounded-lg hover:brightness-110 transition-all shadow-sm shadow-resy-red/20"
            >
              Queue Booking →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
