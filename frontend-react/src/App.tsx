import React, { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  NavLink,
  useLocation,
  Outlet,
  Navigate,
} from "react-router-dom";
import { api } from "./lib/api";
import { Container } from "./lib/ui";

import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import RecordsPage from "./pages/RecordsPage";
//import AdvisingCasePage from "./pages/AdvisingCasePage";
import AdvisingSelectionPage from "./pages/AdvisingSelectionPage";
import AdminPage from "./pages/AdminPage";

// ---------- Auth helpers ---------- //
function RequireAuth() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // /api/auth/me returns {id, role} when logged in,
        // and {user: null} when not logged in.
        const me = await api<{ id?: number; user?: unknown }>("/auth/me");

        if (me && typeof me.id === "number") {
          // Logged in
          setAuthorized(true);
        } else {
          // Not logged in (e.g., { user: null })
          setAuthorized(false);
        }
      } catch {
        // Network or other error -> treat as not authorized
        setAuthorized(false);
      }
    })();
  }, []);

  // Still loading auth state
  if (authorized === null) {
    return null;
  }

  // Not authorized: redirect to login
  if (authorized === false) {
    return <Navigate to="/login" replace />;
  }

  // Authorized: render nested protected routes
  return <Outlet />;
}

// ---------- Theme init ---------- //
function useThemeInit() {
  useEffect(() => {
    try {
      const saved = localStorage.getItem("theme");
      const shouldDark = saved === "dark";
      document.documentElement.classList.toggle("dark", shouldDark);
    } catch {
      document.documentElement.classList.remove("dark");
    }
  }, []);
}

// ---------- Top Nav & Footer ---------- //
function AppNav() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await api<{ role?: string }>("/auth/me");
        setIsAdmin(me.role === "admin");
      } catch {
        setIsAdmin(false);
      }
    })();
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b bg-white/85 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-zinc-950/70">
      <Container>
        <div className="grid h-16 grid-cols-[1fr,auto,1fr] items-center">
          <div />
          <Link to="/" className="justify-self-center" aria-label="UMBC Home">
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex size-9 items-center justify-center rounded-lg bg-black font-black text-amber-400">
                U
              </span>
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
                } catch {
                  /* ignore */
                }
              }}
              className="rounded-xl border border-zinc-300 bg-zinc-100 px-3 py-2 text-sm text-zinc-900 hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
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
                  /* ignore */
                }
                window.location.href = "/login";
              }}
            >
              Log out
            </button>
          </div>
        </div>

        <nav className="flex items-center justify-center gap-1 py-2">
          {(() => {
            const linkBase =
              "rounded-xl px-3 py-2 text-sm font-medium text-black border border-transparent hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-amber-400";
            const active = ({ isActive }: { isActive: boolean }) =>
              isActive ? `${linkBase} bg-zinc-200 text-black border border-black` : linkBase;
            return (
              <>
                <NavLink to="/" className={active} end>
                  Home
                </NavLink>
                <NavLink to="/records" className={active}>
                  Advising Requests
                </NavLink>
                <NavLink to="/advising" className={active}>
                  Making Advising Packets
                </NavLink>
                {isAdmin && (
                  <NavLink to="/admin" className={active}>
                    Admin
                  </NavLink>
                )}
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
          <p>© {new Date().getFullYear()} UMBC Pre-Transfer Advising (UI demo)</p>
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
        {/* Public route */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes */}
        <Route element={<RequireAuth />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/records" element={<RecordsPage />} />

          {/* ⬇️ Changed: /advising now goes straight to AdvisingSelectionPage */}
          <Route path="/advising" element={<AdvisingSelectionPage />} />

          {/* ⬇️ Optional: keep /advising/new as a redirect for backward compatibility */}
          <Route
            path="/advising/new"
            element={<Navigate to="/advising" replace />}
          />

          {/* Still allow deep links for a specific request */}
          <Route
            path="/advising/request/:requestId"
            element={<AdvisingSelectionPage />}
          />

          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Routes>
      {!onLogin && <AppFooter />}
    </div>
  );
}