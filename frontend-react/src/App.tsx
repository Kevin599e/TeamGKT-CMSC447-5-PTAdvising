import { useMemo, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Link, NavLink, useNavigate, useParams, useLocation } from "react-router-dom";
import { api } from "./lib/api";

// ---------- Auth helpers ---------- //
function RequireAuth({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        await api("/auth/me");
        setOk(true);
      } catch {
        setOk(false);
        navigate("/login", { replace: true });
      }
    })();
  }, [navigate]);

  if (ok === null) return null; // hold render until auth is known
  if (ok === false) return null; // redirected
  return <>{children}</>;
}

function LoginPage() {
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
      try { await api("/auth/me"); } catch { /* ignore: some backends return 204 */ }
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
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Admin or Advisor credentials</p>
          <form onSubmit={onSubmit} className="mt-6 grid gap-4">
            <div className="grid gap-1.5">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <input id="email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-amber-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100" required />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <input id="password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-amber-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100" required />
            </div>
            {err && <div className="text-sm text-red-600">{err}</div>}
            <button disabled={loading} className="rounded-xl border border-black bg-zinc-100 px-3 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-60">
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </section>
      </Container>
    </main>
  );
}
/**
 * UMBC Pre‑Transfer Advising — Multi‑Page UI (front‑end only)
 * Tailwind v4 expected; make sure src/index.css has:  @import "tailwindcss";
 *
 * This version adds TypeScript types to fix VS Code errors like
 * “binding element 'onChange' implicitly has an 'any' type”.
 */

function useThemeInit() {
  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme");
      const shouldDark = saved === "dark"; // default to LIGHT unless explicitly saved as dark
      document.documentElement.classList.toggle("dark", shouldDark);
    } catch (e) {
      void e; // satisfy linter
      document.documentElement.classList.remove("dark");
    }
  }, []);
}

// ---------- Types ---------- //

type Tone = "green" | "amber" | "zinc";

type ContainerProps = { children: React.ReactNode };

type BadgeProps = { children: React.ReactNode; tone?: Tone };

type SectionHeaderProps = { title: string; children?: React.ReactNode };

type SearchInputProps = {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
};

type RequestItem = {
  id: number;
  lastFirst: string;
  email?: string;
  inst?: string;
  submitted?: string;
  edited?: string;
  status?: string;
};

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  try { return JSON.stringify(e); } catch { return String(e); }
}

