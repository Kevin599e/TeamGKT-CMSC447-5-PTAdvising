
import React, { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Container } from "../lib/ui";

// ---------- Types based on backend responses ---------- //
interface MeResponse {
  id?: number;
  role?: string;
  email?: string;
}

interface Program {
  id: number;
  name: string;
  active: boolean;
}

interface Template {
  id: number;
  name: string;
  program_id?: number;
  active?: boolean;
}

interface TemplateSectionItem {
  id: number;
  title: string;
  section_type?: string;
  display_order?: number;
  optional?: boolean;
  source_content_id?: number | null;
}

interface SourceContentItem {
  id: number;
  title: string;
  body_preview?: string;
  active?: boolean;
  content_type?: string;
}

type AdminTab = "programs" | "templates" | "content";

// ---------- Helpers ---------- //
function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  try {
    return JSON.stringify(e);
  } catch {
    return String(e);
  }
}

const cardClass =
  "rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900";

// ---------- Component ---------- //
export default function AdminPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);
  const [authErr, setAuthErr] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<AdminTab>("programs");

  // Programs
  const [programOutput, setProgramOutput] = useState<string>("");
  const [programs, setPrograms] = useState<Program[]>([]);

  // Templates & sections
  const [templateCreateOutput, setTemplateCreateOutput] = useState<string>("");
  const [templateUpdateOutput, setTemplateUpdateOutput] = useState<string>("");
  const [sectionOutput, setSectionOutput] = useState<string>("");

  // Template sections (for selected template)
