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

const statusConfig: Record<string, { color: string; bg: string; glow: string; icon: string; label: string }> = {
  scheduled: { color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", glow: "glow-blue", icon: "📋", label: "Scheduled" },
  armed: { color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", glow: "glow-purple", icon: "⏳", label: "Ready" },
  running: { color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20", glow: "glow-purple", icon: "⚡", label: "Running" },
  success: { color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", glow: "glow-green", icon: "✅", label: "Booked!" },
  failed: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", glow: "glow-red", icon: "❌", label: "Failed" },
  cancelled: { color: "text-zinc-500", bg: "bg-zinc-500/10 border-zinc-500/20", glow: "", icon: "🚫", label: "Cancelled" },
};

/* ─── Splash overlay — always plays on load ─── */
function SplashOverlay({ onDone }: { onDone: () => void }) {
  const [lines, setLines] = useState<string[]>([]);
  const [fading, setFading] = useState(false);
  const bootLines = [
    "Initializing Resy Bot 2.0",
    "Connecting to Resy API",
    "Loading accounts",
    "Scanning reservations",
    "Systems online",
  ];

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i < bootLines.length) {
        setLines((prev) => [...prev, bootLines[i]]);
        i++;
      } else {
        clearInterval(timer);
        setTimeout(() => setFading(true), 600);
        setTimeout(() => onDone(), 1100);
      }
    }, 400);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[90] bg-[#09090b] flex flex-col items-center justify-center transition-opacity duration-500 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* Radar */}
      <div className="mb-8 sm:mb-10">
        <RadarIcon className="w-24 h-24 sm:w-32 sm:h-32" />
      </div>

      {/* Terminal */}
      <div className="w-full max-w-sm px-6">
        <div className="glass rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-1.5 mb-4">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
            <span className="text-[10px] text-zinc-600 ml-auto font-mono">v2.0</span>
          </div>
          <div className="font-mono text-[11px] sm:text-xs space-y-2">
            {lines.map((line, i) => {
              const isLast = i === lines.length - 1;
              const isDone = i === bootLines.length - 1 && lines.length === bootLines.length;
              return (
                <div key={i} className="flex items-center gap-2 animate-fade-in">
                  {isDone ? (
                    <span className="text-green-400 shrink-0">✓</span>
                  ) : (
                    <span className={`shrink-0 ${isLast && !isDone ? "text-resy-red animate-pulse" : "text-zinc-600"}`}>
                      {isLast && lines.length < bootLines.length ? "›" : "·"}
                    </span>
                  )}
                  <span className={isDone ? "text-green-400" : "text-zinc-400"}>{line}</span>
                  {isLast && lines.length < bootLines.length && (
                    <span className="inline-block w-1.5 h-3 bg-resy-red/80 animate-pulse rounded-sm" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-zinc-700 text-[10px] font-mono mt-6 tracking-wider uppercase">
        Resy Bot 2.0
      </p>
    </div>
  );
}

/* ─── Radar SVG ─── */
function RadarIcon({ className }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 120 120" className="w-full h-full">
        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(193,39,45,0.12)" strokeWidth="0.75" />
        <circle cx="60" cy="60" r="35" fill="none" stroke="rgba(193,39,45,0.09)" strokeWidth="0.75" />
        <circle cx="60" cy="60" r="20" fill="none" stroke="rgba(193,39,45,0.06)" strokeWidth="0.75" />
        <circle cx="60" cy="60" r="3" fill="rgba(193,39,45,0.5)" />
        <line
          x1="60" y1="60" x2="60" y2="10"
          stroke="url(#sweep-grad)" strokeWidth="1.5" strokeLinecap="round"
          style={{ transformOrigin: "60px 60px", animation: "radar-sweep 2.5s linear infinite" }}
        />
        <circle cx="60" cy="60" r="10" fill="none" stroke="rgba(193,39,45,0.25)" strokeWidth="0.75"
          style={{ animation: "radar-ping 2s ease-out infinite" }} />
        <defs>
          <linearGradient id="sweep-grad" x1="60" y1="60" x2="60" y2="10" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="rgba(193,39,45,0.6)" />
            <stop offset="100%" stopColor="rgba(193,39,45,0)" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

/* ─── Welcome (no account or no bookings) ─── */
function WelcomeContent({ noAccount, onStart }: { noAccount: boolean; onStart: () => void }) {
  return (
    <div className="flex flex-col items-center py-6 sm:py-16">
      <div className="animate-float mb-2">
        <RadarIcon className="w-16 h-16 sm:w-24 sm:h-24" />
      </div>

      <h1 className="text-xl sm:text-3xl font-bold tracking-tight mb-1 text-center anim-in" style={{ animationDelay: "100ms" }}>
        Resy Bot <span className="text-resy-red">2.0</span>
      </h1>
      <p className="text-zinc-500 text-xs sm:text-sm max-w-xs sm:max-w-md text-center anim-in" style={{ animationDelay: "200ms" }}>
        Never miss a reservation again. Set your target and let the bot handle the rest.
      </p>

      {noAccount ? (
        <div className="mt-6 sm:mt-10 w-full max-w-md space-y-2.5 sm:space-y-3">
          <SetupStep num={1} title="Connect your Resy account" sub="Add your login to get started" done={false} href="/settings" delay={300} />
          <SetupStep num={2} title="Pick a restaurant & date" sub="Search any venue and choose your ideal time" done={false} delay={400} />
          <SetupStep num={3} title="Let the bot do its thing" sub="We'll book the instant an opening appears" done={false} delay={500} />
        </div>
      ) : (
        <div className="mt-6 sm:mt-8 w-full max-w-sm anim-in" style={{ animationDelay: "300ms" }}>
          <div className="glass rounded-xl p-4 flex items-center gap-3 border-green-500/20">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 bg-green-500/20 text-green-400 border border-green-500/30">✓</div>
            <div className="text-xs sm:text-sm text-green-400 font-medium">Resy account connected</div>
          </div>
        </div>
      )}

      <div className="anim-in mt-6 sm:mt-8 flex flex-col sm:flex-row items-center gap-3" style={{ animationDelay: noAccount ? "600ms" : "400ms" }}>
        {noAccount ? (
          <Link
            href="/settings"
            className="group inline-flex items-center gap-2 px-6 py-3 sm:px-8 sm:py-3.5 bg-gradient-to-r from-resy-red to-resy-red-light text-white rounded-2xl text-sm font-semibold shadow-lg shadow-resy-red/25 hover:shadow-resy-red/40 hover:brightness-110 transition-all"
          >
            Connect Resy Account
            <span className="group-hover:translate-x-0.5 transition-transform">→</span>
          </Link>
        ) : (
          <>
            <Link
              href="/snipes/new"
              onClick={onStart}
              className="group inline-flex items-center gap-2 px-6 py-3 sm:px-8 sm:py-3.5 bg-gradient-to-r from-resy-red to-resy-red-light text-white rounded-2xl text-sm font-semibold shadow-lg shadow-resy-red/25 hover:shadow-resy-red/40 hover:brightness-110 transition-all"
            >
              Start Booking
              <span className="group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
            <button
              onClick={onStart}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function SetupStep({ num, title, sub, done, href, delay }: {
  num: number; title: string; sub: string; done: boolean; href?: string; delay: number;
}) {
  const inner = (
    <div
      className={`glass rounded-xl p-3 sm:p-4 flex items-center gap-3 anim-in ${href ? "hover:border-zinc-500/50 cursor-pointer" : ""} ${done ? "border-green-500/20" : ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
        done ? "bg-green-500/20 text-green-400 border border-green-500/30" : "bg-white/5 text-zinc-500 border border-zinc-700/50"
      }`}>
        {done ? "✓" : num}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-xs sm:text-sm font-medium ${done ? "text-green-400" : "text-zinc-200"}`}>{title}</div>
        <div className="text-[10px] sm:text-xs text-zinc-500 mt-0.5">{sub}</div>
      </div>
      {href && <span className="text-zinc-600 shrink-0">›</span>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

/* ─── Dashboard (has data) ─── */
function DashboardContent({
  accounts, active, past, accountMap,
  cancelSnipe, runNow,
}: {
  accounts: Account[];
  active: Snipe[];
  past: Snipe[];
  accountMap: Record<number, Account>;
  cancelSnipe: (id: number) => void;
  runNow: (id: number) => void;
}) {
  return (
    <div className="space-y-6 sm:space-y-10">
      {/* Header */}
      <div className="flex items-end justify-between gap-3 anim-in">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-zinc-500 text-xs sm:text-sm mt-0.5 sm:mt-1">
            {active.length > 0
              ? `${active.length} booking${active.length > 1 ? "s" : ""} queued and ready`
              : "All quiet — ready for your next booking"}
          </p>
        </div>
        <Link
          href="/snipes/new"
          className="px-4 py-2 sm:px-5 sm:py-2.5 bg-gradient-to-r from-resy-red to-resy-red-light hover:brightness-110 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-resy-red/20 shrink-0"
        >
          + New
        </Link>
      </div>

      {/* Stats */}
      {past.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { val: past.filter((s) => s.status === "success").length, label: "Booked", color: "text-green-400" },
            { val: past.filter((s) => s.status === "failed").length, label: "Failed", color: "text-red-400" },
            {
              val: (() => {
                const s = past.filter((x) => x.status === "success").length;
                const f = past.filter((x) => x.status === "failed").length;
                return s + f > 0 ? `${Math.round((s / (s + f)) * 100)}%` : "—";
              })(),
              label: "Success Rate",
              color: "text-zinc-300",
            },
          ].map((stat, i) => (
            <div key={stat.label} className="glass rounded-xl p-3 sm:p-4 text-center anim-in" style={{ animationDelay: `${(i + 1) * 100}ms` }}>
              <div className={`text-lg sm:text-2xl font-bold tabular-nums ${stat.color}`}>{stat.val}</div>
              <div className="text-[10px] sm:text-[11px] text-zinc-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Active */}
      {active.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <h2 className="text-xs sm:text-sm font-semibold text-zinc-400 uppercase tracking-wider">Active ({active.length})</h2>
          </div>
          <div className="grid gap-3">
            {active.map((snipe, i) => (
              <div key={snipe.id} className="anim-in" style={{ animationDelay: `${(i + 1) * 80}ms` }}>
                <SnipeCard
                  snipe={snipe}
                  account={accountMap[snipe.account_id]}
                  accountCount={accounts.length}
                  onCancel={() => cancelSnipe(snipe.id)}
                  onRunNow={() => runNow(snipe.id)}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty active */}
      {active.length === 0 && (
        <div className="glass rounded-2xl p-6 sm:p-12 text-center anim-in" style={{ animationDelay: "400ms" }}>
          <div className="text-3xl sm:text-5xl mb-3 animate-float"><E>🎯</E></div>
          <div className="text-zinc-300 text-sm font-medium">No bookings queued</div>
          <div className="text-zinc-500 text-xs mt-1 mb-5">Your next reservation is one click away</div>
          <Link
            href="/snipes/new"
            className="inline-flex px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs sm:text-sm font-medium transition-all"
          >
            New Booking →
          </Link>
        </div>
      )}

      {/* History */}
      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs sm:text-sm font-semibold text-zinc-500 uppercase tracking-wider">History ({past.length})</h2>
          <div className="grid gap-2.5 sm:gap-3">
            {past.map((snipe) => (
              <SnipeCard key={snipe.id} snipe={snipe} account={accountMap[snipe.account_id]} accountCount={accounts.length} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ─── Countdown ─── */
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

/* ─── Main page ─── */
export default function Dashboard() {
  const [snipes, setSnipes] = useState<Snipe[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [splashDone, setSplashDone] = useState(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("resy_splash_done")) return true;
    return false;
  });
  const [showWelcome, setShowWelcome] = useState(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("resy_welcomed")) return false;
    return true;
  });

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
  const noAccount = accounts.length === 0;
  const isEmpty = active.length === 0 && past.length === 0;

  return (
    <>
      {/* Splash always plays on page load */}
      {!splashDone && <SplashOverlay onDone={() => { setSplashDone(true); sessionStorage.setItem("resy_splash_done", "1"); }} />}

      {/* Content renders underneath, revealed when splash fades */}
      <div className={`transition-opacity duration-500 ${splashDone ? "opacity-100" : "opacity-0"}`}>
        {loading ? (
          <div />
        ) : showWelcome ? (
          <WelcomeContent noAccount={noAccount} onStart={() => { setShowWelcome(false); sessionStorage.setItem("resy_welcomed", "1"); }} />
        ) : (
          <DashboardContent
            accounts={accounts}
            active={active}
            past={past}
            accountMap={accountMap}
            cancelSnipe={cancelSnipe}
            runNow={runNow}
          />
        )}
      </div>
    </>
  );
}

/* ─── Snipe card ─── */
function SnipeCard({
  snipe, account, accountCount, onCancel, onRunNow,
}: {
  snipe: Snipe; account?: Account; accountCount: number; onCancel?: () => void; onRunNow?: () => void;
}) {
  const prefs = JSON.parse(snipe.preferences) as Array<{ time: string; dining_type?: string }>;
  const isActive = ["scheduled", "armed", "running"].includes(snipe.status);
  const isResearch = snipe.mode === "research";
  let config = statusConfig[snipe.status] ?? statusConfig.cancelled;
  if (isResearch && snipe.status === "success") {
    config = { color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20", glow: "", icon: "🔬", label: "Complete" };
  }

  return (
    <div className={`glass rounded-xl p-3 sm:p-5 transition-all hover:border-zinc-600/50 ${isActive ? config.glow : ""}`}>
      <div className="flex flex-col gap-2.5 sm:gap-0 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 min-w-0">
          {/* Title */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-base sm:text-lg shrink-0"><E>{config.icon}</E></span>
            <Link
              href={`/snipes/${snipe.id}`}
              className="text-white font-semibold text-sm sm:text-lg hover:text-resy-red-light transition-colors truncate"
            >
              {snipe.venue_name}
            </Link>
            <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border shrink-0 ${config.bg} ${config.color} uppercase tracking-wide`}>
              {config.label}
            </span>
          </div>

          {/* Details */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm ml-7 sm:ml-9">
            <span className="text-zinc-300 font-medium">
              {new Date(snipe.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </span>
            {!isResearch && (
              <>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-400">Party of {snipe.party_size}</span>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-400">{prefs.map((p) => p.time).join(", ")}</span>
              </>
            )}
            {accountCount > 1 && account && (
              <>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-500 text-[10px]">{account.email}</span>
              </>
            )}
          </div>

          {/* Countdown */}
          {snipe.booking_window_start && isActive && (
            <div className="mt-2 ml-7 sm:ml-9 flex items-center gap-2">
              <span className="text-[10px] sm:text-xs text-zinc-500">Opens in</span>
              <span className={`text-xs sm:text-sm font-semibold ${config.color}`}><Countdown target={snipe.booking_window_start} /></span>
            </div>
          )}

          {snipe.reservation_id && (
            <div className="mt-2 ml-7 sm:ml-9 text-green-400 text-xs font-mono">Reservation #{snipe.reservation_id}</div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-1.5 sm:gap-2 ml-7 sm:ml-0 shrink-0">
          <Link href={`/snipes/${snipe.id}`} className="px-2.5 py-1.5 text-[10px] sm:text-xs bg-white/5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-all font-medium">
            Logs
          </Link>
          {isActive && onRunNow && snipe.status !== "running" && (
            <button onClick={onRunNow} className="px-2.5 py-1.5 text-[10px] sm:text-xs bg-purple-500/15 hover:bg-purple-500/25 text-purple-400 rounded-lg transition-all font-medium">
              Run Now
            </button>
          )}
          {isActive && onCancel && (
            <button onClick={onCancel} className="px-2.5 py-1.5 text-[10px] sm:text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400/80 hover:text-red-400 rounded-lg transition-all font-medium">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
