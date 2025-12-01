import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import {
  Container,
  SectionHeader,
  SearchInput,
  normalizeRequests,
  firstArrayFrom,
  errorMessage,
} from "../lib/ui";
import type { RequestItem } from "../lib/ui";

export default function HomePage() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState<RequestItem[]>([]);
  const [newSubmissions, setNewSubmissions] = useState<RequestItem[]>([]);
  const [qProgress, setQProgress] = useState<string>("");
  const [qNew, setQNew] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const r = await api<unknown>("/requests");
        const norm = normalizeRequests(firstArrayFrom(r));
        setProgress(norm.filter((x) => (x.status || "").toLowerCase().includes("progress")));
        setNewSubmissions(norm.filter((x) => (x.status || "").toLowerCase().includes("new")));
      } catch (e: unknown) {
        setErr(errorMessage(e) || "Failed to load requests");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filteredProgress = useMemo(
    () =>
      progress.filter((r) =>
        (r.lastFirst || "").toLowerCase().includes(qProgress.toLowerCase())
      ),
    [progress, qProgress],
  );
  const filteredNew = useMemo(
    () =>
      newSubmissions.filter((r) =>
        (r.lastFirst || "").toLowerCase().includes(qNew.toLowerCase())
      ),
    [newSubmissions, qNew],
  );

  return (
    <main className="py-10">
      <Container>
        {/* In Progress */}
        <section className="rounded-2xl border p-5">
          <SectionHeader title="In Progress">
            <SearchInput
              value={qProgress}
              onChange={setQProgress}
              placeholder="Search students (In Progress)"
            />
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
                    <th className="py-2 pr-4">Student (Last, First)</th>
                    <th className="py-2 pr-4">Date Submitted</th>
                    <th className="py-2 pr-4">Last Edited</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProgress.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-zinc-50">
                      <td className="py-2 pr-4">
                        <Link
                          to={`/advising/request/${r.id}`}
                          className="text-amber-800 hover:underline dark:text-amber-300"
                        >
                          {r.lastFirst}
                        </Link>
                      </td>
                      <td className="py-2 pr-4">{r.submitted || "—"}</td>
                      <td className="py-2 pr-4">{r.edited || "—"}</td>
                    </tr>
                  ))}
                  {filteredProgress.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-3 text-zinc-500">
                        No matches.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* New Submissions */}
        <section className="mt-8 rounded-2xl border p-5">
          <SectionHeader title="New Submissions">
            <SearchInput
              value={qNew}
              onChange={setQNew}
              placeholder="Search students (New Submissions)"
            />
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
                    <th className="py-2 pr-4">Student (Last, First)</th>
                    <th className="py-2 pr-4">Date Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNew.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-zinc-50">
                      <td className="py-2 pr-4">
                        <Link
                          to={`/advising/request/${r.id}`}
                          className="text-amber-800 hover:underline dark:text-amber-300"
                        >
                          {r.lastFirst}
                        </Link>
                      </td>
                      <td className="py-2 pr-4">{r.submitted || "—"}</td>
                    </tr>
                  ))}
                  {filteredNew.length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-3 text-zinc-500">
                        No matches.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Open new advising case */}
        <div className="mt-8 flex items-center justify-end">
          <button
            onClick={() => navigate("/records")}
            className="rounded-2xl border border-black bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-black shadow hover:bg-zinc-200"
          >
            Open New Advising Case
          </button>
        </div>
      </Container>
    </main>
  );
}