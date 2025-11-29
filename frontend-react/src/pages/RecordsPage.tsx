import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import {
  Badge,
  Container,
  SectionHeader,
  SearchInput,
  normalizeRequests,
  firstArrayFrom,
  errorMessage,
} from "../lib/ui";

// Local types – no runtime imports needed
type Tone = "zinc" | "green" | "amber";

interface RequestItem {
  id: number;
  lastFirst: string;
  email?: string | null;
  inst?: string | null;
  submitted?: string | null;
  edited?: string | null;
  status?: string | null;
}

const statusTone = (s: string): Tone =>
  s === "Completed" ? "green" : s === "New Submission" ? "amber" : "zinc";

export default function RecordsPage() {
  const [records, setRecords] = useState<RequestItem[]>([]);
  const [q, setQ] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const r = await api<unknown>("/requests");
        const norm = normalizeRequests(firstArrayFrom(r));
        setRecords(norm);
      } catch (e: unknown) {
        setErr(errorMessage(e) || "Failed to load records");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const t = q.toLowerCase();
    return records.filter(
      (r) =>
        (r.lastFirst || "").toLowerCase().includes(t) ||
        (r.email || "").toLowerCase().includes(t) ||
        (r.inst || "").toLowerCase().includes(t),
    );
  }, [records, q]);

  return (
    <main className="py-10">
      <Container>
        <section className="rounded-2xl border p-5">
          <SectionHeader title="Records">
            <SearchInput value={q} onChange={setQ} placeholder="Search by name or email" />
          </SectionHeader>
          <div className="mt-4 overflow-x-auto">
            {loading ? (
              <div className="py-6 text-sm text-zinc-600">Loading…</div>
            ) : err ? (
              <div className="py-6 text-sm text-red-600">{err}</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b bg-zinc-50 text-xs uppercase text-zinc-700">
                    <th className="py-2 pr-4">Name (Last, First)</th>
                    <th className="py-2 pr-4">Student Email</th>
                    <th className="hidden py-2 pr-4 md:table-cell">Institutional Email</th>
                    <th className="py-2 pr-4">Date Submitted</th>
                    <th className="py-2 pr-4">Last Date Edited</th>
                    <th className="py-2 pr-4">Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-zinc-50">
                      <td className="py-2 pr-4">
                        <Link
                          to={`/advising/request/${r.id}`}
                          className="text-amber-800 hover:underline dark:text-amber-300"
                        >
                          {r.lastFirst}
                        </Link>
                      </td>
                      <td className="py-2 pr-4">{r.email || "—"}</td>
                      <td className="hidden py-2 pr-4 md:table-cell">{r.inst || "—"}</td>
                      <td className="py-2 pr-4">{r.submitted || "—"}</td>
                      <td className="py-2 pr-4">{r.edited || "—"}</td>
                      <td className="py-2 pr-4">
                        <Badge tone={statusTone(r.status ?? "")}>{r.status ?? "—"}</Badge>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-3 text-zinc-500">
                        No records.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </Container>
    </main>
  );
}