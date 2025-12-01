import React, { useEffect, useState } from "react";
import { Container, errorMessage, firstArrayFrom } from "../lib/ui";
import { api } from "../lib/api";

interface NewRequestForm {
  student_name: string;
  student_email: string;
  source_institution: string;
  target_program: string;
}

interface RequestItem {
  id: number;
  student_name: string;
  student_email: string;
  source_institution: string;
  target_program?: string | null;

  // Optional fields (nice to have from backend)
  latest_packet_status?: "draft" | "finalized" | string | null;
  latest_packet_updated_at?: string | null;
  created_at?: string | null;
}

export default function AdvisingCasePage() {
  const [form, setForm] = useState<NewRequestForm>({
    student_name: "",
    student_email: "",
    source_institution: "",
    target_program: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loadingReq, setLoadingReq] = useState(false);
  const [errReq, setErrReq] = useState<string | null>(null);

  // ---------- Load all requests ----------
  async function loadRequests() {
    setLoadingReq(true);
    setErrReq(null);
    try {
      const res = await api<unknown>("/requests");
      const arr = firstArrayFrom(res);
      const mapped: RequestItem[] = arr.map((r: any) => ({
        id: Number(r.id ?? r.request_id),
        student_name: String(r.student_name ?? ""),
        student_email: String(r.student_email ?? ""),
        source_institution: String(r.source_institution ?? ""),
        target_program: r.target_program ? String(r.target_program) : "",

        latest_packet_status: (r.latest_packet_status as any) ?? null,
        latest_packet_updated_at: (r.latest_packet_updated_at as string) ?? null,
        created_at: (r.created_at as string) ?? null,
      }));

      // Backend already orders by created_at DESC, but we can enforce it too:
      mapped.sort((a, b) => {
        const ta = a.latest_packet_updated_at || a.created_at || "";
        const tb = b.latest_packet_updated_at || b.created_at || "";
        return (tb || "").localeCompare(ta || "");
      });

      setRequests(mapped);
    } catch (e) {
      setErrReq(errorMessage(e));
    } finally {
      setLoadingReq(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  // ---------- Helpers ----------
  function onFormChange<K extends keyof NewRequestForm>(
    key: K,
    value: NewRequestForm[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function formatDateTime(s?: string | null): string {
    if (!s) return "–";
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s; // fallback raw
    return d.toLocaleString();
  }

  function packetStatusLabel(r: RequestItem): string {
    if (!r.latest_packet_status) return "No packet yet";
    if (r.latest_packet_status === "draft") return "Drafted";
    if (r.latest_packet_status === "finalized") return "Finalized";
    return r.latest_packet_status;
  }

  function packetStatusBadgeClass(r: RequestItem): string {
    const status = r.latest_packet_status;
    if (!status) return "bg-zinc-100 text-zinc-700 border-zinc-200";
    if (status === "draft") return "bg-amber-100 text-amber-800 border-amber-200";
    if (status === "finalized") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    return "bg-zinc-100 text-zinc-700 border-zinc-200";
  }

  // ---------- Submit new request ----------
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.student_name.trim() || !form.student_email.trim()) {
      alert("Student name and email are required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        student_name: form.student_name.trim(),
        student_email: form.student_email.trim(),
        source_institution: form.source_institution.trim(),
        target_program: form.target_program.trim(),
      };

      await api<{ id: number }>("/requests", "POST", payload);
      alert("Advising case / student request created.");

      // Clear form
      setForm({
        student_name: "",
        student_email: "",
        source_institution: "",
        target_program: "",
      });

      // Reload list so the new one appears at the top
      await loadRequests();
    } catch (err) {
      alert(errorMessage(err) || "Failed to create request");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="py-10">
      <Container>
        <section className="rounded-2xl border bg-white p-6 dark:bg-zinc-900">
          <h1 className="text-xl font-semibold tracking-tight">Advising Cases</h1>
          <p className="mt-2 text-sm !text-zinc-800">
            Create a new advising case (student request) and view all existing ones.
          </p>
          {/* Create new case / request */}
          <form
            className="mt-6 grid gap-4 rounded-2xl border bg-zinc-50 p-4 dark:bg-zinc-950"
            onSubmit={handleSubmit}
          >
            <h2 className="text-sm text-yellow-400 font-semibold">Create New Advising Case</h2>

            {/* Student name + email */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label className="text-sm  text-black dark:text-white font-medium" htmlFor="student_name">
                  Student Name
                </label>
                <input
                  id="student_name"
                  value={form.student_name}
                  onChange={(e) => onFormChange("student_name", e.target.value)}
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-amber-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                  placeholder="e.g. Jane Doe"
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm  text-black dark:text-white font-medium" htmlFor="student_email">
                  Student Email
                </label>
                <input
                  id="student_email"
                  type="email"
                  value={form.student_email}
                  onChange={(e) => onFormChange("student_email", e.target.value)}
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-amber-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                  placeholder="student@example.edu"
                />
              </div>
            </div>

            {/* Institution + target program */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label className="text-sm text-black dark:text-white font-medium" htmlFor="source_institution">
                  Source Institution
                </label>
                <input
                  id="source_institution"
                  value={form.source_institution}
                  onChange={(e) => onFormChange("source_institution", e.target.value)}
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-amber-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                  placeholder="e.g. Community College"
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm  text-black dark:text-white font-medium" htmlFor="target_program">
                  Intended UMBC Program
                </label>
                <input
                  id="target_program"
                  value={form.target_program}
                  onChange={(e) => onFormChange("target_program", e.target.value)}
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-amber-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                  placeholder="e.g. Computer Science B.S."
                />
              </div>
            </div>

            <div className="mt-2 flex justify-end gap-3">
              <button
                type="submit"
                className="rounded-xl border border-black bg-yellow-400 px-3 py-2 text-sm font-semibold text-black hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={submitting}
              >
                {submitting ? "Creating…" : "Create Advising Case"}
              </button>
            </div>
          </form>

          {/* Existing cases / requests */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Existing Advising Cases</h2>
              {loadingReq && (
                <span className="text-xs text-zinc-500">Loading…</span>
              )}
            </div>

            {errReq && (
              <p className="mt-2 text-sm text-red-600">
                {errReq}
              </p>
            )}

            {!loadingReq && !errReq && requests.length === 0 && (
              <p className="mt-2 text-sm !text-zinc-800">
                No advising cases yet. Create one using the form above.
              </p>
            )}

            {requests.length > 0 && (
              <div className="mt-3 overflow-x-auto rounded-2xl border">
                <table className="min-w-full divide-y divide-zinc-200 text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-900">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-600">
                        ID
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-600">
                        Student
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-600">
                        Institution
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-600">
                        Program
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-600">
                        Packet Status
                      </th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-600">
                        Last Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 bg-white dark:bg-zinc-950">
                    {requests.map((r) => (
                      <tr key={r.id}>
                        <td className="px-3 py-2 text-xs text-zinc-800 dark:text-zinc-100">
                          #{r.id}
                        </td>
                        <td className="px-3 py-2 text-xs text-zinc-800 dark:text-zinc-100">
                          <div className="font-medium">
                            {r.student_name || "—"}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {r.student_email || "—"}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs text-zinc-800 dark:text-zinc-100">
                          {r.source_institution || "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-zinc-800 dark:text-zinc-100">
                          {r.target_program || "—"}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${packetStatusBadgeClass(
                              r,
                            )}`}
                          >
                            {packetStatusLabel(r)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-zinc-800 dark:text-zinc-100">
                          {formatDateTime(
                            r.latest_packet_updated_at || r.created_at,
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </Container>
    </main>
  );
}
