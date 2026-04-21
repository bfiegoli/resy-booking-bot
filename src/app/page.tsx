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

function BootSequence() {
  const [lines, setLines] = useState<string[]>([]);
  const bootLines = [
    "> Initializing Resy Bot 2.0...",
    "> Connecting to Resy API...",
    "> Loading accounts...",
    "> Scanning reservations...",
    "> Systems online.",
  ];

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      if (i < bootLines.length) {
        setLines((prev) => [...prev, bootLines[i]]);
        i++;
      } else {
        clearInterval(timer);
      }
    }, 200);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center justify-center py-16 sm:py-32">
      <div className="glass rounded-2xl p-5 sm:p-8 w-full max-w-md">
        <div className="flex items-center gap-1.5 sm:gap-2 mb-4">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500/80" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500/80" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500/80" />
          <span className="text-[10px] text-zinc-600 ml-2 font-mono">resy-bot v2.0</span>
        </div>
        <div className="font-mono text-[11px] sm:text-xs space-y-1.5">
          {lines.map((line, i) => (
            <div
              key={i}
              className={`animate-fade-in ${i === lines.length - 1 && lines.length === bootLines.length ? "text-green-400" : "text-zinc-400"}`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              {line}
              {i === lines.length - 1 && lines.length < bootLines.length && (
                <span className="inline-block w-2 h-3.5 bg-resy-red ml-0.5 animate-pulse" />
              )}
            </div>
          ))}
          {lines.length < bootLines.length && lines.length > 0 && (
            <span className="inline-block w-2 h-3.5 bg-resy-red animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}

function RadarIcon({ className }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 120 120" className="w-full h-full">
        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(193,39,45,0.15)" strokeWidth="1" />
        <circle cx="60" cy="60" r="35" fill="none" stroke="rgba(193,39,45,0.1)" strokeWidth="1" />
        <circle cx="60" cy="60" r="20" fill="none" stroke="rgba(193,39,45,0.08)" strokeWidth="1" />
        <circle cx="60" cy="60" r="3" fill="rgba(193,39,45,0.6)" />
        <line x1="60" y1="60" x2="60" y2="10" stroke="rgba(193,39,45,0.4)" strokeWidth="1.5" strokeLinecap="round"
          style={{ transformOrigin: "60px 60px", animation: "radar-sweep 3s linear infinite" }} />
        <circle cx="60" cy="60" r="8" fill="none" stroke="rgba(193,39,45,0.3)" strokeWidth="1"
          style={{ animation: "radar-ping 2s ease-out infinite" }} />
      </svg>
    </div>
  );
}

function WelcomeHero({ noAccount }: { noAccount: boolean }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 300),
      setTimeout(() => setStep(2), 600),
      setTimeout(() => setStep(3), 900),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-8 sm:py-20">
      {/* Radar animation */}
      <div className={`transition-all duration-700 ${step >= 1 ? "opacity-100 scale-100" : "opacity-0 scale-75"}`}>
        <RadarIcon className="w-20 h-20 sm:w-36 sm:h-36 mb-4 sm:mb-6" />
      </div>

      {/* Title */}
      <div className={`text-center transition-all duration-500 ${step >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight mb-1.5 sm:mb-2">
          Resy Bot <span className="text-resy-red">2.0</span>
        </h1>
        <p className="text-zinc-500 text-xs sm:text-base max-w-md mx-auto">
          Never miss a reservation again. Set your target and let the bot handle the rest.
        </p>
      </div>

      {/* Steps */}
      <div className={`mt-6 sm:mt-12 w-full max-w-lg transition-all duration-500 ${step >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        <div className="grid gap-2.5 sm:gap-4">
          <StepCard
            number={1}
            title={noAccount ? "Connect your Resy account" : "Connect your Resy account"}
            description={noAccount ? "Add your login credentials to get started" : "Account connected"}
            done={!noAccount}
            href="/settings"
            delay={0}
          />
          <StepCard
            number={2}
            title="Pick a restaurant & date"
            description="Search any venue on Resy and choose your ideal time"
            done={false}
            href={noAccount ? undefined : "/snipes/new"}
            delay={100}
          />
          <StepCard
            number={3}
            title="Let the bot do its thing"
            description="We'll watch for openings and book the instant one appears"
            done={false}
            delay={200}
          />
        </div>
      </div>

      {/* CTA */}
      <div className={`mt-6 sm:mt-10 transition-all duration-500 ${step >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        <Link
          href={noAccount ? "/settings" : "/snipes/new"}
          className="group relative inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-3.5 bg-gradient-to-r from-resy-red to-resy-red-light text-white rounded-2xl text-sm font-semibold transition-all shadow-lg shadow-resy-red/25 hover:shadow-resy-red/40 hover:brightness-110"
        >
          {noAccount ? "Connect Resy Account" : "Create Your First Booking"}
          <span className="group-hover:translate-x-0.5 transition-transform">→</span>
        </Link>
      </div>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
  done,
  href,
  delay,
}: {
  number: number;
  title: string;
  description: string;
  done: boolean;
  href?: string;
  delay: number;
}) {
  const content = (
    <div
      className={`glass rounded-xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4 transition-all animate-slide-up ${
        href ? "hover:border-zinc-500/50 cursor-pointer" : ""
      } ${done ? "border-green-500/20" : ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold shrink-0 ${
          done
            ? "bg-green-500/20 text-green-400 border border-green-500/30"
            : "bg-white/5 text-zinc-500 border border-zinc-700/50"
        }`}
      >
        {done ? <E>✓</E> : number}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-xs sm:text-sm font-medium ${done ? "text-green-400" : "text-zinc-200"}`}>
          {title}
        </div>
        <div className="text-[11px] sm:text-xs text-zinc-500 mt-0.5">{description}</div>
      </div>
      {href && (
        <span className="text-zinc-600 text-lg shrink-0">›</span>
      )}
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}

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

  const noAccount = accounts.length === 0;
  const isEmpty = active.length === 0 && past.length === 0;

  if (loading) {
    return <BootSequence />;
  }

  if (noAccount || isEmpty) {
    return <WelcomeHero noAccount={noAccount} />;
  }

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-zinc-500 text-sm mt-1">
            {active.length > 0
              ? `${active.length} booking${active.length > 1 ? "s" : ""} queued and ready`
              : "All quiet — ready for your next booking"}
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
          <div className="glass rounded-xl p-4 text-center animate-scale-in" style={{ animationDelay: "100ms" }}>
            <div className="text-2xl font-bold tabular-nums text-green-400">{past.filter((s) => s.status === "success").length}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Booked</div>
          </div>
          <div className="glass rounded-xl p-4 text-center animate-scale-in" style={{ animationDelay: "200ms" }}>
            <div className="text-2xl font-bold tabular-nums text-red-400">{past.filter((s) => s.status === "failed").length}</div>
            <div className="text-[11px] text-zinc-500 mt-1">Failed</div>
          </div>
          <div className="glass rounded-xl p-4 text-center animate-scale-in" style={{ animationDelay: "300ms" }}>
            <div className="text-2xl font-bold tabular-nums text-zinc-300">
              {past.filter((s) => s.status === "success").length + past.filter((s) => s.status === "failed").length > 0
                ? `${Math.round((past.filter((s) => s.status === "success").length / (past.filter((s) => s.status === "success").length + past.filter((s) => s.status === "failed").length)) * 100)}%`
                : "—"}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Success Rate</div>
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
                  accountCount={accounts.length}
                  onCancel={() => cancelSnipe(snipe.id)}
                  onRunNow={() => runNow(snipe.id)}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty Active State */}
      {active.length === 0 && (
        <div className="glass rounded-2xl p-8 sm:p-12 text-center animate-fade-in" style={{ animationDelay: "400ms" }}>
          <div className="text-4xl sm:text-5xl mb-4 animate-float"><E>🎯</E></div>
          <div className="text-zinc-300 font-medium">No bookings queued</div>
          <div className="text-zinc-500 text-sm mt-1 mb-6">
            Your next reservation is one click away
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
              <SnipeCard key={snipe.id} snipe={snipe} account={accountMap[snipe.account_id]} accountCount={accounts.length} />
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
  accountCount,
  onCancel,
  onRunNow,
}: {
  snipe: Snipe;
  account?: Account;
  accountCount: number;
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
            {accountCount > 1 && account && (
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
