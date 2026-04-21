"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { E } from "@/components/emoji";

type Snipe = {
  id: number;
  account_id: number;
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
};

type ResearchSlot = {
  time: string;
  type: string;
  min_seats: number;
  max_seats: number;
  first_seen_ms: number;
  last_seen_ms: number;
  seen_count: number;
};

type ResearchSummary = {
  total_sweeps: number;
  duration_ms: number;
  total_unique_slots: number;
  peak_available: number;
  slots: ResearchSlot[];
  timeline: Array<{ ms: number; available: number }>;
};

type Log = {
  id: number;
  timestamp: string;
  level: string;
  phase: string;
  message: string;
  data: string | null;
  duration_ms: number | null;
};

const phaseIcons: Record<string, string> = {
  schedule: "📅",
  cron: "⏰",
  wake: "🔔",
  start: "🚀",
  auth: "🔑",
  prewarm: "🔥",
  find: "🔍",
  match: "🎯",
  details: "📋",
  book: "📖",
  done: "✅",
  timeout: "⏱️",
  analysis: "🔬",
  error: "💥",
  setup: "⚙️",
};

const phaseColors: Record<string, string> = {
  schedule: "text-zinc-400",
  cron: "text-zinc-400",
  wake: "text-purple-400",
  start: "text-blue-400",
  auth: "text-cyan-400",
  prewarm: "text-orange-400",
  find: "text-sky-400",
  match: "text-emerald-400",
  details: "text-teal-400",
  book: "text-green-400",
  done: "text-green-300",
  timeout: "text-orange-400",
  analysis: "text-yellow-300",
  error: "text-red-400",
  setup: "text-zinc-400",
};

