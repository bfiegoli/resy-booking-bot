"use client";

import { useEffect, useState, useCallback } from "react";
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
  created_at: string;
};

type Account = {
  id: number;
  email: string;
  first_name: string | null;
};

type Venue = {
  id: number;
  name: string;
  image_url: string | null;
  neighborhood: string | null;
  cuisine: string | null;
};

const statusConfig: Record<string, { color: string; bg: string; glow: string; icon: string; label: string }> = {
  scheduled: { color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", glow: "glow-blue", icon: "📋", label: "Scheduled" },
  armed: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", glow: "glow-purple", icon: "⏳", label: "Ready" },
  running: { color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", glow: "glow-purple", icon: "⚡", label: "Running" },
  success: { color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", glow: "glow-green", icon: "✅", label: "Booked!" },
  failed: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", glow: "glow-red", icon: "❌", label: "Failed" },
  cancelled: { color: "text-zinc-500", bg: "bg-zinc-500/10 border-zinc-500/20", glow: "", icon: "🚫", label: "Cancelled" },
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
      if (d > 0) setText(`${d}d ${h}h ${m}m`);
      else if (h > 0) setText(`${h}h ${m}m ${s}s`);
      else setText(`${m}m ${s}s`);
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [target]);

  return <span className="font-mono tabular-nums">{text}</span>;
}

export default function Dashboard() {
  const [snipes, setSnipes] = useState<Snipe[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [venues, setVenues] = useState<Record<number, Venue>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    Promise.all([
      fetch("/api/snipes").then((r) => r.json()),
      fetch("/api/auth").then((r) => r.json()),
    ]).then(([s, a]) => {
      setSnipes(s.snipes ?? []);
      setAccounts(a.accounts ?? []);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, [load]);

  const cancelSnipe = async (id: number) => {
    await fetch(`/api/snipes/${id}`, { method: "DELETE" });
    load();
  };

  const runNow = async (id: number) => {
    await fetch(`/api/snipes/${id}/run`, { method: "POST" });
    load();
  };

  const accountMap = Object.fromEntries(accounts.map((a) => [a.id, a]));
  const active = snipes.filter((s) => ["scheduled", "armed", "running"].includes(s.status));
  const past = snipes.filter((s) => ["success", "failed", "cancelled"].includes(s.status) && !s.demo);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-zinc-600 text-sm">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {active.length > 0
              ? `${active.length} booking${active.length > 1 ? "s" : ""} queued and ready`
              : "No active bookings — create one to get started"}
          </p>
        </div>
        <Link
          href="/snipes/new"
          className="px-5 py-2.5 bg-gradient-to-r from-resy-red to-resy-red-light hover:brightness-110 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-resy-red/20 hover:shadow-resy-red/30 text-center shrink-0"
        >
          + New Booking
        </Link>
      </div>

      {/* Stats */}
      {past.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-2xl font-bold tabular-nums text-green-400">{past.filter((s) => s.status === "success").length}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Booked</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-2xl font-bold tabular-nums text-red-400">{past.filter((s) => s.status === "failed").length}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Failed</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-2xl font-bold tabular-nums text-zinc-300">
              {past.filter((s) => s.status === "success").length + past.filter((s) => s.status === "failed").length > 0
                ? `${Math.round((past.filter((s) => s.status === "success").length / (past.filter((s) => s.status === "success").length + past.filter((s) => s.status === "failed").length)) * 100)}%`
                : "—"}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Success Rate</div>
          </div>
        </div>
      )}

      {accounts.length === 0 && (
        <div className="glass rounded-xl p-5 border-amber-500/20 flex items-center gap-4">
          <span className="text-2xl"><E>⚠️</E></span>
          <div>
            <div className="text-amber-300 font-medium text-sm">No Resy account connected</div>
            <div className="text-zinc-400 text-xs mt-0.5">
              <Link href="/settings" className="text-amber-400 hover:text-amber-300 underline underline-offset-2">
                Add your Resy login
              </Link>{" "}
              to start booking reservations
            </div>
          </div>
        </div>
      )}

      {/* Active Snipes */}
      {active.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              Active ({active.length})
            </h2>
          </div>
          <div className="grid gap-4">
            {active.map((snipe, i) => (
              <div key={snipe.id} className="animate-slide-up" style={{ animationDelay: `${i * 50}ms` }}>
                <SnipeCard
                  snipe={snipe}
                  account={accountMap[snipe.account_id]}
                  onCancel={() => cancelSnipe(snipe.id)}
                  onRunNow={() => runNow(snipe.id)}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty State */}
      {active.length === 0 && accounts.length > 0 && (
        <div className="glass rounded-2xl p-8 sm:p-12 text-center">
          <div className="text-4xl sm:text-5xl mb-4"><E>🎯</E></div>
          <div className="text-zinc-300 font-medium">No bookings queued</div>
          <div className="text-zinc-500 text-sm mt-1 mb-6">
            Search for a restaurant and set up your first booking
          </div>
          <Link
            href="/snipes/new"
            className="inline-flex px-6 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-medium transition-all"
          >
            New Booking →
          </Link>
        </div>
      )}

      {/* Past Snipes */}
      {past.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
            History ({past.length})
          </h2>
          <div className="grid gap-3">
            {past.map((snipe) => (
              <SnipeCard key={snipe.id} snipe={snipe} account={accountMap[snipe.account_id]} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SnipeCard({
  snipe,
  account,
  onCancel,
  onRunNow,
}: {
  snipe: Snipe;
  account?: Account;
  onCancel?: () => void;
  onRunNow?: () => void;
}) {
  const prefs = JSON.parse(snipe.preferences) as Array<{ time: string; dining_type?: string }>;
  const isActive = ["scheduled", "armed", "running"].includes(snipe.status);
  const isResearch = snipe.mode === "research";
  let config = statusConfig[snipe.status] ?? statusConfig.cancelled;
  if (isResearch && snipe.status === "success") {
    config = { color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20", glow: "", icon: "🔬", label: "Complete" };
  }

  return (
    <div className={`glass rounded-xl p-4 sm:p-5 transition-all hover:border-zinc-600/50 ${isActive ? config.glow : ""}`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
            <span className="text-lg"><E>{config.icon}</E></span>
            <Link
              href={`/snipes/${snipe.id}`}
              className="text-white font-semibold text-base sm:text-lg hover:text-resy-red-light transition-colors truncate"
            >
              {snipe.venue_name}
            </Link>
            <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border ${config.bg} ${config.color} uppercase tracking-wide`}>
              {config.label}
            </span>
            {snipe.mode === "research" && (
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-wide">
                Research
              </span>
            )}
            {snipe.demo === 1 && (
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-wide">
                Demo
              </span>
            )}
          </div>

          {/* Details row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm sm:ml-9">
            <span className="text-zinc-300 font-medium">{new Date(snipe.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
            {!isResearch && (
              <>
                <span className="text-zinc-500">·</span>
                <span className="text-zinc-400">Party of {snipe.party_size}</span>
                <span className="text-zinc-500">·</span>
                <span className="text-zinc-400">
                  {prefs.map((p) => p.time).join(", ")}
                </span>
              </>
            )}
            {accounts.length > 1 && account && (
              <>
                <span className="text-zinc-500">·</span>
                <span className="text-zinc-500 text-xs">{account.email}</span>
              </>
            )}
          </div>

          {/* Countdown */}
          {snipe.booking_window_start && isActive && (
            <div className="mt-3 sm:ml-9 flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-500">Opens in</span>
              <span className={`text-sm font-semibold ${config.color}`}>
                <Countdown target={snipe.booking_window_start} />
              </span>
              <span className="text-xs text-zinc-600 hidden sm:inline">
                ({new Date(snipe.booking_window_start).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" })})
              </span>
            </div>
          )}

          {/* Success */}
          {snipe.reservation_id && (
            <div className="mt-3 sm:ml-9 flex items-center gap-2 text-green-400">
              <span className="text-sm font-mono">Reservation #{snipe.reservation_id}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 shrink-0">
          <Link
            href={`/snipes/${snipe.id}`}
            className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-all font-medium"
          >
            View Logs
          </Link>
          {isActive && onRunNow && snipe.status !== "running" && (
            <button
              onClick={onRunNow}
              className="px-3 py-1.5 text-xs bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 rounded-lg transition-all font-medium"
            >
              Run Now
            </button>
          )}
          {isActive && onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1.5 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400/80 hover:text-red-400 rounded-lg transition-all font-medium"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const accounts: Account[] = [];
