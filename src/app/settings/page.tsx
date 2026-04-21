"use client";

import { useEffect, useState } from "react";
import { E } from "@/components/emoji";

type Account = {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_default: number;
  created_at: string;
};

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadAccounts = () => {
    fetch("/api/auth").then((r) => r.json()).then((d) => setAccounts(d.accounts ?? []));
  };

  useEffect(() => { loadAccounts(); }, []);

  const addAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error ?? "Login failed"); return; }
    setSuccess(`Authenticated as ${data.account.first_name ?? email}`);
    setEmail("");
    setPassword("");
    loadAccounts();
  };

  const removeAccount = async (id: number) => {
    setError("");
    const res = await fetch("/api/auth", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error); return; }
    loadAccounts();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-zinc-500 text-sm mt-1">Manage your Resy accounts and configuration</p>
      </div>

      {/* Accounts */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span><E>👤</E></span>
          <h2 className="text-lg font-semibold text-zinc-200">Resy Accounts</h2>
          <span className="text-xs text-zinc-600">{accounts.length} connected</span>
        </div>

        {accounts.length > 0 ? (
          <div className="space-y-2">
            {accounts.map((acc) => (
              <div key={acc.id} className="glass rounded-xl px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-resy-red/30 to-purple-500/30 flex items-center justify-center text-sm font-bold text-white border border-white/10">
                    {(acc.first_name?.[0] ?? acc.email[0]).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-medium">
                        {acc.first_name} {acc.last_name}
                      </span>
                      {acc.is_default === 1 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-500/15 text-blue-400 rounded border border-blue-500/20">
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500">{acc.email}</div>
                  </div>
                </div>
                <button
                  onClick={() => removeAccount(acc.id)}
                  className="text-xs text-zinc-600 hover:text-red-400 px-3 py-1.5 hover:bg-red-500/10 rounded-lg transition-all"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass rounded-xl p-10 text-center">
            <div className="text-3xl mb-3"><E>🔑</E></div>
            <div className="text-zinc-400 font-medium">No accounts connected</div>
            <div className="text-zinc-600 text-sm mt-1">Add your Resy login below to get started</div>
          </div>
        )}

        <form onSubmit={addAccount} className="glass rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <span><E>➕</E></span> Add Account
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="email"
              placeholder="Resy email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-gradient-to-r from-resy-red to-resy-red-light hover:brightness-110 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-resy-red/20"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </span>
              ) : (
                "Connect Account"
              )}
            </button>
            {error && <span className="text-red-400 text-sm flex items-center gap-1"><E>💥</E> {error}</span>}
            {success && <span className="text-green-400 text-sm flex items-center gap-1"><E>✅</E> {success}</span>}
          </div>
          <p className="text-[11px] text-zinc-600">
            <E>🔒</E> Your password is sent directly to Resy over HTTPS and never stored. Only the auth token is saved (encrypted AES-256-GCM).
          </p>
        </form>
      </section>

      {/* System */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span><E>⚙️</E></span>
          <h2 className="text-lg font-semibold text-zinc-200">System</h2>
        </div>
        <div className="glass rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Resy API Key</span>
            <div className="flex items-center gap-2">
              <code className="text-xs text-zinc-400 bg-zinc-800/80 px-2 py-1 rounded-lg font-mono">
                VbWk7s3L...7n5
              </code>
              <span className="w-2 h-2 rounded-full bg-green-500" title="Active" />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Encryption</span>
            <span className="text-xs text-zinc-400">AES-256-GCM</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-400">Scheduler</span>
            <span className="text-xs text-zinc-400">Local (setTimeout) + Vercel Cron ready</span>
          </div>
        </div>
      </section>
    </div>
  );
}