function normalizeRequests(items: unknown): RequestItem[] {
  if (!Array.isArray(items)) return [];
  return (items as Array<Record<string, unknown>>).map((rec) => {
    const idRaw = (rec["id"] ?? rec["request_id"] ?? rec["pk"] ?? Math.random()) as number | string;
    const id = Number.isFinite(Number(idRaw)) ? Number(idRaw) : Math.floor(Number(idRaw as number) * 1e6) || Math.floor(Math.random() * 1e9);
    const lastFirst = (rec["lastFirst"] ?? rec["last_first"] ?? rec["student_name"] ?? rec["name"] ??
      ((rec["last_name"] && rec["first_name"]) ? `${String(rec["last_name"])}, ${String(rec["first_name"])}` : "Unknown")) as string;
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

// Helper: robustly extract the first array from a possibly-nested API response
function firstArrayFrom(obj: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(obj)) return obj as Array<Record<string, unknown>>;
  if (obj && typeof obj === "object") {
    const rec = obj as Record<string, unknown>;
    const candidates = [
      rec["items"],
      rec["data"],
      rec["results"],
      // sometimes backends wrap once more, try one nested level
      typeof rec["data"] === "object" && (rec["data"] as Record<string, unknown>)["items"],
    ];
    for (const c of candidates) if (Array.isArray(c)) return c as Array<Record<string, unknown>>;
    // fall back: find the first enumerable value that is an array
    for (const v of Object.values(rec)) if (Array.isArray(v)) return v as Array<Record<string, unknown>>;
  }
  return [];
}

// ---------- Layout helpers ---------- //
function Container({ children }: ContainerProps) {
  return <div className="container mx-auto max-w-6xl px-4">{children}</div>;
}

function Badge({ children, tone = "zinc" }: BadgeProps) {
  const map: Record<Tone, string> = {
    green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    amber: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-300",
    zinc: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200",
  };
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${map[tone]}`}>{children}</span>;
}

// ---------- Top Nav (centered UMBC logo, Logout on right) ---------- //
function AppNav() {
  return (
    <header className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-zinc-950/70">
      <Container>
        {/* Row 1: Centered UMBC logo + right-aligned controls */}
        <div className="grid h-16 grid-cols-[1fr,auto,1fr] items-center">
          <div />
          <Link to="/" className="justify-self-center" aria-label="UMBC Home">
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex size-9 items-center justify-center rounded-lg bg-black font-black text-amber-400">U</span>
              <span className="sr-only">UMBC</span>
            </div>
          </Link>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                const el = document.documentElement;
                const nowDark = !el.classList.contains("dark");
                el.classList.toggle("dark", nowDark);
                try {
                  localStorage.setItem("theme", nowDark ? "dark" : "light");
                } catch (e) {
                  void e; // ignore storage errors
                }
              }}
              className="rounded-xl border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              aria-label="Toggle dark mode"
            >
              <span className="hidden sm:inline">Dark mode</span>
              <span className="sm:hidden">🌓</span>
            </button>
            <button
              className="rounded-xl border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
              onClick={async () => {
                try {
                  await api("/auth/logout", "POST", {});
                } catch {
                  /* ignore network/auth errors on logout */
                }
                window.location.href = "/login";
              }}
            >
              Log out
            </button>
          </div>
        </div>

        {/* Row 2: Centered page navigation */}
        <nav className="flex items-center justify-center gap-1 py-2">
          {(() => {
            const linkBase =
              "rounded-xl px-3 py-2 text-sm font-medium text-black border border-transparent hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-400";
            const active = ({ isActive }: { isActive: boolean }) =>
              isActive
                ? `${linkBase} bg-zinc-200 text-black border border-black`
                : linkBase;
            return (
              <>
                <NavLink to="/" className={active} end>
                  Home
                </NavLink>
                <NavLink to="/records" className={active}>
                  Records
                </NavLink>
                <NavLink to="/advising" className={active}>
                  Advising Case
                </NavLink>
              </>
            );
          })()}
        </nav>
      </Container>
    </header>
  );
}

function AppFooter() {
  return (
    <footer className="border-t py-8 text-sm text-zinc-700 dark:text-zinc-300">
      <Container>
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p>© {new Date().getFullYear()} UMBC Pre‑Transfer Advising (UI demo)</p>
          <div className="flex items-center gap-4">
            <a className="hover:underline" href="#">
              Privacy
            </a>
            <a className="hover:underline" href="#">
              Accessibility
            </a>
            <a className="hover:underline" href="#">
              Contact
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}


// ---------- Shared components ---------- //
function SectionHeader({ title, children }: SectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {children}
    </div>
  );
}

function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  return (
    <input
      value={value}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-black bg-zinc-100 px-3 py-2 text-sm text-black placeholder-zinc-600 outline-none focus:ring-2 focus:ring-amber-400 sm:w-72"
    />
  );
}

// ---------- Home ---------- //
function HomePage() {
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
    () => progress.filter((r) => (r.lastFirst || "").toLowerCase().includes(qProgress.toLowerCase())),
    [progress, qProgress]
  );
  const filteredNew = useMemo(
    () => newSubmissions.filter((r) => (r.lastFirst || "").toLowerCase().includes(qNew.toLowerCase())),
    [newSubmissions, qNew]
  );

  return (
    <main className="py-10">
      <Container>
        {/* In Progress */}
        <section className="rounded-2xl border p-5">
          <SectionHeader title="In Progress">
            <SearchInput value={qProgress} onChange={setQProgress} placeholder="Search students (In Progress)" />
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
                        <Link to={`/advising/request/${r.id}`} className="text-amber-800 hover:underline dark:text-amber-300">{r.lastFirst}</Link>
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
            <SearchInput value={qNew} onChange={setQNew} placeholder="Search students (New Submissions)" />
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
                        <Link to={`/advising/request/${r.id}`} className="text-amber-800 hover:underline dark:text-amber-300">{r.lastFirst}</Link>
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
            onClick={() => navigate("/advising")}
            className="rounded-2xl border border-black bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-black shadow hover:bg-zinc-200"
          >
            Open New Advising Case
          </button>
        </div>
      </Container>
    </main>
  );
}

// ---------- Records ---------- //
function RecordsPage() {
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
        (r.inst || "").toLowerCase().includes(t)
    );
  }, [records, q]);

  const statusTone = (s: string): Tone => (s === "Completed" ? "green" : s === "New Submission" ? "amber" : "zinc");

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
                        <Link to={`/advising/request/${r.id}`} className="text-amber-800 hover:underline dark:text-amber-300">{r.lastFirst}</Link>
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

// ---------- Advising Case ---------- //
function AdvisingCasePage() {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState<boolean>(false); // create new packet
  const [confirmFindOpen, setConfirmFindOpen] = useState<boolean>(false); // find existing packet

  return (
    <main className="py-10">
      <Container>
        <section className="rounded-2xl border p-6">
          <h1 className="text-xl font-semibold tracking-tight">Advising Case</h1>
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">Choose to create a new packet or find an existing one.</p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <button
              className="rounded-2xl border p-5 text-left shadow-sm transition-transform duration-150 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400 active:scale-95"
              onClick={() => setConfirmOpen(true)}
            >
              <h2 className="text-lg font-semibold">Create New Packet</h2>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">Start a new advising packet for a student.</p>
            </button>

            <button
              className="rounded-2xl border p-5 text-left shadow-sm transition-transform duration-150 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400 active:scale-95"
              onClick={() => setConfirmFindOpen(true)}
            >
              <h2 className="text-lg font-semibold">Find Existing Packet</h2>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                Go to Records to search existing submissions.
              </p>
            </button>
          </div>
        </section>
      </Container>

      {/* Confirm Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl dark:bg-zinc-950">
            <h3 className="text-lg font-semibold">Create a new packet?</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">You can fill the form on the next page. This is a front‑end demo only.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button className="rounded-xl border border-black px-3 py-2 text-sm text-black hover:bg-zinc-100" onClick={() => setConfirmOpen(false)}>Cancel</button>
              <button className="rounded-xl border border-black bg-zinc-100 px-3 py-2 text-sm font-semibold text-black hover:bg-zinc-200" onClick={() => navigate("/advising/new")}>Continue</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Find Modal */}
      {confirmFindOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl dark:bg-zinc-950">
            <h3 className="text-lg font-semibold">Go find an existing packet?</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">This will take you to the Records page to search. (UI demo only)</p>
            <div className="mt-6 flex justify-end gap-3">
              <button className="rounded-xl border border-black px-3 py-2 text-sm text-black hover:bg-zinc-100" onClick={() => setConfirmFindOpen(false)}>Cancel</button>
              <button className="rounded-xl border border-black bg-zinc-100 px-3 py-2 text-sm font-semibold text-black hover:bg-zinc-200" onClick={() => navigate("/records")}>Continue</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// ---------- Advising Selection (Create New Packet) ---------- //

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

function AdvisingSelectionPage() {
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
      setLoadingTpl(true); setErrTpl(null);
      try {
        const res = await api<unknown>("/templates");
        const arr = firstArrayFrom(res);
        const mapped = arr.map((t) => ({ id: Number(t["id"] ?? t["template_id"]), name: String(t["name"] ?? t["title"] ?? "Template") }));
        setTemplates(mapped);
        if (!templateId && mapped[0]) setTemplateId(mapped[0].id);
      } catch (e) {
        setErrTpl(errorMessage(e));
      } finally { setLoadingTpl(false); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // load sections for the chosen template
    if (!templateId) { setSections([]); setSelectedSections([]); return; }
    (async () => {
      setLoadingSections(true);
      try {
        const res = await api<Record<string, unknown>>(`/templates/${templateId}/builder`);
        const arr = firstArrayFrom((res as Record<string, unknown>)["sections"] ?? res);
        const mapped: BuilderSection[] = arr.map((rec) => ({
          template_section_id: Number((rec["template_section_id"] ?? rec["id"]) as number),
          title: String((rec["title"] ?? rec["name"] ?? "Section") as string),
          section_type: (rec["section_type"] as string | undefined),
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
      } finally { setLoadingSections(false); }
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
            {requestId && <span className="mr-3">Request ID: <strong className="text-zinc-700">{requestId}</strong></span>}
            {packetId && <span>Packet ID: <strong className="text-zinc-700">{packetId}</strong></span>}
          </div>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Fill in student details. Major selection will show example prompts (demo only).</p>

          <form className="mt-6 grid gap-5">
            {/* Name */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label htmlFor="first" className="text-sm font-medium">First Name</label>
                <input id="first" value={form.first} onChange={(e) => setForm({ ...form, first: e.target.value })} className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-amber-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100" />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="last" className="text-sm font-medium">Last Name</label>
                <input id="last" value={form.last} onChange={(e) => setForm({ ...form, last: e.target.value })} className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-amber-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100" />
              </div>
            </div>

            {/* Emails */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label htmlFor="email" className="text-sm font-medium">Student Email</label>
                <input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-amber-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100" />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="inst" className="text-sm font-medium">Student Institutional Email</label>
                <input id="inst" type="email" value={form.inst} onChange={(e) => setForm({ ...form, inst: e.target.value })} className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-amber-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100" />
              </div>
            </div>

            {/* Major */}
            <div className="grid gap-1.5">
              <label htmlFor="major" className="text-sm font-medium">Intended Major</label>
              <select id="major" value={form.major} onChange={(e) => setForm({ ...form, major: e.target.value })} className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-amber-400 dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-100">
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
                    <option value="" disabled>{loadingTpl ? "Loading templates…" : errTpl ? `Error: ${errTpl}` : "Select a template"}</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-2">
                  <label className="text-xs text-zinc-500">Quick actions</label>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="rounded border border-black bg-zinc-100 px-2 py-1 text-xs" onClick={() => setSelectedSections(sections.filter(s=>!s.optional).map(s=>s.template_section_id))}>Required only</button>
                    <button type="button" className="rounded border border-black bg-zinc-100 px-2 py-1 text-xs" onClick={() => setSelectedSections(sections.map(s=>s.template_section_id))}>Select all</button>
                    <button type="button" className="rounded border border-black bg-zinc-100 px-2 py-1 text-xs" onClick={() => setSelectedSections(sections.filter(s=>s.optional && s.is_default).map(s=>s.template_section_id))}>Defaults</button>
                    <button type="button" className="rounded border border-black bg-zinc-100 px-2 py-1 text-xs" onClick={() => setSelectedSections([])}>Clear</button>
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
                      <li key={s.template_section_id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{s.title}</div>
                          <div className="text-xs text-zinc-500">{s.section_type || "section"}{s.optional ? " • optional" : " • required"}</div>
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
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.preventDefault(); window.history.back(); }}
              >
                Back
              </button>
              
              <button
                className="rounded-xl border border-black bg-zinc-100 px-3 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
                onClick={async (e: React.MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  try {
                    // Updated payload fields to match backend expectations
                    const payload = {
                      student_name: `${form.first} ${form.last}`.trim(),
                      student_email: form.email,
                      source_institution: form.inst,
                      target_program: form.major,
                    };
                    const r = await api<{ id?: number; request_id?: number }>("/requests", "POST", payload);
                    const newId = (r.id ?? r.request_id);
                    if (newId) setRequestId(Number(newId));
                    alert("Request created.");
                  } catch (err: unknown) {
                    alert(errorMessage(err) || "Failed to create request");
                  }
                }}
              >
                Save Request
              </button>

              <button
                className="rounded-xl border border-black bg-zinc-100 px-3 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
                onClick={async (e: React.MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  if (!requestId) { alert("Create or load a request first."); return; }
                  try {
                    const tplId = templateId;
                    if (!tplId) { alert("Pick a template first."); return; }
                    const out = await api<{ id?: number; packet_id?: number }>(
                      "/packets/generate",
                      "POST",
                      { request_id: requestId, template_id: tplId, include_section_ids: selectedSections }
                    );
                    const pid = (out.id ?? out.packet_id);
                    if (pid) setPacketId(Number(pid));
                    alert("Packet generated.");
                  } catch (err: unknown) {
                    alert(errorMessage(err) || "Failed to generate packet");
                  }
                }}
              >
                Generate Packet
              </button>
              
              <button
                className="rounded-xl border border-black bg-zinc-100 px-3 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
                onClick={async (e: React.MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  try {
                    const out = await api<{ path: string }>("/packets/export", "POST", {
                      packet_id: packetId,
                      format: "docx"
                    });

                    if (!out.path) {
                      alert("Export failed: no file path returned.");
                      return;
                    }

                    // Build full URL
                    const url = out.path.startsWith("http")
                      ? out.path
                      : `${window.location.origin}/${out.path}`;

                  //Force browser to download instead of open new tab
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = url.split("/").pop() || "download";
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);

                  } catch (err: unknown) {
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

// ---------- Root ---------- //
export default function App() {
  useThemeInit();
  return (
    <BrowserRouter>
      <InnerApp />
    </BrowserRouter>
  );
}

function InnerApp() {
  const location = useLocation();
  const onLogin = location.pathname === "/login";
  return (
    <div className="min-h-dvh bg-white text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-50">
      {!onLogin && <AppNav />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<RequireAuth><HomePage /></RequireAuth>} />
        <Route path="/records" element={<RequireAuth><RecordsPage /></RequireAuth>} />
        <Route path="/advising" element={<RequireAuth><AdvisingCasePage /></RequireAuth>} />
        <Route path="/advising/new" element={<RequireAuth><AdvisingSelectionPage /></RequireAuth>} />
        <Route path="/advising/request/:requestId" element={<RequireAuth><AdvisingSelectionPage /></RequireAuth>} />
      </Routes>
      {!onLogin && <AppFooter />}
    </div>
  );
}