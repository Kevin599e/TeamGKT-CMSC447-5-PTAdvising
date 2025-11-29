import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container } from "../lib/ui";

export default function AdvisingCasePage() {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmFindOpen, setConfirmFindOpen] = useState(false);

  return (
    <main className="py-10">
      <Container>
        <section className="rounded-2xl border p-6">
          <h1 className="text-xl font-semibold tracking-tight">Advising Case</h1>
          <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
            Choose to create a new packet or find an existing one.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <button
              className="rounded-2xl border p-5 text-left shadow-sm transition-transform duration-150 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400 active:scale-95"
              onClick={() => setConfirmOpen(true)}
            >
              <h2 className="text-lg font-semibold">Create New Packet</h2>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
                Start a new advising packet for a student.
              </p>
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
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              You can fill the form on the next page. This is a front-end demo only.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-xl border border-black px-3 py-2 text-sm text-black hover:bg-zinc-100"
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-xl border border-black bg-zinc-100 px-3 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
                onClick={() => navigate("/advising/new")}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Find Modal */}
      {confirmFindOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-xl dark:bg-zinc-950">
            <h3 className="text-lg font-semibold">Go find an existing packet?</h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
              This will take you to the Records page to search. (UI demo only)
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-xl border border-black px-3 py-2 text-sm text-black hover:bg-zinc-100"
                onClick={() => setConfirmFindOpen(false)}
              >
                Cancel
              </button>
              <button
                className="rounded-xl border border-black bg-zinc-100 px-3 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
                onClick={() => navigate("/records")}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}