const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
const [templateSections, setTemplateSections] = useState<TemplateSectionItem[]>([]);
const [sectionsLoading, setSectionsLoading] = useState(false);
const [sectionsErr, setSectionsErr] = useState<string | null>(null);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesErr, setTemplatesErr] = useState<string | null>(null);

  // Source content
  const [sourceContentOutput, setSourceContentOutput] = useState<string>("");
  const [sourceItems, setSourceItems] = useState<SourceContentItem[]>([]);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceErr, setSourceErr] = useState<string | null>(null);

  // Initial auth check (like refreshMe() in sample app.js)
  useEffect(() => {
    (async () => {
      try {
        const data = await api<MeResponse>("/auth/me");
        setMe(data);
      } catch (e) {
        setAuthErr(errorMessage(e));
      } finally {
        setLoadingMe(false);
      }
    })();
  }, []);

  const isAdmin = me?.role === "admin";

  // ---------- Handlers: Programs ---------- //
  async function handleProgramCreate(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const form = e.currentTarget;              // 🔹 capture before await
  const fd = new FormData(form);

  const payload = {
    name: String(fd.get("name") || ""),
    active: fd.get("active") === "on",
  };

  try {
    const resp = await api<{ id: number }>("/templates/programs", "POST", payload);
    setProgramOutput("✅ Program created:\n" + JSON.stringify(resp, null, 2));
    form.reset();                            // ✅ safe now
  } catch (err) {
    setProgramOutput("❌ " + errorMessage(err));
  }
}

  async function handleProgramUpdate(e: React.FormEvent<HTMLFormElement>) {
  e.preventDefault();
  const form = e.currentTarget;              // 🔹 capture before await
  const fd = new FormData(form);

  const idRaw = fd.get("program_id");
  const payload: Record<string, unknown> = {};

  const name = fd.get("name");
  const active = fd.get("active");

  if (name && String(name).trim() !== "") {
    payload.name = String(name);
  }
  if (active === "true") payload.active = true;
  if (active === "false") payload.active = false;

  try {
    const resp = await api(`/templates/programs/${idRaw}`, "PATCH", payload);
    setProgramOutput("✅ Program updated:\n" + JSON.stringify(resp, null, 2));
    form.reset();                            // ✅ safe now
  } catch (err) {
    setProgramOutput("❌ " + errorMessage(err));
  }
}

  async function handleProgramList() {
    try {
      type ProgramListResponse = { items?: Program[] } | Program[];
      const resp = await api<ProgramListResponse>("/templates/programs", "GET");

      let items: Program[] = [];
      if (Array.isArray(resp)) {
        items = resp;
      } else if (resp && typeof resp === "object") {
        const obj = resp as { items?: Program[] };
        if (Array.isArray(obj.items)) {
          items = obj.items;
        }
      }

      // 🆕 Sort by ID ASC
      const sorted = (items ?? []).sort((a, b) => a.id - b.id);

      setPrograms(sorted);
      setProgramOutput(JSON.stringify(sorted, null, 2));
    } catch (err) {
      setProgramOutput("❌ " + errorMessage(err));
    }
  }

  

  // ---------- Handlers: Templates ---------- //
  async function handleTemplateCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;            // ✅ capture form
    const fd = new FormData(form);

    const payload = {
      name: String(fd.get("name") || ""),
      program_id: parseInt(String(fd.get("program_id") || "0"), 10),
      active: fd.get("active") === "on",
    };

    try {
      const resp = await api("/templates", "POST", payload);
      setTemplateCreateOutput("✅ Template created:\n" + JSON.stringify(resp, null, 2));
      form.reset();                          // ✅ safe now
      void handleTemplateList();             // refresh list
    } catch (err) {
      setTemplateCreateOutput("❌ " + errorMessage(err));
    }
  }


  async function handleTemplateUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;            // ✅ capture form
    const fd = new FormData(form);

    const templateId = fd.get("template_id");
    const payload: Record<string, unknown> = {};

    const name = fd.get("name");
    const programId = fd.get("program_id");
    const active = fd.get("active");

    if (name && String(name).trim() !== "") {
      payload.name = String(name);
    }
    if (programId && String(programId).trim() !== "") {
      payload.program_id = parseInt(String(programId), 10);
    }
    if (active === "true") payload.active = true;
    if (active === "false") payload.active = false;

    try {
      const resp = await api(`/templates/${templateId}`, "PATCH", payload);
      setTemplateUpdateOutput("✅ Template updated:\n" + JSON.stringify(resp, null, 2));
      form.reset();                          // ✅ safe
      void handleTemplateList();
    } catch (err) {
      setTemplateUpdateOutput("❌ " + errorMessage(err));
    }
  }


  async function handleTemplateList() {
    try {
      setTemplatesLoading(true);
      setTemplatesErr(null);
      type TemplateListResponse = { items?: Template[] } | Template[];
      const resp = await api<TemplateListResponse>("/templates", "GET");
      let items: Template[] = [];
      if (Array.isArray(resp)) {
        items = resp;
      } else if (resp && typeof resp === "object") {
        const obj = resp as { items?: Template[] };
        if (Array.isArray(obj.items)) {
          items = obj.items;
        }
      }
      setTemplates(items ?? []);
    } catch (err) {
      setTemplatesErr(errorMessage(err));
    } finally {
      setTemplatesLoading(false);
    }
  }

  async function handleTemplateSectionsLoad(template: Template) {
  setSelectedTemplate(template);
  setSectionsLoading(true);
  setSectionsErr(null);

  try {
    type TemplateSectionListResponse =
      | { items?: TemplateSectionItem[] }
      | TemplateSectionItem[];

    const resp = await api<TemplateSectionListResponse>(
      `/templates/${template.id}/sections`,
      "GET",
    );

    let items: TemplateSectionItem[] = [];
    if (Array.isArray(resp)) {
      items = resp;
    } else if (resp && typeof resp === "object") {
      const obj = resp as { items?: TemplateSectionItem[] };
      if (Array.isArray(obj.items)) {
        items = obj.items;
      }
    }

    // sort by display_order then id
    const sorted = (items ?? []).slice().sort((a, b) => {
      const da = a.display_order ?? 9999;
      const db = b.display_order ?? 9999;
      if (da !== db) return da - db;
      return a.id - b.id;
    });

    setTemplateSections(sorted);
  } catch (err) {
    setSectionsErr(errorMessage(err));
    setTemplateSections([]);
  } finally {
    setSectionsLoading(false);
  }
}

  // ---------- Handlers: Template Sections ---------- //
  async function handleSectionCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;            // ✅ capture form
    const fd = new FormData(form);

    const templateId = fd.get("template_id");
    const payload: Record<string, unknown> = {
      title: String(fd.get("title") || ""),
      section_type: String(fd.get("section_type") || ""),
      optional: fd.get("optional") === "on",
    };

    const displayOrder = fd.get("display_order");
    if (displayOrder && String(displayOrder).trim() !== "") {
      payload.display_order = parseInt(String(displayOrder), 10);
    }

    const sourceContentId = fd.get("source_content_id");
    if (sourceContentId && String(sourceContentId).trim() !== "") {
      payload.source_content_id = parseInt(String(sourceContentId), 10);
    }

    try {
      const resp = await api(`/templates/${templateId}/sections`, "POST", payload);
      setSectionOutput("✅ Section created:\n" + JSON.stringify(resp, null, 2));
      form.reset();                          // ✅ safe
    } catch (err) {
      setSectionOutput("❌ " + errorMessage(err));
    }
  }

  // ---------- Handlers: Source Content ---------- //
  async function handleSourceContentCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;            // ✅ capture form
    const fd = new FormData(form);

    const payload = {
      title: String(fd.get("title") || ""),
      content_type: String(fd.get("content_type") || "text"),
      body: String(fd.get("body") || ""),
      active: fd.get("active") === "on",
    };

    try {
      const resp = await api("/templates/source-content", "POST", payload);
      setSourceContentOutput("✅ Source content created:\n" + JSON.stringify(resp, null, 2));
      form.reset();                          // ✅ safe
      void handleSourceContentList();        // refresh dropdown + table
    } catch (err) {
      setSourceContentOutput("❌ " + errorMessage(err));
    }
  }


  async function handleSourceContentList() {
    try {
      setSourceLoading(true);
      setSourceErr(null);
      type SourceContentListResponse = { items?: SourceContentItem[] } | SourceContentItem[];
      const resp = await api<SourceContentListResponse>("/templates/source-content", "GET");

      let items: SourceContentItem[] = [];
      if (Array.isArray(resp)) {
        items = resp;
      } else if (resp && typeof resp === "object") {
        const obj = resp as { items?: SourceContentItem[] };
        if (Array.isArray(obj.items)) {
          items = obj.items;
        }
      }

      const sorted = (items ?? []).sort((a, b) => a.id - b.id); // 🔹 sort by ID asc
      setSourceItems(sorted);
      setSourceContentOutput(JSON.stringify(sorted ?? [], null, 2));
    } catch (err) {
      setSourceErr(errorMessage(err));
      setSourceContentOutput("❌ " + errorMessage(err));
    } finally {
      setSourceLoading(false);
    }
  }
  useEffect(() => {
      if (isAdmin) {
        void handleProgramList(); // preload programs so selects have data
        void handleSourceContentList();
      }
    }, [isAdmin]);

  // ---------- Render ---------- //
  if (loadingMe) {
    return (
      <main className="py-10">
        <Container>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Loading administrator information…
          </p>
        </Container>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="py-10">
        <Container>
          <section className={cardClass}>
            <h1 className="text-xl font-semibold tracking-tight">Access denied</h1>
            <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
              You must be signed in as an administrator to view this page.
            </p>
            {authErr && <p className="mt-2 text-xs text-red-600">{authErr}</p>}
          </section>
        </Container>
      </main>
    );
  }

  return (
    <main className="py-10">
      <Container>
        {/* Header */}
        <section className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Admin: Template &amp; Content Management
            </h1>
            <p className="mt-1 text-sm text-black-500 dark:text-black-400">
              Manage programs, templates, sections, and source content used by advisors
              when generating packets.
            </p>
          </div>
          <div className="text-xs text-black-500 dark:text-black-400">
            Signed in as {me?.email ?? "user@email.com"} — role:
            <span className="ml-1 rounded bg-yellow-300 px-1.5 py-0.5 font-mono text-[11px] dark:bg-yellow-300">
              {me?.role ?? "admin"}
            </span>
          </div>
        </section>

        {/* Tabs */}
        <div className="mb-6 inline-flex flex-wrap gap-2 rounded-xl border border-zinc-200 bg-yellow-300 p-1 text-xs font-medium dark:bg-yellow-300">
          <button
            type="button"
            onClick={() => setActiveTab("programs")}
            className={
              activeTab === "programs"
                ? "rounded-lg bg-white px-3 py-1 shadow-sm text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                : "rounded-lg px-3 py-1 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }
          >
            Programs
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("templates");
              void handleTemplateList();
              void handleSourceContentList();
            }}
            className={
              activeTab === "templates"
                ? "rounded-lg bg-white px-3 py-1 shadow-sm text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                : "rounded-lg px-3 py-1 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }
          >
            Templates &amp; Sections
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("content");
              void handleSourceContentList();
            }}
            className={
              activeTab === "content"
                ? "rounded-lg bg-white px-3 py-1 shadow-sm text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                : "rounded-lg px-3 py-1 text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            }
          >
            Source Content
          </button>
        </div>

        {/* Tab contents */}
        <div className="grid gap-6">
          {/* Programs */}
          {activeTab === "programs" && (
            <section className={cardClass}>
              <h2 className="text-lg font-semibold">Programs Management</h2>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                Create, update, and list programs (e.g., CS BS, IS BS) that templates are
                attached to.
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <form onSubmit={handleProgramCreate} className="grid gap-2">
                  <h3 className="text-sm font-medium">Create Program</h3>
                  <input
                    name="name"
                    placeholder="Program Name (e.g., CS BS)"
                    required
                    className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-amber-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                  <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      name="active"
                      defaultChecked
                      className="h-4 w-4 rounded border-zinc-400 text-amber-600 focus:ring-amber-400"
                    />
                    Active
                  </label>
                  <button
                    type="submit"
                    className="mt-1 inline-flex items-center justify-center rounded-xl border border-yellow-300 bg-yellow-200 px-3 py-1.5 text-xs font-semibold text-black hover:bg-yellow-300 dark:border-yellow-400 dark:bg-yellow-300 dark:hover:bg-yellow-400"
                  >
                    Create Program
                  </button>
                </form>

                <form onSubmit={handleProgramUpdate} className="grid gap-2">
                  <h3 className="text-sm font-medium">Update Program</h3>
                  <label className="grid gap-1 text-xs text-zinc-700 dark:text-zinc-300">
                    <span>Program</span>
                    <select
                      name="program_id"
                      required
                      className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-amber-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                    >
                      <option value="">Select a program…</option>
                      {programs.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.id} — {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <input
                    name="name"
                    placeholder="New Name (optional)"
                    className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-amber-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                  />
                  <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                    Active:
                    <select
                      name="active"
                      className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                    >
                      <option value="">(no change)</option>
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  </label>
                  <button
                    type="submit"
                    className="mt-1 inline-flex items-center justify-center rounded-xl border border-yellow-300 bg-yellow-200 px-3 py-1.5 text-xs font-semibold text-black hover:bg-yellow-300 dark:border-yellow-400 dark:bg-yellow-300 dark:hover:bg-yellow-400"
                  >
                    Update Program
                  </button>
                </form>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleProgramList}
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
                >
                  List Programs
                </button>
              </div>

              <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-zinc-950/90 p-3 text-[11px] text-zinc-50 dark:bg-black">
                {programOutput || "(no output yet)"}
              </pre>
            </section>
          )}

          {/* Templates & Sections */}
          {activeTab === "templates" && (
            <section className={cardClass}>
              <h2 className="text-lg font-semibold">Templates &amp; Sections</h2>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                Configure advising packet templates and attach sections (intro, info
                blocks, degree audit, etc.).
              </p>

              <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,2.1fr),minmax(0,2.9fr)]">
                {/* Left: Forms */}
                <div className="grid gap-4">
                  {/* Create Template */}
                  <div className="rounded-xl border border-zinc-200 bg-white p-4 text-xs dark:border-zinc-700 dark:bg-zinc-950">
                    <h3 className="text-sm text-yellow-400 font-medium">Create Template</h3>
                    <p className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                      Create a new advising packet template and link it to a program.
                    </p>
                    <form onSubmit={handleTemplateCreate} className="mt-3 grid gap-2">
                      <input
                        name="name"
                        placeholder="Template name (e.g., CS BS Default)"
                        required
                        className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-amber-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      />
                      <label className="grid gap-1 text-xs text-zinc-700 dark:text-zinc-300">
                        <span>Program</span>
                        <select
                          name="program_id"
                          required
                          className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-amber-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                        >
                          <option value="">Select a program…</option>
                          {programs.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.id} — {p.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="mt-1 flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                        <input
                          type="checkbox"
                          name="active"
                          defaultChecked
                          className="h-4 w-4 rounded border-zinc-400 text-amber-600 focus:ring-amber-400"
                        />
                        Active
                      </label>
                      <button
                        type="submit"
                        className="mt-2 inline-flex items-center justify-center rounded-xl border border-yellow-500 bg-yellow-400 px-3 py-1.5 text-xs font-semibold text-black hover:bg-yellow-500 dark:border-yellow-500 dark:bg-yellow-500 dark:hover:bg-yellow-600"
                      >
                        Create Template
                      </button>
                    </form>
                  </div>

                  {/* Update Template */}
                  <div className="rounded-xl border border-zinc-200 bg-white p-4 text-xs dark:border-zinc-700 dark:bg-zinc-950">
                    <h3 className="text-sm text-yellow-400 font-medium">Update Template</h3>
                    <p className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                      Rename a template, change its program, or toggle its active state.
                    </p>
                    <form onSubmit={handleTemplateUpdate} className="mt-3 grid gap-2">
                      <input
                        name="template_id"
                        placeholder="Template ID"
                        required
                        className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-amber-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      />
                      <input
                        name="name"
                        placeholder="New name (optional)"
                        className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-amber-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      />
                      <label className="grid gap-1 text-xs text-zinc-700 dark:text-zinc-300">
                        <span>Program</span>
                        <select
                          name="program_id"
                          required
                          className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-amber-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                        >
                          <option value="">Select a program…</option>
                          {programs.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.id} — {p.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="mt-1 flex items-center justify-between gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                        <span>Active</span>
                        <select
                          name="active"
                          className="rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                        >
                          <option value="">(no change)</option>
                          <option value="true">Active</option>
                          <option value="false">Inactive</option>
                        </select>
                      </label>
                      <button
                        type="submit"
                        className="mt-2 inline-flex items-center justify-center rounded-xl border border-yellow-500 bg-yellow-400 px-3 py-1.5 text-xs font-semibold text-black hover:bg-yellow-500 dark:border-yellow-500 dark:bg-yellow-500 dark:hover:bg-yellow-600"
                      >
                        Update Template
                      </button>
                    </form>
                  </div>

                  {/* Add Section */}
                  <div className="rounded-xl border border-zinc-200 bg-white p-4 text-xs dark:border-zinc-700 dark:bg-zinc-950">
                    <h3 className="text-sm text-yellow-400 font-medium">Add Section to Template</h3>
                    <p className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                      Attach information blocks, degree audit sections, or custom text to a template.
                    </p>
                    <form onSubmit={handleSectionCreate} className="mt-3 grid gap-2">
                      <input
                        name="template_id"
                        placeholder="Template ID"
                        required
                        className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-amber-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      />
                      <input
                        name="title"
                        placeholder="Section title"
                        required
                        className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-amber-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      />
                      <input
                        name="section_type"
                        placeholder="Section type (e.g., text_block)"
                        className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-amber-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      />
                      <input
                        name="display_order"
                        placeholder="Display order (number)"
                        className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-amber-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                      />
                      <label className="grid gap-1 text-xs text-zinc-700 dark:text-zinc-300">
                        <span>Source content (optional)</span>
                        <select
                          name="source_content_id"
                          className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-amber-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                        >
                          <option value="">None</option>
                          {sourceItems.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.id} — {item.title}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="mt-1 flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                        <input
                          type="checkbox"
                          name="optional"
                          className="h-4 w-4 rounded border-zinc-400 text-amber-600 focus:ring-amber-400"
                        />
                        Optional section
                      </label>
                      <button
                        type="submit"
                        className="mt-2 inline-flex items-center justify-center rounded-xl border border-yellow-500 bg-yellow-400 px-3 py-1.5 text-xs font-semibold text-black hover:bg-yellow-500 dark:border-yellow-500 dark:bg-yellow-500 dark:hover:bg-yellow-600"
                      >
                        Add Section
                      </button>
                    </form>
                  </div>

                  {/* Output / debug */}
                  <pre className="mt-1 max-h-40 overflow-auto rounded-xl bg-zinc-950/90 p-3 text-[11px] text-zinc-50 dark:bg-black">
                    {templateCreateOutput ||
                      templateUpdateOutput ||
                      sectionOutput ||
                      "(no template/section output yet)"}
                  </pre>
                </div>

                {/* Right: Template list */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium mb-0.5">Existing Templates</h3>
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-mono text-zinc-600 dark:bg-zinc-900 dark:text-zinc-300">
                        {templates.length} total
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleTemplateList}
                      className="inline-flex items-center justify-center rounded-xl border border-yellow-500 bg-yellow-400 px-3 py-1.5 text-xs font-semibold text-black hover:bg-yellow-500 dark:border-yellow-500 dark:bg-yellow-500 dark:hover:bg-yellow-600"
                    >
                      Refresh
                    </button>
                  </div>

                  {templatesErr && (
                    <p className="text-xs text-red-600">{templatesErr}</p>
                  )}

                  <div className="max-h-80 overflow-auto rounded-xl border border-zinc-200 bg-zinc-50 text-sm dark:border-zinc-700 dark:bg-zinc-950">
                    {templatesLoading ? (
                      <div className="px-3 py-3 text-xs text-zinc-500">
                        Loading templates…
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 border-b bg-zinc-100 text-[11px] uppercase tracking-wide !text-white dark:!text-white dark:bg-zinc-900">
                          <tr>
                            <th className="px-3 py-2">ID</th>
                            <th className="px-3 py-2">Name</th>
                            <th className="px-3 py-2">Program ID</th>
                            <th className="px-3 py-2">Active</th>
                          </tr>
                        </thead>
                        <tbody>
                          {templates.length === 0 ? (
                            <tr>
                              <td
                                colSpan={4}
                                className="px-3 py-3 text-center text-zinc-500"
                              >
                                No templates found.
                              </td>
                            </tr>
                          ) : (templates.map((t) => {
                                const isSelected = selectedTemplate?.id === t.id;
                                return (
                                  <tr
                                    key={t.id}
                                    onClick={() => void handleTemplateSectionsLoad(t)}
                                    className={
                                      "cursor-pointer border-b last:border-0 hover:bg-zinc-100 dark:hover:bg-zinc-800" +
                                      (isSelected ? " bg-yellow-50 dark:bg-zinc-800" : "")
                                    }
                                  >
                                    <td className="px-3 py-1.5 font-mono text-[11px] !text-white">
                                      {t.id}
                                    </td>
                                    <td className="px-3 py-1.5 !text-white">{t.name}</td>
                                    <td className="px-3 py-1.5 !text-white">{t.program_id ?? "—"}</td>
                                    <td className="px-3 py-1.5 !text-white">
                                      {t.active ? "Active" : "Inactive"}
                                    </td>
                                  </tr>
                                );
                              }))
                            }
                        </tbody>
                      </table>
                    )}
                  </div>
                  {selectedTemplate && (
                    <div className="mt-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs dark:border-zinc-700 dark:bg-zinc-950">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <h4 className="text-sm !text-white font-semibold">
                            Sections for template #{selectedTemplate.id} — {selectedTemplate.name}
                          </h4>
                          <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                            Click a template row above to view its sections, ordered by display order.
                          </p>
                        </div>
                      </div>

                      {sectionsErr && (
                        <p className="mt-2 text-[11px] text-red-600">{sectionsErr}</p>
                      )}

                      {sectionsLoading ? (
                        <p className="mt-2 text-[11px] text-zinc-500">
                          Loading sections…
                        </p>
                      ) : templateSections.length === 0 ? (
                        <p className="mt-2 text-[11px] text-zinc-500">
                          This template has no sections yet.
                        </p>
                      ) : (
                        <div className="mt-2 max-h-56 overflow-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                          <table className="w-full text-left text-[11px]">
                            <thead className="sticky top-0 border-b bg-zinc-100 uppercase tracking-wide text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                              <tr>
                                <th className="px-2 py-1">Order</th>
                                <th className="px-2 py-1">Title</th>
                                <th className="px-2 py-1">Type</th>
                                <th className="px-2 py-1">Optional</th>
                                <th className="px-2 py-1">Source ID</th>
                              </tr>
                            </thead>
                            <tbody>
                              {templateSections.map((s) => (
                                <tr key={s.id} className="border-b last:border-0">
                                  <td className="px-2 py-1 font-mono !text-white">
                                    {s.display_order ?? "—"}
                                  </td>
                                  <td className="px-2 py-1 !text-white">
                                    {s.title}
                                  </td>
                                  <td className="px-2 py-1">
                                    {s.section_type ?? "text_block !text-white"}
                                  </td>
                                  <td className="px-2 py-1 !text-white">
                                    {s.optional ? "Yes" : "No"}
                                  </td>
                                  <td className="px-2 py-1 !text-white">
                                    {s.source_content_id ?? "—"}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}


          {/* Source content */}
          {activeTab === "content" && (
            <section className={cardClass}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Source Content Library</h2>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
                    Maintain reusable text blocks that can be pulled into advising packets
                    (e.g., degree policies, support resources).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSourceContentList}
                  className="inline-flex items-center justify-center rounded-xl border border-zinc-300 bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-900 hover:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
                >
                  Refresh List
                </button>
              </div>

              <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,2.2fr),minmax(0,2.8fr)]">
                {/* Create / Edit source content */}
                <form onSubmit={handleSourceContentCreate} className="grid gap-3">
                  <h3 className="text-sm font-medium">Create New Source Content</h3>

                  <div className="grid gap-1.5">
                    <label className="text-xs font-medium">Title</label>
                    <input
                      name="title"
                      placeholder="e.g., CS Upper-Level Policy"
                      required
                      className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-amber-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <label className="text-xs font-medium">Content Type</label>
                    <input
                      name="content_type"
                      placeholder="text, markdown, ..."
                      className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-amber-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <label className="text-xs font-medium">Body</label>
                    <textarea
                      name="body"
                      rows={6}
                      placeholder="Write or paste the text that advisors will reuse..."
                      className="min-h-20 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-amber-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                    />
                  </div>

                  <label className="flex items-center gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                    <input
                      type="checkbox"
                      name="active"
                      defaultChecked
                      className="h-4 w-4 rounded border-zinc-400 text-amber-600 focus:ring-amber-400"
                    />
                    Active
                  </label>

                  <button
                    type="submit"
                    className="mt-1 inline-flex items-center justify-center rounded-xl border border-black bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-black hover:bg-zinc-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700"
                  >
                    Create Content
                  </button>

                  <pre className="mt-2 max-h-40 overflow-auto rounded-xl bg-zinc-950/90 p-3 text-[11px] text-zinc-50 dark:bg-black">
                    {sourceContentOutput || "(no source content output yet)"}
                  </pre>
                </form>

                {/* List of source content */}
                <div className="max-h-80 overflow-auto rounded-xl border border-zinc-200 bg-zinc-50 text-sm dark:border-zinc-700 dark:bg-zinc-950">
                  {sourceErr && (
                    <div className="px-3 py-2 text-xs text-red-600">{sourceErr}</div>
                  )}
                  {sourceLoading ? (
                    <div className="px-3 py-3 text-xs text-zinc-500">
                      Loading source content…
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 border-b bg-zinc-100 text-[11px] uppercase tracking-wide text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
                        <tr>
                          <th className="px-3 py-2">ID</th>
                          <th className="px-3 py-2">Title</th>
                          <th className="px-3 py-2">Type</th>
                          <th className="px-3 py-2">Active</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sourceItems.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-3 py-3 text-center text-zinc-500"
                            >
                              No source content found.
                            </td>
                          </tr>
                        ) : (
                          sourceItems.map((item) => (
                            <tr
                              key={item.id}
                              className="cursor-pointer border-b last:border-0 align-top hover:bg-zinc-100 dark:hover:bg-zinc-800"
                            >
                              <td className="px-3 py-1.5 font-mono text-[11px]">
                                {item.id}
                              </td>
                              <td className="px-3 py-1.5">
                                <div className="font-medium text-yellow-400">{item.title}</div>
                                {item.body_preview && (
                                  <div className="mt-0.5 line-clamp-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                                    {item.body_preview}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-1.5">
                                {item.content_type ?? "text"}
                              </td>
                              <td className="px-3 py-1.5">
                                {item.active ? "Active" : "Inactive"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </section>
          )}
        </div>
      </Container>
    </main>
  );
}