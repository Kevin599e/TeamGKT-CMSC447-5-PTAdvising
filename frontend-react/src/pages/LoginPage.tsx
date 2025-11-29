import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { Container } from "../lib/ui";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      await api("/auth/login", "POST", { email, password });
      try {
        await api("/auth/me");
      } catch {
        /* ignore */
      }
      navigate("/", { replace: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErr(msg || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="py-10">
      <Container>
        <section className="mx-auto max-w-md rounded-2xl border p-6">
          <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Admin or Advisor credentials
          </p>
          <form onSubmit={onSubmit} className="mt-6 grid gap-4">
            <div className="grid gap-1.5">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-amber-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                required
              />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-amber-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                required
              />
            </div>
            {err && <div className="text-sm text-red-600">{err}</div>}
            <button
              disabled={loading}
              className="rounded-xl border border-black bg-zinc-100 px-3 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </section>
      </Container>
    </main>
  );
}