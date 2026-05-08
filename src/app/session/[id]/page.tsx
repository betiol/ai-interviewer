"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import type { Session } from "@/lib/types";
import { getJob } from "@/lib/jobs";
import { loadSession } from "@/lib/sessionStore";
import EvaluationView from "./EvaluationView";

export default function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    setSession(loadSession(id) ?? null);
  }, [id]);

  if (session === undefined) {
    return (
      <div className="flex flex-1 items-center justify-center text-zinc-500">
        Loading session…
      </div>
    );
  }

  if (session === null) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center px-6">
        <h1 className="text-2xl font-semibold text-white mb-2">
          Session not found
        </h1>
        <p className="text-zinc-400 mb-6 max-w-md">
          Sessions are stored locally in your browser. If you cleared storage or
          opened this link on a different device, the data isn&apos;t available
          here.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-zinc-200"
        >
          Back to roles
        </Link>
      </div>
    );
  }

  const job = getJob(session.jobId);

  return (
    <div className="flex flex-1 flex-col px-6 py-10 max-w-4xl w-full mx-auto">
      <header className="mb-8">
        <Link
          href="/"
          className="text-xs text-zinc-500 hover:text-zinc-300 mb-2 inline-block"
        >
          ← Back to roles
        </Link>
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-2">
          Session results
        </p>
        <h1 className="text-3xl font-semibold text-white">
          {job?.title ?? "Unknown role"}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          {new Date(session.startedAt).toLocaleString()} ·{" "}
          {session.state === "completed" ? "Complete" : "In progress"}
        </p>
      </header>

      {session.evaluation ? (
        <EvaluationView evaluation={session.evaluation} />
      ) : (
        <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-4 text-sm text-amber-200 mb-8">
          Evaluation not yet generated. Finish the interview to see it here.
        </div>
      )}

      <section>
        <h2 className="text-lg font-medium text-white mb-4">Transcript</h2>
        <div className="space-y-4">
          {session.turns.map((t, i) => (
            <div
              key={i}
              className={
                t.role === "interviewer"
                  ? "rounded-lg border border-zinc-800 bg-zinc-900/40 p-4"
                  : "rounded-lg bg-zinc-900/20 p-4 border border-transparent"
              }
            >
              <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
                {t.role === "interviewer" ? "Interviewer" : "Candidate"}
              </p>
              <p
                className={`text-sm leading-relaxed ${
                  t.role === "interviewer" ? "text-zinc-100" : "text-zinc-300"
                }`}
              >
                {t.text}
              </p>
              {t.signals?.rationale && (
                <details className="mt-3">
                  <summary className="text-[11px] uppercase tracking-wider text-sky-500 cursor-pointer hover:text-sky-300">
                    Why this question
                  </summary>
                  <p className="mt-2 text-xs text-zinc-400 leading-relaxed italic">
                    {t.signals.rationale}
                  </p>
                </details>
              )}
            </div>
          ))}
        </div>
      </section>

      <details className="mt-10">
        <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-300">
          Raw session JSON
        </summary>
        <pre className="mt-3 text-xs bg-zinc-950 border border-zinc-800 rounded-lg p-4 overflow-x-auto text-zinc-400">
          {JSON.stringify(session, null, 2)}
        </pre>
      </details>
    </div>
  );
}
