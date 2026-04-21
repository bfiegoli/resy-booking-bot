"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { E } from "@/components/emoji";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError(true);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#09090b] flex items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="text-5xl mb-4"><E>🍽️</E></div>
          <h1 className="text-2xl font-bold tracking-tight">Maître d'</h1>
          <p className="text-zinc-500 text-sm mt-1.5">Enter password to continue</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="input text-center text-lg tracking-widest"
          />
          {error && (
            <div className="text-red-400 text-sm text-center">Wrong password</div>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3.5 rounded-xl font-semibold bg-gradient-to-r from-resy-red to-resy-red-light hover:brightness-110 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-resy-red/20"
          >
            {loading ? "..." : "Enter"}
          </button>
        </form>
      </div>
    </div>
  );
}
