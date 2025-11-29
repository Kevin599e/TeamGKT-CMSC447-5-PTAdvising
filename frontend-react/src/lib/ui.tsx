/* eslint-disable react-refresh/only-export-components */
import React from "react";

export type Tone = "green" | "amber" | "zinc";

type ContainerProps = { children: React.ReactNode };
type BadgeProps = { children: React.ReactNode; tone?: Tone };
type SectionHeaderProps = { title: string; children?: React.ReactNode };
type SearchInputProps = {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
};

export type RequestItem = {
  id: number;
  lastFirst: string;
  email?: string;
  inst?: string;
  submitted?: string;
  edited?: string;
  status?: string;
};

export function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

export function normalizeRequests(items: unknown): RequestItem[] {
  if (!Array.isArray(items)) return [];
  return (items as Array<Record<string, unknown>>).map((rec) => {
    const idRaw = (rec["id"] ?? rec["request_id"] ?? rec["pk"] ?? Math.random()) as number | string;
    const id = Number.isFinite(Number(idRaw))
      ? Number(idRaw)
      : Math.floor(Number(idRaw as number) * 1e6) || Math.floor(Math.random() * 1e9);
    const lastFirst =
      (rec["lastFirst"] ??
        rec["last_first"] ??
        rec["student_name"] ??
        rec["name"] ??
        (rec["last_name"] && rec["first_name"]
          ? `${String(rec["last_name"])}, ${String(rec["first_name"])}`
          : "Unknown")) as string;

    return {
      id,
      lastFirst: String(lastFirst),
      email: (rec["email"] ?? rec["student_email"] ?? rec["contact_email"] ?? "") as string,
      inst: (rec["inst"] ?? rec["institutional_email"] ?? rec["institution_email"] ?? "") as string,
      submitted: (rec["submitted"] ?? rec["submitted_at"] ?? rec["created_at"] ?? rec["created"] ?? "") as string,
      edited: (rec["edited"] ?? rec["updated_at"] ?? rec["modified_at"] ?? "") as string,
      status: (rec["status"] ?? rec["completion"] ?? rec["state"] ?? "In Progress") as string,
    } as RequestItem;
  });
}

// robustly extract the first array from a possibly-nested API response
export function firstArrayFrom(obj: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(obj)) return obj as Array<Record<string, unknown>>;
  if (obj && typeof obj === "object") {
    const rec = obj as Record<string, unknown>;
    const candidates = [
      rec["items"],
      rec["data"],
      rec["results"],
      typeof rec["data"] === "object" && (rec["data"] as Record<string, unknown>)["items"],
    ];
    for (const c of candidates) if (Array.isArray(c)) return c as Array<Record<string, unknown>>;
    for (const v of Object.values(rec)) if (Array.isArray(v)) return v as Array<Record<string, unknown>>;
  }
  return [];
}

// ---- Small UI helpers ---- //

export function Container({ children }: ContainerProps) {
  return <div className="container mx-auto max-w-6xl px-4">{children}</div>;
}

export function Badge({ children, tone = "zinc" }: BadgeProps) {
  const map: Record<Tone, string> = {
    green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300",
    zinc: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[tone]}`}>
      {children}
    </span>
  );
}

export function SectionHeader({ title, children }: SectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  return (
    <input
      value={value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-black bg-zinc-100 px-3 py-2 text-sm text-black placeholder-zinc-600 outline-none focus:ring-2 focus:ring-amber-400 sm:w-72"
    />
  );
}