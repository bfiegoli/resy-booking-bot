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
  const [menuOpen, setMenuOpen] = useState(false);

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

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <nav className="border-b border-zinc-800/50 sticky top-0 z-50 glass">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 flex items-center h-12 sm:h-14 justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <span className="text-xl sm:text-2xl"><E>🍽️</E></span>
            <span className="text-sm sm:text-lg font-bold tracking-tight text-white group-hover:text-resy-red-light transition-colors">
              Maître d&apos;
            </span>
            {activeCount > 0 && (
              <span className="ml-0.5 sm:ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-green-500/20 text-green-400 rounded-full border border-green-500/30 tabular-nums">
                {activeCount}
              </span>
            )}
          </Link>

          {/* Desktop links */}
          <div className="hidden sm:flex gap-1">
            {links.map(({ href, label, icon }) => {
              const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                    active
                      ? "bg-white/10 text-white"
                      : "text-zinc-500 hover:text-zinc-200 hover:bg-white/5"
                  }`}
                >
                  <span className="text-xs"><E>{icon}</E></span>
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Hamburger (mobile) */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="sm:hidden flex flex-col gap-[5px] p-2 -mr-2"
            aria-label="Menu"
          >
            <span className={`block w-5 h-[1.5px] bg-zinc-400 transition-all duration-200 ${menuOpen ? "rotate-45 translate-y-[6.5px]" : ""}`} />
            <span className={`block w-5 h-[1.5px] bg-zinc-400 transition-all duration-200 ${menuOpen ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-[1.5px] bg-zinc-400 transition-all duration-200 ${menuOpen ? "-rotate-45 -translate-y-[6.5px]" : ""}`} />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 sm:hidden" onClick={() => setMenuOpen(false)} />
          <div className="fixed top-12 left-0 right-0 z-40 sm:hidden glass border-b border-zinc-800/50 animate-slide-down">
            <div className="max-w-6xl mx-auto px-3 py-2 flex flex-col">
              {links.map(({ href, label, icon }) => {
                const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`px-3 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3 ${
                      active
                        ? "bg-white/10 text-white"
                        : "text-zinc-400 active:bg-white/5"
                    }`}
                  >
                    <span className="text-base"><E>{icon}</E></span>
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
