"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { E } from "@/components/emoji";

type VenueHit = {
  resy_id: number;
  name: string;
  neighborhood: string;
  locality: string;
  cuisine: string[];
  image_url: string | null;
  max_party_size: number;
  rating_average: number;
  rating_count: number;
  price_range_id: number;
  lead_time_days: number | null;
  booking_hour: number | null;
  time_zone: string | null;
};

type SavedVenue = {
  id: number;
  resy_id: number;
  name: string;
  lead_time_days: number | null;
  booking_hour: number;
  time_zone: string;
};

type Account = {
  id: number;
  email: string;
  first_name: string | null;
  is_default: number;
};

type Preference = { time: string; dining_type: string };

type Mode = "book" | "research";

const priceRange = ["", "$", "$$", "$$$", "$$$$"];

export default function NewSnipePage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [mode, setMode] = useState<Mode>("book");
  const [demo, setDemo] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<VenueHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<SavedVenue | null>(null);
  const [selectedVenueDisplay, setSelectedVenueDisplay] = useState<VenueHit | null>(null);

  const [dates, setDates] = useState<string[]>([]);
  const [dateInput, setDateInput] = useState("");
  const [partySize, setPartySize] = useState(2);
  const [preferences, setPreferences] = useState<Preference[]>([{ time: "19:00", dining_type: "" }]);
  const [retryTimeout, setRetryTimeout] = useState(15);
  const [wakeAdjustment, setWakeAdjustment] = useState(500);

  const [leadTime, setLeadTime] = useState<number | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [knownDiningTypes, setKnownDiningTypes] = useState<string[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth")
      .then((r) => r.json())
      .then((d) => {
        const accs = d.accounts ?? [];
        setAccounts(accs);
        const def = accs.find((a: Account) => a.is_default) ?? accs[0];
        if (def) setAccountId(def.id);
      });
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (query.length >= 2) {
        setSearching(true);
        fetch(`/api/venues/search?q=${encodeURIComponent(query)}`)
          .then((r) => r.json())
          .then((d) => { setResults(d.venues ?? []); setSearching(false); });
      } else {
        setResults([]);
      }
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  // Default research timeout to 120s
  useEffect(() => {
    setRetryTimeout(mode === "research" ? 30 : 15);
  }, [mode]);

  const selectVenue = async (venue: VenueHit) => {
    setSelectedVenueDisplay(venue);
    setResults([]);
    setQuery("");

    const saveRes = await fetch("/api/venues/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(venue),
    });
    const saved = await saveRes.json();
    setSelectedVenue(saved.venue);

    if (saved.venue && accountId) {
      setLoadingConfig(true);
      const [configRes, dtRes] = await Promise.all([
        fetch(`/api/venues/${saved.venue.id}/config`),
        fetch(`/api/venues/${saved.venue.id}/dining-types`),
      ]);
      if (configRes.ok) {
        const config = await configRes.json();
        setLeadTime(config.lead_time_days);
      }
      if (dtRes.ok) {
        const dt = await dtRes.json();
        setKnownDiningTypes(dt.dining_types ?? []);
      }
      setLoadingConfig(false);
    }
  };

  const addDate = (d: string) => {
    if (d && !dates.includes(d)) {
      setDates((prev) => [...prev, d].sort());
      setDateInput("");
    }
  };
  const removeDate = (d: string) => setDates((prev) => prev.filter((x) => x !== d));

  const addPreference = () => setPreferences([...preferences, { time: "19:30", dining_type: "" }]);
  const removePreference = (i: number) => setPreferences(preferences.filter((_, idx) => idx !== i));
  const updatePreference = (i: number, field: keyof Preference, value: string) => {
    const updated = [...preferences];
    updated[i] = { ...updated[i], [field]: value };
    setPreferences(updated);
  };

  const submit = async () => {
    if (!selectedVenue || !accountId || dates.length === 0) {
      setError("Fill in all required fields");
      return;
    }
    if (mode === "book" && !preferences.length) {
      setError("Add at least one time preference");
      return;
    }
    setSubmitting(true);
    setError("");

    const prefs = mode === "book"
      ? preferences.map((p) => ({
          time: p.time,
          ...(p.dining_type ? { dining_type: p.dining_type } : {}),
        }))
      : [];

    const results: { id: number }[] = [];
    for (const d of dates) {
      const res = await fetch("/api/snipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: accountId,
          venue_id: selectedVenue.id,
          venue_name: selectedVenueDisplay?.name ?? "Unknown",
          date: d,
          party_size: mode === "book" ? partySize : 2,
          preferences: prefs,
          retry_timeout_seconds: retryTimeout,
          wake_adjustment_ms: wakeAdjustment,
          mode,
          demo,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitting(false); setError(data.error ?? `Failed to create booking for ${d}`); return; }
      results.push({ id: data.snipe.id });
    }

    setSubmitting(false);
    if (results.length === 1) {
      router.push(`/snipes/${results[0].id}`);
    } else {
      router.push("/");
    }
  };

  const bookingWindowForDate = (dt: string) => {
    if (!dt || leadTime == null) return null;
    const d = new Date(dt + "T00:00:00");
    d.setDate(d.getDate() - leadTime);
    return d;
  };

  const isReady = selectedVenue && accountId && dates.length > 0 && (mode === "research" || preferences.length > 0);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {mode === "research" ? "New Research" : "New Booking"}
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          {mode === "research"
            ? "Observe what slots release at the booking window"
            : "Set up an automated reservation booking"}
        </p>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-xl w-fit">
        <button
          onClick={() => setMode("book")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            mode === "book"
              ? "bg-resy-red/20 text-resy-red-light border border-resy-red/30"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <E>🍽️</E> Book
        </button>
        <button
          onClick={() => setMode("research")}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            mode === "research"
              ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <E>🔬</E> Research
        </button>
      </div>

      {/* Account Selection */}
      {accounts.length === 1 && (
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <span className="text-xs">👤</span>
          Booking as <span className="text-zinc-200 font-medium">{accounts[0].first_name ?? accounts[0].email}</span>
          <span className="text-zinc-600">({accounts[0].email})</span>
        </div>
      )}
      {accounts.length > 1 && (
        <Field label="Account" icon="👤">
          <select
            value={accountId ?? ""}
            onChange={(e) => setAccountId(Number(e.target.value))}
            className="input"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.first_name ?? a.email} ({a.email})
              </option>
            ))}
          </select>
        </Field>
      )}

      {accounts.length === 0 && (
        <div className="glass rounded-xl p-5 border-amber-500/20 flex items-center gap-4">
          <span className="text-2xl"><E>⚠️</E></span>
          <div>
            <div className="text-amber-300 font-medium text-sm">Add a Resy account first</div>
            <a href="/settings" className="text-amber-400 hover:text-amber-300 underline underline-offset-2 text-xs">
              Go to Settings →
            </a>
          </div>
        </div>
      )}

      {/* Restaurant Search */}
      <Field label="Restaurant" icon="🍽️">
        {selectedVenueDisplay ? (
          <div className="glass rounded-xl overflow-hidden">
            <div className="flex flex-col sm:flex-row">
              {selectedVenueDisplay.image_url && (
                <img
                  src={selectedVenueDisplay.image_url}
                  alt=""
                  className="w-full h-32 sm:w-28 sm:h-28 object-cover shrink-0"
                />
              )}
              <div className="flex-1 p-4 flex flex-col justify-center min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-semibold text-base sm:text-lg">{selectedVenueDisplay.name}</span>
                  {selectedVenueDisplay.rating_average > 0 && (
                    <span className="text-xs text-amber-400 font-medium">
                      ★ {selectedVenueDisplay.rating_average.toFixed(1)}
                    </span>
                  )}
                </div>
                <div className="text-sm text-zinc-400 mt-0.5">
                  {selectedVenueDisplay.neighborhood}, {selectedVenueDisplay.locality}
                  {selectedVenueDisplay.cuisine?.length > 0 && (
                    <span className="text-zinc-600"> · {selectedVenueDisplay.cuisine.join(", ")}</span>
                  )}
                </div>
                {loadingConfig ? (
                  <div className="text-xs text-zinc-600 mt-1.5 animate-pulse">Fetching booking window...</div>
                ) : leadTime != null ? (
                  <div className="text-xs text-zinc-500 mt-1.5 space-y-0.5">
                    <div>
                      <E>📅</E> Books <span className="text-zinc-300">{leadTime} days</span> ahead
                      {selectedVenue && (
                        <span> · Opens at <span className="text-zinc-300">{selectedVenue.booking_hour}:00</span> {formatTz(selectedVenue.time_zone)}</span>
                      )}
                    </div>
                    <div className="text-zinc-400">
                      Next date to open: <span className="text-zinc-200 font-medium">{(() => {
                        const d = new Date();
                        d.setDate(d.getDate() + leadTime);
                        return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
                      })()}</span>
                    </div>
                  </div>
                ) : null}
              </div>
              <button
                onClick={() => { setSelectedVenue(null); setSelectedVenueDisplay(null); setLeadTime(null); setKnownDiningTypes([]); }}
                className="self-start sm:self-start mx-4 mb-3 sm:m-3 text-zinc-600 hover:text-zinc-300 text-xs px-2 py-1 hover:bg-white/5 rounded transition-all shrink-0"
              >
                Change
              </button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <div className="relative">
              <input
                type="text"
                placeholder="Search restaurants..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="input"
                autoFocus
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-400 rounded-full animate-spin" />
                </div>
              )}
            </div>
            {results.length > 0 && (
              <div className="absolute z-20 mt-2 w-full bg-zinc-900 border border-zinc-700/50 rounded-xl shadow-2xl max-h-96 overflow-y-auto">
                {results.map((v) => (
                  <button
                    key={v.resy_id}
                    onClick={() => selectVenue(v)}
                    className="w-full text-left px-3 py-3 hover:bg-white/5 flex items-center gap-3 border-b border-zinc-800/50 last:border-0 transition-colors"
                  >
                    {v.image_url ? (
                      <img src={v.image_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center text-lg shrink-0"><E>🍽️</E></div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium truncate">{v.name}</span>
                        {v.rating_average > 0 && (
                          <span className="text-[11px] text-amber-400/80 shrink-0">★ {v.rating_average.toFixed(1)}</span>
                        )}
                        {v.price_range_id > 0 && (
                          <span className="text-[11px] text-zinc-600 shrink-0">{priceRange[v.price_range_id]}</span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 truncate">
                        {v.neighborhood}, {v.locality}
                        {v.cuisine?.length > 0 && ` · ${v.cuisine.join(", ")}`}
                      </div>
                      {v.lead_time_days != null && (() => {
                        const earliest = new Date();
                        earliest.setDate(earliest.getDate() + v.lead_time_days);
                        const label = earliest.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                        return (
                          <div className="text-[11px] text-blue-400/70 mt-0.5">
                            {v.lead_time_days}d out · opens 9:00 AM{v.time_zone ? ` ${formatTz(v.time_zone)}` : ""}
                            <span className="text-zinc-500"> · book today for {label}+</span>
                          </div>
                        );
                      })()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Field>

      {/* Dates + Party Size */}
      {mode === "book" ? (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-4">
          <Field label={`Dates${dates.length > 0 ? ` (${dates.length})` : ""}`} icon="📅" hint="Pick multiple — each becomes its own booking">
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDate(dateInput); } }}
                className="input flex-1"
              />
              <button
                onClick={() => addDate(dateInput)}
                disabled={!dateInput || dates.includes(dateInput)}
                className="px-3 py-2.5 text-sm font-medium bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              >
                Add
              </button>
            </div>
            {dates.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {dates.map((d) => (
                  <span key={d} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-zinc-700/50 text-sm text-zinc-200 animate-slide-up">
                    {new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    <button onClick={() => removeDate(d)} className="text-zinc-600 hover:text-red-400 transition-colors ml-0.5">×</button>
                  </span>
                ))}
              </div>
            )}
          </Field>
          <Field label="Party Size" icon="👥">
            <select value={partySize} onChange={(e) => setPartySize(Number(e.target.value))} className="input">
              {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n} {n === 1 ? "person" : "people"}</option>
              ))}
            </select>
          </Field>
        </div>
      ) : (
        <Field label={`Dates to observe${dates.length > 0 ? ` (${dates.length})` : ""}`} icon="📅" hint="Pick multiple — each becomes its own research run">
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateInput}
              onChange={(e) => setDateInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDate(dateInput); } }}
              className="input flex-1"
            />
            <button
              onClick={() => addDate(dateInput)}
              disabled={!dateInput || dates.includes(dateInput)}
              className="px-3 py-2.5 text-sm font-medium bg-white/5 hover:bg-white/10 text-zinc-300 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
            >
              Add
            </button>
          </div>
          {dates.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {dates.map((d) => (
                <span key={d} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-zinc-700/50 text-sm text-zinc-200 animate-slide-up">
                  {new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                  <button onClick={() => removeDate(d)} className="text-zinc-600 hover:text-red-400 transition-colors ml-0.5">×</button>
                </span>
              ))}
            </div>
          )}
        </Field>
      )}

      {/* Booking Window Info */}
      {dates.length > 0 && selectedVenue && leadTime != null && !demo && (
        <div className={`glass rounded-xl p-4 ${mode === "research" ? "border-cyan-500/20" : "border-blue-500/20 glow-blue"}`}>
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5"><E>{mode === "research" ? "🔬" : "🎯"}</E></span>
            <div className="space-y-2">
              {dates.map((d) => {
                const bw = bookingWindowForDate(d)!;
                return (
                  <div key={d} className={`text-sm font-medium ${mode === "research" ? "text-cyan-300" : "text-blue-300"}`}>
                    <span className="text-zinc-400">{new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                    {" → opens "}
                    <span className="text-white">
                      {bw.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                    {" at "}
                    <span className="text-white">{selectedVenue.booking_hour}:00 AM</span>
                    {" "}
                    <span className={mode === "research" ? "text-cyan-400/80" : "text-blue-400/80"}>{formatTz(selectedVenue.time_zone)}</span>
                  </div>
                );
              })}
              <div className="text-xs text-zinc-500">
                {mode === "research"
                  ? `Will observe for ${retryTimeout}s starting at each window open`
                  : `The bot will wake up ${wakeAdjustment}ms early and start requesting slots`}
                {dates.length > 1 && ` · ${dates.length} bookings will be created`}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Time Preferences (Book mode only) */}
      {mode === "book" && (
        <Field label="Time Preferences" icon="⏰" hint="Ranked by priority — #1 is tried first">
          <div className="space-y-2">
            {preferences.map((pref, i) => (
              <div key={i} className="animate-slide-up space-y-1.5" style={{ animationDelay: `${i * 30}ms` }}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                    i === 0 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-zinc-800 text-zinc-500 border border-zinc-700"
                  }`}>
                    {i + 1}
                  </span>
                  <input
                    type="time"
                    value={pref.time}
                    onChange={(e) => updatePreference(i, "time", e.target.value)}
                    className="input !w-[120px] sm:!w-[140px] shrink-0"
                  />
                  <input
                    type="text"
                    placeholder="Dining type (optional)"
                    value={pref.dining_type}
                    onChange={(e) => updatePreference(i, "dining_type", e.target.value)}
                    className="input !w-auto flex-1 min-w-0 basis-[120px]"
                  />
                  {pref.dining_type && (
                    <button
                      type="button"
                      onClick={() => updatePreference(i, "dining_type", "")}
                      className="text-zinc-600 hover:text-zinc-400 text-xs shrink-0"
                    >
                      clear
                    </button>
                  )}
                  {preferences.length > 1 && (
                    <button
                      onClick={() => removePreference(i)}
                      className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-all text-sm shrink-0"
                    >
                      ×
                    </button>
                  )}
                </div>
                {knownDiningTypes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 ml-8">
                    {knownDiningTypes.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => updatePreference(i, "dining_type", t)}
                        className={`text-[11px] px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                          pref.dining_type === t
                            ? "bg-white/10 border-zinc-500 text-white"
                            : "bg-white/5 border-zinc-700/50 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <button
              onClick={addPreference}
              className="text-xs text-zinc-500 hover:text-zinc-300 px-3 py-1.5 hover:bg-white/5 rounded-lg transition-all flex items-center gap-1"
            >
              + Add fallback time
            </button>
          </div>
        </Field>
      )}

      {/* Research mode info */}
      {mode === "research" && (
        <div className="glass rounded-xl p-4 border-cyan-500/10">
          <div className="text-sm text-cyan-300/80 font-medium mb-1">What research mode does</div>
          <ul className="text-xs text-zinc-400 space-y-1">
            <li>• Wakes up at the booking window open time</li>
            <li>• Polls the API repeatedly to observe all released slots</li>
            <li>• Tracks time, table type, party size for every slot</li>
            <li>• Monitors how quickly slots disappear</li>
            <li>• Does NOT book anything</li>
          </ul>
        </div>
      )}

      {/* Advanced */}
      <details className="group">
        <summary className="text-xs text-zinc-600 cursor-pointer hover:text-zinc-400 transition-colors flex items-center gap-1">
          <span className="group-open:rotate-90 transition-transform">▶</span>
          Advanced settings
        </summary>
        <div className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <Field label={mode === "research" ? "Observation Duration" : "Retry Timeout"}>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={retryTimeout}
                  onChange={(e) => setRetryTimeout(Number(e.target.value))}
                  min={5}
                  max={300}
                  className="input !w-24"
                />
                <span className="text-xs text-zinc-500">seconds</span>
              </div>
            </Field>
            {mode === "book" && (
              <Field label="Wake Adjustment">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={wakeAdjustment}
                    onChange={(e) => setWakeAdjustment(Number(e.target.value))}
                    min={0}
                    max={5000}
                    step={100}
                    className="input !w-24"
                  />
                  <span className="text-xs text-zinc-500">ms early</span>
                </div>
              </Field>
            )}
          </div>

          {/* Demo Toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none glass rounded-xl px-4 py-3">
            <input
              type="checkbox"
              checked={demo}
              onChange={(e) => setDemo(e.target.checked)}
              className="rounded w-4 h-4 accent-purple-500"
            />
            <div>
              <div className="text-sm text-purple-400 font-medium">Demo mode</div>
              <div className="text-[11px] text-zinc-500">
                Fires immediately with mock data — for testing the full flow without hitting Resy
              </div>
            </div>
          </label>
        </div>
      </details>

      {/* Error */}
      {error && (
        <div className="glass rounded-xl p-3 border-red-500/20 flex items-center gap-2 text-sm text-red-400">
          <span><E>💥</E></span> {error}
        </div>
      )}

      {/* Submit */}
      <button
        onClick={submit}
        disabled={submitting || !isReady}
        className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
          isReady
            ? mode === "research"
              ? "bg-gradient-to-r from-cyan-600 to-cyan-500 hover:brightness-110 text-white shadow-lg shadow-cyan-500/20 cursor-pointer"
              : "bg-gradient-to-r from-resy-red to-resy-red-light hover:brightness-110 text-white shadow-lg shadow-resy-red/20 hover:shadow-resy-red/30 cursor-pointer"
            : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
        }`}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            {mode === "research" ? "Starting..." : "Scheduling..."} ({dates.length})
          </span>
        ) : mode === "research" ? (
          <><E>🔬</E> {demo ? "Run Demo Research" : "Start Research"}{dates.length > 1 ? ` (${dates.length} dates)` : ""}</>
        ) : (
          <><E>🍽️</E> {demo ? "Run Demo Booking" : "Schedule Booking"}{dates.length > 1 ? ` (${dates.length} dates)` : ""}</>
        )}
      </button>
    </div>
  );
}

function formatTz(tz: string): string {
  try {
    const short = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value;
    return short ?? tz;
  } catch {
    return tz.replace(/^(America|US|Europe|Atlantic)\//, "");
  }
}

function Field({ label, icon, hint, children }: { label: string; icon?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium text-zinc-400 mb-2">
        {icon && <span className="text-xs">{icon}</span>}
        {label}
        {hint && <span className="text-[11px] text-zinc-600 font-normal ml-1">— {hint}</span>}
      </label>
      {children}
    </div>
  );
}
