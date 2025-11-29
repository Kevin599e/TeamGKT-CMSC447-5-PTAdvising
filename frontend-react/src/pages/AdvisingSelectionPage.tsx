import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { Container, errorMessage, firstArrayFrom } from "../lib/ui";

type TemplateItem = { id: number; name: string };

interface BuilderSection {
  template_section_id: number;
  title: string;
  section_type?: string;
  display_order?: number;
  optional?: boolean;
  is_default?: boolean;
}

interface FormState {
  first: string;
  last: string;
  email: string;
  inst: string;
  major: string;
}

export default function AdvisingSelectionPage() {
  const params = useParams();
  const initialRequestId = params.requestId ? Number(params.requestId) : null;
  const [requestId, setRequestId] = useState<number | null>(initialRequestId);
  const [packetId, setPacketId] = useState<number | null>(null);

  const [form, setForm] = useState<FormState>({ first: "", last: "", email: "", inst: "", major: "" });

  // ---- Templates & Sections from backend ----
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [sections, setSections] = useState<BuilderSection[]>([]);
  const [selectedSections, setSelectedSections] = useState<number[]>([]);
  const [loadingTpl, setLoadingTpl] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);
  const [errTpl, setErrTpl] = useState<string | null>(null);

  useEffect(() => {
    // load available templates on mount
    (async () => {
      setLoadingTpl(true);
      setErrTpl(null);
      try {
        const res = await api<unknown>("/templates");
        const arr = firstArrayFrom(res);
        const mapped = arr.map((t) => ({
          id: Number(t["id"] ?? t["template_id"]),
          name: String(t["name"] ?? t["title"] ?? "Template"),
        }));
        setTemplates(mapped);
        if (!templateId && mapped[0]) setTemplateId(mapped[0].id);
      } catch (e) {
        setErrTpl(errorMessage(e));
      } finally {
        setLoadingTpl(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // load sections for the chosen template
    if (!templateId) {
      setSections([]);
      setSelectedSections([]);
      return;
    }
    (async () => {
      setLoadingSections(true);
      try {
        const res = await api<Record<string, unknown>>(`/templates/${templateId}/builder`);
        const arr = firstArrayFrom((res as Record<string, unknown>)["sections"] ?? res);
        const mapped: BuilderSection[] = arr.map((rec) => ({
          template_section_id: Number((rec["template_section_id"] ?? rec["id"]) as number),
          title: String((rec["title"] ?? rec["name"] ?? "Section") as string),
          section_type: rec["section_type"] as string | undefined,
          display_order: Number((rec["display_order"] ?? 0) as number),
          optional: Boolean((rec["optional"] ?? false) as boolean),
          is_default: Boolean((rec["is_default"] ?? false) as boolean),
        }));
        // sort and preselect defaults + all non-optional
        mapped.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
        setSections(mapped);
        setSelectedSections([
          ...mapped.filter((s) => !s.optional).map((s) => s.template_section_id),
          ...mapped.filter((s) => s.optional && s.is_default).map((s) => s.template_section_id),
        ]);
      } finally {
        setLoadingSections(false);
      }
    })();
  }, [templateId]);

  function toggleSection(id: number) {
    setSelectedSections((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <main className="py-10">
      <Container>
        <section className="rounded-2xl border p-6">
          <h1 className="text-xl font-semibold tracking-tight">Advising Selection</h1>
          <div className="mt-1 text-xs text-zinc-500">
            {requestId && (
              <span className="mr-3">
                Request ID: <strong className="text-zinc-700">{requestId}</strong>
              </span>
            )}
            {packetId && (
              <span>
                Packet ID: <strong className="text-zinc-700">{packetId}</strong>
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
            Fill in student details. Major selection will show example prompts (demo only).
          </p>

          <form className="mt-6 grid gap-5">
            {/* Name */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label htmlFor="first" className="text-sm font-medium">
                  First Name
                </label>
                <input
                  id="first"
                  value={form.first}
                  onChange={(e) => setForm({ ...form, first: e.target.value })}
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-amber-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="last" className="text-sm font-medium">
                  Last Name
                </label>
                <input
                  id="last"
                  value={form.last}
                  onChange={(e) => setForm({ ...form, last: e.target.value })}
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-amber-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                />
              </div>
            </div>

            {/* Emails */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label htmlFor="email" className="text-sm font-medium">
                  Student Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-amber-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="inst" className="text-sm font-medium">
                  Student Institutional Email
                </label>
                <input
                  id="inst"
                  type="email"
                  value={form.inst}
                  onChange={(e) => setForm({ ...form, inst: e.target.value })}
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-amber-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                />
              </div>
            </div>

            {/* Major */}
            <div className="grid gap-1.5">
              <label htmlFor="major" className="text-sm font-medium">
                Intended Major
              </label>
              <select
                id="major"
                value={form.major}
                onChange={(e) => setForm({ ...form, major: e.target.value })}
                className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-amber-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
              >
                <option value="">Select a major…</option>
                <option value="general">General</option>
              </select>
            </div>

            {/* Sections from selected template */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Template & Sections</label>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-500">Selected: {selectedSections.length}</span>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-xs text-zinc-500">Template</label>
                  <select
                    value={templateId ?? ""}
                    onChange={(e) => setTemplateId(e.target.value ? Number(e.target.value) : null)}
                    className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="" disabled>
                      {loadingTpl
                        ? "Loading templates…"
                        : errTpl
                        ? `Error: ${errTpl}`
                        : "Select a template"}
                    </option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className="text-xs text-zinc-500">Quick actions</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="rounded border border-black bg-zinc-100 px-2 py-1 text-xs"
                      onClick={() =>
                        setSelectedSections(sections.filter((s) => !s.optional).map((s) => s.template_section_id))
                      }
                    >
                      Required only
                    </button>
                    <button
                      type="button"
                      className="rounded border border-black bg-zinc-100 px-2 py-1 text-xs"
                      onClick={() => setSelectedSections(sections.map((s) => s.template_section_id))}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="rounded border border-black bg-zinc-100 px-2 py-1 text-xs"
                      onClick={() =>
                        setSelectedSections(
                          sections
                            .filter((s) => s.optional && s.is_default)
                            .map((s) => s.template_section_id),
                        )
                      }
                    >
                      Defaults
                    </button>
                    <button
                      type="button"
                      className="rounded border border-black bg-zinc-100 px-2 py-1 text-xs"
                      onClick={() => setSelectedSections([])}
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border p-4">
                {loadingSections ? (
                  <p className="text-sm text-zinc-700">Loading sections…</p>
                ) : sections.length === 0 ? (
                  <p className="text-sm text-zinc-700">Choose a template to view sections.</p>
                ) : (
                  <ul className="space-y-2">
                    {sections.map((s) => (
                      <li
                        key={s.template_section_id}
                        className="flex items-center justify-between gap-3 rounded-xl border p-3"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{s.title}</div>
                          <div className="text-xs text-zinc-500">
                            {s.section_type || "section"}
                            {s.optional ? " • optional" : " • required"}
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedSections.includes(s.template_section_id)}
                          onChange={() => toggleSection(s.template_section_id)}
                          className="size-4 rounded border-zinc-400 text-amber-600 focus:ring-amber-400"
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-2 flex flex-wrap justify-end gap-3">
              <button
                className="rounded-xl border px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
                onClick={(e) => {
                  e.preventDefault();
                  window.history.back();
                }}
              >
                Back
              </button>

              <button
                className="rounded-xl border border-black bg-zinc-100 px-3 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
                onClick={async (e) => {
                  e.preventDefault();
                  try {
                    const payload = {
                      student_name: `${form.first} ${form.last}`.trim(),
                      student_email: form.email,
                      source_institution: form.inst,
                      target_program: form.major,
                    };
                    const r = await api<{ id?: number; request_id?: number }>("/requests", "POST", payload);
                    const newId = r.id ?? r.request_id;
                    if (newId) setRequestId(Number(newId));
                    alert("Request created.");
                  } catch (err) {
                    alert(errorMessage(err) || "Failed to create request");
                  }
                }}
              >
                Save Request
              </button>

              <button
                className="rounded-xl border border-black bg-zinc-100 px-3 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
                onClick={async (e) => {
                  e.preventDefault();
                  if (!requestId) {
                    alert("Create or load a request first.");
                    return;
                  }
                  try {
                    const tplId = templateId;
                    if (!tplId) {
                      alert("Pick a template first.");
                      return;
                    }
                    const out = await api<{ id?: number; packet_id?: number }>(
                      "/packets/generate",
                      "POST",
                      { request_id: requestId, template_id: tplId, include_section_ids: selectedSections },
                    );
                    const pid = out.id ?? out.packet_id;
                    if (pid) setPacketId(Number(pid));
                    alert("Packet generated.");
                  } catch (err) {
                    alert(errorMessage(err) || "Failed to generate packet");
                  }
                }}
              >
                Generate Packet
              </button>

              <button
                className="rounded-xl border border-black bg-zinc-100 px-3 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
                onClick={async (e) => {
                  e.preventDefault();
                  try {
                    const out = await api<{ path: string }>("/packets/export", "POST", {
                      packet_id: packetId,
                      format: "docx",
                    });

                    if (!out.path) {
                      alert("Export failed: no file path returned.");
                      return;
                    }

                    const url = out.path.startsWith("http")
                      ? out.path
                      : `${window.location.origin}/${out.path}`;

                    const link = document.createElement("a");
                    link.href = url;
                    link.download = url.split("/").pop() || "download";
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  } catch (err) {
                    alert(errorMessage(err) || "Failed to export packet");
                  }
                }}
              >
                Export Packet (DOCX)
              </button>
            </div>
          </form>
        </section>
      </Container>
    </main>
  );
}