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
  soon: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", label: "Opens Soon", icon: "⏳" },
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

export default function DiscoverPage() {
  const [targetDate, setTargetDate] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [query, setQuery] = useState("");
  const [venues, setVenues] = useState<DiscoverVenue[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const [thisWeekend] = useState(() => getNextWeekend(0));
  const [nextWeekend] = useState(() => getNextWeekend(1));

  const pickDate = (date: string, label: string) => {
    setTargetDate(date);
    setDateLabel(label);
    setVenues([]);
    setSearched(false);
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
      fetch(`/api/discover?q=${encodeURIComponent(query)}&date=${targetDate}`)
        .then((r) => r.json())
        .then((d) => {
          setVenues(d.venues ?? []);
          setSearched(true);
        })
        .catch(() => {})
        .finally(() => setSearching(false));
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, targetDate]);

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

      {/* Date Picker */}
      <div className="space-y-3 anim-in" style={{ animationDelay: "100ms" }}>
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">When do you want to go?</label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => pickDate(thisWeekend[0], `This Sat (${formatDate(thisWeekend[0])})`)}
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              targetDate === thisWeekend[0]
                ? "bg-resy-red/20 text-resy-red-light border border-resy-red/30"
                : "glass hover:border-zinc-500/50"
            }`}
          >
            This Sat
          </button>
          <button
            onClick={() => pickDate(thisWeekend[1], `This Sun (${formatDate(thisWeekend[1])})`)}
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              targetDate === thisWeekend[1]
                ? "bg-resy-red/20 text-resy-red-light border border-resy-red/30"
                : "glass hover:border-zinc-500/50"
            }`}
          >
            This Sun
          </button>
          <button
            onClick={() => pickDate(nextWeekend[0], `Next Sat (${formatDate(nextWeekend[0])})`)}
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              targetDate === nextWeekend[0]
                ? "bg-resy-red/20 text-resy-red-light border border-resy-red/30"
                : "glass hover:border-zinc-500/50"
            }`}
          >
            Next Sat
          </button>
          <button
            onClick={() => pickDate(nextWeekend[1], `Next Sun (${formatDate(nextWeekend[1])})`)}
            className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              targetDate === nextWeekend[1]
                ? "bg-resy-red/20 text-resy-red-light border border-resy-red/30"
                : "glass hover:border-zinc-500/50"
            }`}
          >
            Next Sun
          </button>
          <div className="relative">
            <input
              type="date"
              value={targetDate && ![thisWeekend[0], thisWeekend[1], nextWeekend[0], nextWeekend[1]].includes(targetDate) ? targetDate : ""}
              onChange={(e) => {
                if (e.target.value) pickDate(e.target.value, formatDate(e.target.value));
              }}
              className="input !w-auto text-xs sm:text-sm px-3 py-2"
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

      {/* Search */}
      {targetDate && (
        <div className="anim-in" style={{ animationDelay: "200ms" }}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, cuisine, or neighborhood..."
            autoFocus
            className="input text-sm sm:text-base"
          />
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

      {!searching && venues.length > 0 && (
        <div className="space-y-3">
          {venues.map((venue, i) => (
            <VenueCard key={venue.resy_id} venue={venue} targetDate={targetDate} delay={i * 60} />
          ))}
        </div>
      )}

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

      {targetDate && !query && !searching && (
        <div className="glass rounded-2xl p-6 sm:p-10 text-center anim-in">
          <div className="text-2xl sm:text-3xl mb-3"><E>🔍</E></div>
          <div className="text-zinc-300 text-sm font-medium">Search for restaurants</div>
          <div className="text-zinc-500 text-xs mt-1">
            Try a cuisine, neighborhood, or restaurant name
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {["Italian", "Sushi", "French", "Williamsburg", "West Village", "Steakhouse"].map((s) => (
              <button
                key={s}
                onClick={() => setQuery(s)}
                className="px-3 py-1.5 text-xs glass rounded-lg hover:border-zinc-500/50 text-zinc-400 hover:text-zinc-200 transition-all"
              >
                {s}
              </button>
            ))}
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
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-semibold border ${cfg.bg} ${cfg.color}`}>
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
