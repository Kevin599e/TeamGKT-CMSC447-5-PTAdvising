import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { Container, errorMessage, firstArrayFrom } from "../lib/ui";

const BACKEND_ORIGIN = "http://127.0.0.1:5000";

type TemplateItem = { id: number; name: string; program_name?: string | null };

interface BuilderSection {
  template_section_id: number;
  title: string;
  section_type?: string;
  display_order?: number;
  optional?: boolean;
}

interface RequestItem {
  id: number;
  student_name: string;
  student_email: string;
  source_institution: string;
  target_program?: string | null;
}

interface SourceContentItem {
  id: number;
  title: string;
  content_type: string;
  body_preview: string;
}

type PacketStatus = "draft" | "finalized" | null;

export default function AdvisingSelectionPage() {
  const params = useParams();
  const initialRequestId = params.requestId ? Number(params.requestId) : null;

  // ---- Requests ----
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [requestId, setRequestId] = useState<number | null>(initialRequestId);
  const [loadingReq, setLoadingReq] = useState(false);
  const [errReq, setErrReq] = useState<string | null>(null);

  // ---- Templates & sections ----
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [sections, setSections] = useState<BuilderSection[]>([]);
  const [selectedSections, setSelectedSections] = useState<number[]>([]);
  const [loadingTpl, setLoadingTpl] = useState(false);
  const [errTpl, setErrTpl] = useState<string | null>(null);
  const [loadingSections, setLoadingSections] = useState(false);

  // ---- Packet ----
  const [packetId, setPacketId] = useState<number | null>(null);
  const [packetStatus, setPacketStatus] = useState<PacketStatus>(null);
  const [packetIdInput, setPacketIdInput] = useState<string>("");

  // ---- Extra SourceContent info blocks ----
  const [infoBlocks, setInfoBlocks] = useState<SourceContentItem[]>([]);
  const [loadingInfoBlocks, setLoadingInfoBlocks] = useState(false);
  const [errInfoBlocks, setErrInfoBlocks] = useState<string | null>(null);

  useEffect(() => {
    if (packetId != null) {
      setPacketIdInput(String(packetId));
    }
  }, [packetId]);

  const currentRequest = requestId
    ? requests.find((r) => r.id === requestId) || null
    : null;

  const currentTemplate = templateId
    ? templates.find((t) => t.id === templateId) || null
    : null;

  // ---------- Load Requests ----------
  useEffect(() => {
    (async () => {
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
        }));
        setRequests(mapped);

        if (!requestId && mapped[0]) {
          setRequestId(mapped[0].id);
        }
      } catch (e) {
        setErrReq(errorMessage(e));
      } finally {
        setLoadingReq(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Load Templates ----------
  useEffect(() => {
    (async () => {
      setLoadingTpl(true);
      setErrTpl(null);
      try {
        const res = await api<unknown>("/templates");
        const arr = firstArrayFrom(res);
        const mapped: TemplateItem[] = arr.map((t: any) => ({
          id: Number(t.id ?? t.template_id),
          name: String(t.name ?? t.title ?? "Template"),
          program_name: t.program_name ?? null,
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

  // ---------- Load template sections (preview) ----------
  useEffect(() => {
    if (!templateId) {
      setSections([]);
      setSelectedSections([]);
      return;
    }
    (async () => {
      setLoadingSections(true);
      try {
        const res = await api<Record<string, unknown>>(
          `/templates/${templateId}/builder`,
        );
        const arr = firstArrayFrom(
          (res as Record<string, unknown>)["sections"] ?? res,
        );
        const mapped: BuilderSection[] = arr.map((rec: any) => ({
          template_section_id: Number(rec.template_section_id ?? rec.id),
          title: String(rec.title ?? rec.name ?? "Section"),
          section_type: rec.section_type as string | undefined,
          display_order: Number(rec.display_order ?? 0),
          optional: Boolean(rec.optional ?? false),
        }));
        mapped.sort(
          (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
        );
        setSections(mapped);

        // Default: required sections pre-selected
        setSelectedSections([
          ...mapped
            .filter((s) => !s.optional)
            .map((s) => s.template_section_id),
        ]);
      } finally {
        setLoadingSections(false);
      }
    })();
  }, [templateId]);

  // ---------- Load extra SourceContent blocks ----------
  useEffect(() => {
    (async () => {
      setLoadingInfoBlocks(true);
      setErrInfoBlocks(null);
      try {
        const res = await api<{ items: any[] }>("/templates/source-content?usage_tag=extra_info_block");
        const items = res.items || [];
        const mapped: SourceContentItem[] = items.map((sc: any) => ({
          id: Number(sc.id),
          title: String(sc.title ?? "Untitled"),
          content_type: String(sc.content_type ?? "text"),
          body_preview: String(sc.body_preview ?? ""),
        }));
        setInfoBlocks(mapped);
      } catch (e) {
        setErrInfoBlocks(errorMessage(e));
      } finally {
        setLoadingInfoBlocks(false);
      }
    })();
  }, []);

  function toggleSection(id: number) {
    // Once packet is generated, these choices are baked in (no PATCH route yet)
    if (packetId) {
      alert(
        "This draft has already been generated. To change included sections, create a new packet draft.",
      );
      return;
    }
    setSelectedSections((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  // ---------- Start Draft (Generate Packet) ----------
  async function handleStartDraft(e: React.MouseEvent) {
    e.preventDefault();
    if (!requestId) {
      alert("Select a Request first.");
      return;
    }
    if (!templateId) {
      alert("Select a Template first.");
      return;
    }
    if (!selectedSections.length) {
      const ok = window.confirm(
        "You have not selected any sections. Generate an empty packet draft?",
      );
      if (!ok) return;
    }

    try {
      const payload = {
        request_id: requestId,
        template_id: templateId,
        include_section_ids: selectedSections,
      };
      const res = await api<{
        id?: number;
        packet_id?: number;
        status?: string;
        sections?: any[];
      }>("/packets/generate", "POST", payload);

      const pid = res.id ?? res.packet_id;
      if (!pid) {
        alert("Backend did not return a packet ID.");
        return;
      }
      setPacketId(Number(pid));
      setPacketStatus((res.status as PacketStatus) || "draft");
      setPacketIdInput(String(pid));
      alert("Packet draft generated and saved.");
    } catch (err) {
      alert(errorMessage(err) || "Failed to generate packet");
    }
  }

  // ---------- Finalize Packet ----------
  async function handleFinalize(e: React.MouseEvent) {
    e.preventDefault();
    if (!packetId) {
      alert("No packet to finalize. Generate a draft first.");
      return;
    }

    try {
      const res = await api<{ id?: number; status?: string }>(
        "/packets/finalize",
        "POST",
        { packet_id: packetId },
      );
      setPacketStatus((res.status as PacketStatus) || "finalized");
      alert("Packet finalized.");
    } catch (err) {
      alert(errorMessage(err) || "Failed to finalize packet");
    }
  }

  // ---------- Export Packet ----------
  async function handleExport(e: React.MouseEvent) {
    e.preventDefault();

    const parsed = Number(packetIdInput);
    if (!packetIdInput.trim() || Number.isNaN(parsed) || parsed <= 0) {
      alert("Enter a valid Packet ID before exporting.");
      return;
    }

    try {
      const out = await api<{ path: string }>("/packets/export", "POST", {
        packet_id: parsed,
        format: "docx",
      });

      if (!out.path) {
        alert("Export failed: no file path returned.");
        return;
      }

      // Normalize to "/exports/packet_1.docx"
      let clean = out.path.replace(/\\/g, "/");
      if (!clean.startsWith("/")) {
        clean = `/${clean}`;
      }

      const fileUrl = `${BACKEND_ORIGIN}/api/packets${clean}`;
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = clean.split("/").pop() || "packet.docx";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert((err as Error).message || "Failed to export packet");
    }
  }

  // ---------- Add info block to existing packet ----------
  async function handleAddInfoBlock(sc: SourceContentItem) {
    if (!packetId) {
      alert("Generate a packet draft first before adding extra info blocks.");
      return;
    }
    if (packetStatus === "finalized") {
      alert("This packet is finalized and can no longer be modified.");
      return;
    }

    try {
      await api(
        `/packets/${packetId}/info-blocks`,
        "POST",
        {
          source_content_id: sc.id,
          // Optional: title / display_order overrides
        },
      );
      alert(`Added info block: "${sc.title}" to packet #${packetId}.`);
      // If you later show packet sections, you can re-fetch them here.
    } catch (err) {
      alert(errorMessage(err) || "Failed to add info block to packet");
    }
  }

  return (
    <main className="py-10">
      <Container>
        <section className="rounded-2xl border p-6">
          <h1 className="text-xl font-semibold tracking-tight">
            Advising Packet Drafting
          </h1>

          <div className="mt-1 text-xs text-zinc-500">
            {requestId && (
              <span className="mr-3">
                Request ID:{" "}
                <strong className="text-zinc-700">{requestId}</strong>
              </span>
            )}
            {packetId && (
              <span className="mr-3">
                Packet ID:{" "}
                <strong className="text-zinc-700">{packetId}</strong>
              </span>
            )}
            {packetStatus && (
              <span>
                Status:{" "}
                <strong className="uppercase text-zinc-700">
                  {packetStatus}
                </strong>
              </span>
            )}
          </div>

          <p className="mt-2 text-sm text-zinc-600 text-black">
            Instruction for to make an advising packet: <br />
            1) Choose an existing student request.<br />
            2) Select a template and preview sections. <br />
            3) Generate a draft packet, optionally add extra
            info blocks, finalize, and export. <br />
          </p>

          <form className="mt-6 grid gap-6">
            {/* Step 1: Request selection */}
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1.5fr)_minmax(0,2fr)]">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">
                  Step 1 – Student Request
                </label>
                <select
                  value={requestId ?? ""}
                  onChange={(e) =>
                    setRequestId(
                      e.target.value ? Number(e.target.value) : null,
                    )
                  }
                  className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-amber-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100"
                >
                  <option value="" disabled>
                    {loadingReq
                      ? "Loading requests…"
                      : errReq
                      ? `Error: ${errReq}`
                      : "Select a request"}
                  </option>
                  {requests.map((r) => (
                    <option key={r.id} value={r.id}>
                      {`${r.id} – ${r.student_name || "Unknown"} – ${
                        r.source_institution || "N/A"
                      }`}
                    </option>
                  ))}
                </select>
                {!loadingReq && !errReq && !requests.length && (
                  <p className="text-xs text-zinc-500">
                    No requests found. Advisors must create student requests on
                    the Requests page first.
                  </p>
                )}
              </div>

              <div className="rounded-xl border bg-yellow-300 text-black p-3 text-xs dark:bg-yellow-300 dark:text-black dark:border-zinc-700">
                {currentRequest ? (
                  <div className="space-y-1">
                    <div>
                      <span className="font-semibold">Name:</span>{" "}
                      {currentRequest.student_name || "—"}
                    </div>
                    <div>
                      <span className="font-semibold">Email:</span>{" "}
                      {currentRequest.student_email || "—"}
                    </div>
                    <div>
                      <span className="font-semibold">Institution:</span>{" "}
                      {currentRequest.source_institution || "—"}
                    </div>
                    <div>
                      <span className="font-semibold">Target program:</span>{" "}
                      {currentRequest.target_program || "—"}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">
                    Select a request to see student and program information.
                  </p>
                )}
              </div>
            </div>

            {/* Step 2: Template & sections */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">
                  Step 2 – Template & Sections
                </label>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-500">
                    Sections selected for draft: {selectedSections.length}
                  </span>
                </div>
              </div>

              <div className="grid gap-2">
                <div className="grid gap-2">
                  <label className="text-xs text-black/60">
                    Template
                  </label>
                  <select
                    value={templateId ?? ""}
                    onChange={(e) =>
                      setTemplateId(
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                    className="rounded-xl border border-black/30 bg-white px-3 py-2 text-sm text-black focus:ring-2 focus:ring-yellow-400"
                    disabled={!requestId}
                  >
                    <option value="" disabled>
                      {!requestId
                        ? "Select a request first"
                        : loadingTpl
                        ? "Loading templates…"
                        : errTpl
                        ? `Error: ${errTpl}`
                        : "Select a template"}
                    </option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {t.program_name ? ` – ${t.program_name}` : ""}
                      </option>
                    ))}
                  </select>

                  {currentTemplate && (
                    <p className="mt-1 text-xs text-black/60">
                      Program:{" "}
                      <span className="font-medium">
                        {currentTemplate.program_name || "—"}
                      </span>
                    </p>
                  )}

                  {/* 👇 Quick presets moved directly under Program */}
                  <div className="mt-3">
                    <label className="text-xs text-black/60">
                      Quick section presets
                    </label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded border border-black bg-yellow-300 px-2 py-1 text-xs font-medium text-black hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() =>
                          setSelectedSections(
                            sections
                              .filter((s) => !s.optional)
                              .map((s) => s.template_section_id),
                          )
                        }
                        disabled={!templateId || !!packetId}
                      >
                        Required only
                      </button>
                      <button
                        type="button"
                        className="rounded border border-black bg-yellow-300 px-2 py-1 text-xs font-medium text-black hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() =>
                          setSelectedSections(
                            sections.map((s) => s.template_section_id),
                          )
                        }
                        disabled={!templateId || !!packetId}
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        className="rounded border border-black bg-yellow-300 px-2 py-1 text-xs font-medium text-black hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => setSelectedSections([])}
                        disabled={!templateId || !!packetId}
                      >
                        Clear
                      </button>
                    </div>

                    {packetId && (
                      <p className="mt-1 text-[11px] text-black/60">
                        Section selection is locked for this draft. To change, you
                        can generate a new packet draft.
                      </p>
                    )}
                  </div>
                </div>
              </div>


              <div className="rounded-2xl border p-4">
                {loadingSections ? (
                  <p className="text-sm text-zinc-700">Loading sections…</p>
                ) : !templateId ? (
                  <p className="text-sm text-zinc-700">
                    Choose a template to view sections.
                  </p>
                ) : sections.length === 0 ? (
                  <p className="text-sm text-zinc-700">
                    This template has no sections configured.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {sections.map((s) => (
                      <li
                        key={s.template_section_id}
                        className="flex items-center justify-between gap-3 rounded-xl border p-3"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {s.title}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {s.section_type || "section"}
                            {s.optional ? " • optional" : " • required"}
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedSections.includes(
                            s.template_section_id,
                          )}
                          onChange={() => toggleSection(s.template_section_id)}
                          className="size-4 rounded border-zinc-400 text-amber-600 focus:ring-amber-400"
                          disabled={!templateId}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Step 3: Draft / Finalize / Export */}
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
                className="rounded-xl border border-black bg-zinc-100 px-3 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleStartDraft}
                disabled={!requestId || !templateId || !!packetId}
              >
                Start Drafting (Generate Draft Packet)
              </button>
            </div>

            {/* Step 4: Extra info blocks */}
            <div className="mt-4 rounded-2xl border p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">
                  Optional – Add Extra Info Blocks
                </h2>
                <span className="text-xs text-zinc-500">
                  Reusable content (SourceContent) that can be inserted into the current packet draft.
                </span>
              </div>

              {loadingInfoBlocks ? (
                <p className="mt-2 text-sm text-zinc-700">
                  Loading info blocks…
                </p>
              ) : errInfoBlocks ? (
                <p className="mt-2 text-sm text-red-600">{errInfoBlocks}</p>
              ) : infoBlocks.length === 0 ? (
                <p className="mt-2 text-sm text-zinc-700">
                  No reusable info blocks available yet.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {infoBlocks.map((sc) => (
                    <li
                      key={sc.id}
                      className="flex items-start justify-between gap-3 rounded-xl border p-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-medium">
                            {sc.title}
                          </div>
                          <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
                            {sc.content_type}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-3 text-xs text-zinc-800 dark:text-zinc-30">
                          {sc.body_preview}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="shrink-0 rounded-xl border border-black bg-zinc-100 px-2 py-1 text-xs font-semibold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={() => handleAddInfoBlock(sc)}
                        disabled={!packetId || packetStatus === "finalized"}
                        title={
                          !packetId
                            ? "Generate a packet draft first"
                            : packetStatus === "finalized"
                            ? "Packet is finalized and cannot be edited"
                            : `Add to packet #${packetId}`
                        }
                      >
                        Add to Packet
                      </button>
                    </li>
                  ))}
                </ul>
              )}
               <button
                className="m-4 rounded-xl border border-black bg-zinc-100 px-3 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleFinalize}
                disabled={!packetId}
              >
                Finalize Packet
              </button>

              {!packetId ? (
                <p className="mt-2 text-[11px] text-zinc-500">
                  You must generate a draft packet before you can add extra info blocks.
                </p>
              ) : packetStatus === "finalized" ? (
                <p className="mt-2 text-[11px] text-zinc-500">
                  This packet has been finalized and can no longer be modified.
                </p>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
                <label className="text-xs text-zinc-600">
                  Packet ID:
                  <input
                    type="number"
                    min={1}
                    className="ml-2 w-24 rounded-md border border-zinc-300 px-2 py-1 text-xs"
                    value={packetIdInput}
                    onChange={(e) => setPacketIdInput(e.target.value)}
                    placeholder="e.g. 1"
                  />
                </label>
                <button
                  className="rounded-xl border border-black bg-yellow-300 px-3 py-2 text-sm font-semibold text-black hover:bg-yellow-400"
                  onClick={handleExport}
                >
                  Export (DOCX)
                </button>
              </div>
          </form>
        </section>
      </Container>
    </main>
  );
}