const statusConfig: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  scheduled: { color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", icon: "📋", label: "Scheduled" },
  armed: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", icon: "⏳", label: "Ready & Waiting" },
  running: { color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", icon: "⚡", label: "BOOKING..." },
  success: { color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", icon: "✅", label: "BOOKED!" },
  failed: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: "❌", label: "Failed" },
  cancelled: { color: "text-zinc-500", bg: "bg-zinc-500/10 border-zinc-500/20", icon: "🚫", label: "Cancelled" },
};

function Countdown({ target }: { target: string }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const tick = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) { setText("NOW"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (d > 0) setText(`${d}d ${h}h ${m}m ${s}s`);
      else if (h > 0) setText(`${h}h ${m}m ${s}s`);
      else setText(`${m}m ${s}s`);
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [target]);
  return <span className="font-mono tabular-nums">{text}</span>;
}

export default function SnipeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [snipe, setSnipe] = useState<Snipe | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const load = () => {
    Promise.all([
      fetch(`/api/snipes/${id}`).then((r) => r.json()),
      fetch(`/api/snipes/${id}/logs`).then((r) => r.json()),
    ]).then(([s, l]) => {
      setSnipe(s.snipe ?? null);
      setLogs(l.logs ?? []);
      if (s.snipe && ["success", "failed", "cancelled"].includes(s.snipe.status)) {
        setAutoRefresh(false);
      }
    });
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(load, 1000);
    return () => clearInterval(interval);
  }, [autoRefresh, id]);

  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const toggleLog = (logId: number) => {
    const next = new Set(expandedLogs);
    if (next.has(logId)) next.delete(logId);
    else next.add(logId);
    setExpandedLogs(next);
  };

  const cancelSnipe = async () => {
    await fetch(`/api/snipes/${id}`, { method: "DELETE" });
    load();
  };

  const runNow = async () => {
    setAutoRefresh(true);
    setAutoScroll(true);
    await fetch(`/api/snipes/${id}/run`, { method: "POST" });
    load();
  };

  if (!snipe) {
    return <div className="text-zinc-600 text-center py-32 text-sm">Loading...</div>;
  }

  const prefs = JSON.parse(snipe.preferences) as Array<{ time: string; dining_type?: string }>;
  const isActive = ["scheduled", "armed", "running"].includes(snipe.status);
  const isResearch = snipe.mode === "research";
  let config = statusConfig[snipe.status] ?? statusConfig.cancelled;
  if (isResearch && snipe.status === "success") {
    config = { color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20", icon: "🔬", label: "Research Complete" };
  }
  if (isResearch && snipe.status === "running") {
    config = { color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20", icon: "🔬", label: "OBSERVING..." };
  }
  const filteredLogs = filter === "all"
    ? logs
    : filter === "errors"
      ? logs.filter((l) => l.level === "error" || l.level === "warn")
      : logs.filter((l) => l.phase === filter);
  const phases = [...new Set(logs.map((l) => l.phase))];
  const errorCount = logs.filter((l) => l.level === "error").length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Back */}
      <Link href="/" className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-300 text-xs sm:text-sm transition-colors">
        ← Dashboard
      </Link>

      {/* Header Card */}
      <div className={`glass rounded-xl sm:rounded-2xl p-3 sm:p-6 ${snipe.status === "success" ? "glow-green" : snipe.status === "failed" ? "glow-red" : snipe.status === "running" ? "glow-purple" : ""}`}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 mb-2 sm:mb-3">
              <span className="text-lg sm:text-2xl"><E>{config.icon}</E></span>
              <h1 className="text-base sm:text-2xl font-bold text-white">{snipe.venue_name}</h1>
              <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold border uppercase tracking-wider ${config.bg} ${config.color} ${snipe.status === "running" ? "animate-pulse" : ""}`}>
                {config.label}
              </span>
              {snipe.mode === "research" && (
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold border bg-cyan-500/10 border-cyan-500/20 text-cyan-400 uppercase tracking-wider">
                  Research
                </span>
              )}
              {snipe.demo === 1 && (
                <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold border bg-purple-500/10 border-purple-500/20 text-purple-400 uppercase tracking-wider">
                  Demo
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 sm:gap-x-4 gap-y-1 text-xs sm:text-sm ml-7 sm:ml-11">
              <span className="text-zinc-300 font-medium">
                {new Date(snipe.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
              </span>
              {snipe.mode === "book" && (
                <>
                  <span className="text-zinc-600">·</span>
                  <span className="text-zinc-400">Party of {snipe.party_size}</span>
                  <span className="text-zinc-600 hidden sm:inline">·</span>
                  <span className="text-zinc-400 hidden sm:inline">
                    Prefs: {prefs.map((p, i) => `${i + 1}) ${p.time}${p.dining_type ? " " + p.dining_type : ""}`).join(" → ")}
                  </span>
                </>
              )}
            </div>
            {snipe.booking_window_start && isActive && (
              <div className="mt-3 sm:mt-4 ml-7 sm:ml-11 glass rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 inline-flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="text-[10px] sm:text-xs text-zinc-500">Opens in:</span>
                <span className={`text-sm sm:text-lg font-bold ${config.color}`}>
                  <Countdown target={snipe.booking_window_start} />
                </span>
              </div>
            )}
            {snipe.reservation_id && (
              <div className="mt-3 sm:mt-4 ml-7 sm:ml-11 bg-green-500/10 border border-green-500/20 rounded-lg px-3 sm:px-4 py-2 sm:py-2.5 inline-flex items-center gap-2 glow-green">
                <span className="text-green-400 font-semibold text-xs sm:text-base">Reservation #{snipe.reservation_id}</span>
              </div>
            )}
          </div>
          <div className="flex gap-1.5 sm:gap-2 shrink-0 ml-7 sm:ml-0">
            {isActive && snipe.status !== "running" && (
              <button onClick={runNow} className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 rounded-xl transition-all font-medium">
                <E>⚡</E> Run Now
              </button>
            )}
            {isActive && (
              <button onClick={cancelSnipe} className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-red-500/10 hover:bg-red-500/20 text-red-400/80 hover:text-red-400 rounded-xl transition-all font-medium">
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Research Results */}
      {snipe.mode === "research" && snipe.research_summary && (() => {
        const summary: ResearchSummary = JSON.parse(snipe.research_summary);
        return (
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Unique Slots", value: summary.total_unique_slots, color: "text-cyan-400" },
                { label: "Peak Available", value: summary.peak_available, color: "text-green-400" },
                { label: "Sweeps", value: summary.total_sweeps, color: "text-blue-400" },
                { label: "Duration", value: `${(summary.duration_ms / 1000).toFixed(0)}s`, color: "text-zinc-300" },
              ].map((stat) => (
                <div key={stat.label} className="glass rounded-xl p-3 sm:p-4 text-center">
                  <div className={`text-lg sm:text-2xl font-bold tabular-nums ${stat.color}`}>{stat.value}</div>
                  <div className="text-[10px] sm:text-[11px] text-zinc-500 mt-0.5 sm:mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Availability Timeline */}
            {summary.timeline.length > 0 && (
              <div className="glass rounded-xl p-5">
                <h3 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                  <E>📈</E> Availability Over Time
                </h3>
                <div className="h-24 flex items-end gap-px">
                  {(() => {
                    const max = Math.max(...summary.timeline.map((t) => t.available), 1);
                    const step = Math.max(1, Math.floor(summary.timeline.length / 80));
                    const sampled = summary.timeline.filter((_, i) => i % step === 0);
                    return sampled.map((point, i) => {
                      const h = (point.available / max) * 100;
                      return (
                        <div
                          key={i}
                          className="flex-1 min-w-[2px] rounded-t transition-all bg-cyan-500/60 hover:bg-cyan-400"
                          style={{ height: `${Math.max(h, 2)}%` }}
                          title={`+${(point.ms / 1000).toFixed(1)}s: ${point.available} slots`}
                        />
                      );
                    });
                  })()}
                </div>
                <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
                  <span>0s</span>
                  <span>{(summary.duration_ms / 1000).toFixed(0)}s</span>
                </div>
              </div>
            )}

            {/* Slot Table */}
            {summary.slots.length > 0 && (
              <div className="glass rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-zinc-800/50">
                  <h3 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
                    <E>📋</E> Observed Slots ({summary.slots.length})
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead>
                      <tr className="text-[10px] sm:text-[11px] text-zinc-500 uppercase tracking-wider border-b border-zinc-800/30">
                        <th className="text-left px-3 sm:px-5 py-2 font-medium">Time</th>
                        <th className="text-left px-3 sm:px-5 py-2 font-medium">Type</th>
                        <th className="text-left px-3 sm:px-5 py-2 font-medium">Seats</th>
                        <th className="text-left px-3 sm:px-5 py-2 font-medium">First Seen</th>
                        <th className="text-left px-3 sm:px-5 py-2 font-medium">Last Seen</th>
                        <th className="text-left px-3 sm:px-5 py-2 font-medium">Lifespan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.slots.map((slot, i) => {
                        const lifespan = slot.last_seen_ms - slot.first_seen_ms;
                        const lifespanLabel = lifespan < 1000 ? `${lifespan}ms` : `${(lifespan / 1000).toFixed(1)}s`;
                        const isPrime = ["19:00", "19:30", "20:00", "20:30"].includes(slot.time);
                        const isFast = lifespan < 5000 && isPrime;
                        return (
                          <tr key={i} className={`border-b border-zinc-800/20 ${isFast ? "bg-red-500/[0.03]" : ""}`}>
                            <td className="px-3 sm:px-5 py-2 font-mono text-zinc-200 font-medium whitespace-nowrap">{slot.time}</td>
                            <td className="px-3 sm:px-5 py-2 text-zinc-400 whitespace-nowrap">{slot.type}</td>
                            <td className="px-3 sm:px-5 py-2 text-zinc-400 tabular-nums whitespace-nowrap">{slot.min_seats}–{slot.max_seats}</td>
                            <td className="px-3 sm:px-5 py-2 text-zinc-500 font-mono tabular-nums whitespace-nowrap">+{(slot.first_seen_ms / 1000).toFixed(1)}s</td>
                            <td className="px-3 sm:px-5 py-2 text-zinc-500 font-mono tabular-nums whitespace-nowrap">+{(slot.last_seen_ms / 1000).toFixed(1)}s</td>
                            <td className={`px-3 sm:px-5 py-2 font-mono tabular-nums whitespace-nowrap ${isFast ? "text-red-400 font-medium" : lifespan < 30000 ? "text-amber-400" : "text-green-400"}`}>
                              {lifespanLabel}
                              {isFast && <span className="ml-1.5 text-[10px] text-red-400/70">FAST</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Log Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base sm:text-lg font-semibold text-zinc-300 flex items-center gap-2">
            <span><E>📟</E></span> Activity Log
            <span className="text-xs text-zinc-600 font-normal">({logs.length})</span>
          </h2>
          {errorCount > 0 && (
            <span className="px-2 py-0.5 text-[10px] font-bold bg-red-500/15 text-red-400 rounded-full border border-red-500/20">
              {errorCount} error{errorCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex flex-wrap gap-1 bg-zinc-900/50 rounded-lg p-0.5 max-w-full">
            {[
              { key: "all", label: "All" },
              { key: "errors", label: `Errors${errorCount > 0 ? ` (${errorCount})` : ""}` },
              ...phases.map((p) => ({ key: p, label: p })),
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-2 py-1 text-[11px] rounded-md capitalize transition-all ${
                  filter === key
                    ? "bg-white/10 text-white font-medium"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-[11px] text-zinc-500 cursor-pointer select-none shrink-0">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="rounded w-3 h-3 accent-zinc-500" />
            Live
          </label>
        </div>
      </div>

      {/* Log Viewer — Terminal Style */}
      {logs.length === 0 ? (
        <div className="glass rounded-xl sm:rounded-2xl p-6 sm:p-16 text-center">
          <div className="text-2xl sm:text-3xl mb-2 sm:mb-3"><E>📡</E></div>
          <div className="text-zinc-400 text-sm font-medium">Waiting for signal...</div>
          <div className="text-zinc-600 text-xs sm:text-sm mt-1">Logs will stream here when the booking fires</div>
        </div>
      ) : (
        <div className="bg-[#0a0a0c] border border-zinc-800/50 rounded-2xl overflow-hidden shadow-2xl">
          {/* Terminal header */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900/50 border-b border-zinc-800/50">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <span className="text-[11px] text-zinc-500 font-mono ml-2 truncate">
              booking:{snipe.id} — {snipe.venue_name.toLowerCase().replace(/\s+/g, "-")}
            </span>
          </div>

          {/* Log entries */}
          <div ref={logContainerRef} className="max-h-[600px] overflow-y-auto overflow-x-auto font-mono text-[11px] sm:text-[12px] leading-relaxed">
            {filteredLogs.map((log, i) => {
              const ts = new Date(log.timestamp);
              const timeStr = ts.toLocaleTimeString("en-US", { hour12: false, fractionalSecondDigits: 3 });
              const hasData = log.data && log.data !== "null";
              const isExpanded = expandedLogs.has(log.id);
              const icon = phaseIcons[log.phase] ?? "•";
              const isError = log.level === "error";
              const isWarn = log.level === "warn";
              const isSuccess = log.message.includes("CONFIRMED") || log.message.includes("MATCH");

              return (
                <div key={log.id} className={`border-b border-zinc-900/50 last:border-0 ${isError ? "bg-red-500/[0.03]" : isSuccess ? "bg-green-500/[0.03]" : ""}`}>
                  <div
                    className={`flex items-start gap-2 px-4 py-1.5 log-line ${hasData ? "cursor-pointer" : ""}`}
                    onClick={() => hasData && toggleLog(log.id)}
                  >
                    <span className="text-zinc-700 shrink-0 select-none w-[56px] sm:w-[90px] truncate">{timeStr}</span>
                    <span className="shrink-0 w-4 text-center hidden sm:inline"><E>{icon}</E></span>
                    <span className={`shrink-0 w-[52px] sm:w-[68px] ${phaseColors[log.phase] ?? "text-zinc-400"} uppercase text-[10px] sm:text-[11px] font-semibold truncate`}>
                      {log.phase}
                    </span>
                    <span className={`flex-1 ${isError ? "text-red-400 font-medium" : isWarn ? "text-yellow-400" : isSuccess ? "text-green-400 font-medium" : "text-zinc-300"}`}>
                      {log.message}
                    </span>
                    {log.duration_ms != null && (
                      <span className={`shrink-0 tabular-nums text-[11px] ${log.duration_ms > 300 ? "text-yellow-500" : log.duration_ms > 100 ? "text-zinc-500" : "text-green-600"}`}>
                        {log.duration_ms}ms
                      </span>
                    )}
                    {hasData && (
                      <span className="text-zinc-700 shrink-0 text-[10px]">{isExpanded ? "▼" : "▶"}</span>
                    )}
                  </div>
                  {isExpanded && hasData && (
                    <pre className="px-4 py-2 bg-zinc-900/30 text-zinc-500 overflow-x-auto whitespace-pre-wrap break-all border-t border-zinc-800/30 ml-2 sm:ml-[110px] mr-4 mb-1 rounded text-[11px]">
                      {JSON.stringify(JSON.parse(log.data!), null, 2)}
                    </pre>
                  )}
                </div>
              );
            })}
            <div ref={logEndRef} />
          </div>
        </div>
      )}

      {/* Config Dump */}
      <details className="group">
        <summary className="text-xs text-zinc-600 cursor-pointer hover:text-zinc-400 transition-colors flex items-center gap-1">
          <span className="group-open:rotate-90 transition-transform">▶</span>
          Raw configuration
        </summary>
        <pre className="mt-2 glass rounded-xl p-4 text-[11px] text-zinc-500 overflow-x-auto font-mono">
          {JSON.stringify(snipe, null, 2)}
        </pre>
      </details>
    </div>
  );
}
