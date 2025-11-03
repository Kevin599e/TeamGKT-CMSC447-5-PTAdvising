// src/lib/api.ts — strict typing, no 'any'

// Read from Vite env or fall back to proxy "/api"
const { VITE_API_BASE, DEV } = import.meta.env;
const API_BASE = VITE_API_BASE && VITE_API_BASE.length > 0 ? VITE_API_BASE : "/api";

function log(...args: unknown[]) {
  if (DEV) {
    // Using console.debug intentionally in dev
    console.debug("[api]", ...args);
  }
}

export async function api<
  R = unknown,
  T extends Record<string, unknown> = Record<string, unknown>
>(path: string, method: string = "GET", data?: T): Promise<R> {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  const opts: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  };

  if (data && method.toUpperCase() !== "GET") {
    opts.body = JSON.stringify(data);
  }

  log(method, url, data ?? "");

  const res = await fetch(url, opts);

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // ignore non-JSON or empty bodies (e.g., 204)
  }

  if (!res.ok) {
    let message = res.statusText || `HTTP ${res.status}`;
    if (json && typeof json === "object") {
      const rec = json as Record<string, unknown>;
      if (typeof rec.error === "string" && rec.error.length > 0) message = rec.error;
      else if (typeof rec.detail === "string" && rec.detail.length > 0) message = rec.detail;
    }
    log("error", method, url, message, json);
    throw new Error(message);
  }

  return json as R;
}