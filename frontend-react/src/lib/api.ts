// src/lib/api.ts
const API_BASE = "/api"; // vite.config.ts proxy sends this to http://127.0.0.1:5000

export async function api(path: string, method = "GET", data?: any) {
  const opts: RequestInit = {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  };
  if (data) opts.body = JSON.stringify(data);

  const res = await fetch(`${API_BASE}${path}`, opts);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || res.statusText || "Request failed");
  return json;
}