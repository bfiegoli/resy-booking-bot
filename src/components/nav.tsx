"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { E } from "@/components/emoji";

const links = [
  { href: "/", label: "Dashboard", icon: "🎯" },
  { href: "/discover", label: "Discover", icon: "🔍" },
  { href: "/snipes/new", label: "New Booking", icon: "➕" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function Nav() {
  const pathname = usePathname();
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    fetch("/api/snipes?status=armed")
      .then((r) => r.json())
      .then((d) => setActiveCount(d.snipes?.length ?? 0))
      .catch(() => {});
    const i = setInterval(() => {
      fetch("/api/snipes?status=armed")
        .then((r) => r.json())
        .then((d) => setActiveCount(d.snipes?.length ?? 0))
        .catch(() => {});
    }, 10000);
    return () => clearInterval(i);
  }, []);

  return (
    <nav className="border-b border-zinc-800/50 sticky top-0 z-50 glass">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 flex items-center h-14 justify-between">
        <div className="flex items-center gap-3 sm:gap-8">
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <span className="text-2xl"><E>🍽️</E></span>
            <span className="text-base sm:text-lg font-bold tracking-tight text-white group-hover:text-resy-red-light transition-colors hidden sm:inline">
              Resy Bot 2.0
            </span>
            {activeCount > 0 && (
              <span className="ml-0.5 sm:ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-green-500/20 text-green-400 rounded-full border border-green-500/30 tabular-nums">
                {activeCount}
              </span>
            )}
          </Link>
          <div className="flex gap-0.5 sm:gap-1">
            {links.map(({ href, label, icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1 sm:gap-1.5 ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
                  }`}
                >
                  <span className="text-xs"><E>{icon}</E></span>
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
