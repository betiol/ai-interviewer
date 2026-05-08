"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Session } from "@/lib/types";
import { listSessions } from "@/lib/sessionStore";
import { getJob } from "@/lib/jobs";

export default function HistoryPage() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    setSessions(listSessions());
  }, []);

  if (sessions === null) {
    return (
      <div className="flex flex-1 items-center justify-center text-zinc-500 text-sm">
        Loading…
      </div>
    );
  }

  const filtered =
    filter === "all" ? sessions : sessions.filter((s) => s.jobId === filter);

  const roles = Array.from(new Set(sessions.map((s) => s.jobId)));

  return (
    <div className="flex flex-1 flex-col px-6 sm:px-10 lg:px-16 py-12 lg:py-20 max-w-5xl w-full mx-auto">
      <header className="mb-10">
        <Link
          href="/"
          className="text-xs text-zinc-500 hover:text-zinc-300 mb-3 inline-block"
        >
          ← Back to roles
        </Link>
        <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500 mb-3">
          Session history
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">
          Your past interviews
        </h1>
        <p className="text-sm text-zinc-500">
          Stored locally in this browser. Clear your site data to wipe them.
        </p>
      </header>

      {sessions.length === 0 ? (
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-10 text-center">
          <p className="text-zinc-400 mb-4">No sessions yet.</p>
          <Link
            href="/"
            className="inline-flex items-center rounded-md bg-white text-zinc-950 px-4 py-2 text-sm font-medium hover:bg-zinc-200 transition-colors"
          >
            Start your first interview
          </Link>
        </div>
      ) : (
        <>
          <AggregateStats sessions={filtered} />

          {roles.length > 1 && (
            <div className="mb-6 flex flex-wrap gap-2">
              <FilterPill
                active={filter === "all"}
                onClick={() => setFilter("all")}
                label={`All (${sessions.length})`}
              />
              {roles.map((rid) => {
                const role = getJob(rid);
                const count = sessions.filter((s) => s.jobId === rid).length;
                return (
                  <FilterPill
                    key={rid}
                    active={filter === rid}
                    onClick={() => setFilter(rid)}
                    label={`${role?.title ?? rid} (${count})`}
                  />
                );
              })}
            </div>
          )}

          <ul className="space-y-3">
            {filtered.map((s) => (
              <SessionRow key={s.id} session={s} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function FilterPill({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors border ${
        active
          ? "bg-white text-zinc-950 border-white"
          : "bg-zinc-900/60 text-zinc-300 border-zinc-800 hover:bg-zinc-800"
      }`}
    >
      {label}
    </button>
  );
}

function AggregateStats({ sessions }: { sessions: Session[] }) {
  const completed = sessions.filter(
    (s) => s.state === "completed" && typeof s.evaluation?.overallScore === "number",
  );
  const scoresChrono = [...completed]
    .sort((a, b) => a.startedAt - b.startedAt)
    .map((s) => s.evaluation!.overallScore);
  const avg =
    scoresChrono.length > 0
      ? Math.round(
          (scoresChrono.reduce((a, b) => a + b, 0) / scoresChrono.length) * 10,
        ) / 10
      : null;

  const totalMinutes = sessions.reduce((sum, s) => {
    const last = s.turns[s.turns.length - 1]?.ts ?? s.startedAt;
    return sum + Math.max(1, Math.round((last - s.startedAt) / 60000));
  }, 0);

  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-3 rounded-2xl border border-zinc-800/80 bg-zinc-900/30 p-5">
      <Stat label="Sessions" value={sessions.length.toString()} />
      <Stat
        label="Avg score"
        value={avg !== null ? `${avg}/10` : "—"}
        accent={avg !== null ? scoreColor(avg) : undefined}
      />
      <div>
        <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-2">
          Score trend
        </p>
        {scoresChrono.length >= 2 ? (
          <Sparkline scores={scoresChrono} />
        ) : (
          <p className="text-sm text-zinc-600">
            {scoresChrono.length === 1 ? "Need 2+ sessions" : "—"}
          </p>
        )}
      </div>
      <p className="sm:col-span-3 text-[11px] text-zinc-600 font-mono">
        total time: {totalMinutes} min
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-1">
        {label}
      </p>
      <p
        className={`text-2xl font-mono font-semibold ${accent ?? "text-white"}`}
      >
        {value}
      </p>
    </div>
  );
}

function Sparkline({ scores }: { scores: number[] }) {
  const W = 160;
  const H = 32;
  const max = 10;
  const min = 0;
  const stepX = scores.length > 1 ? W / (scores.length - 1) : W;
  const points = scores.map((s, i) => {
    const x = i * stepX;
    const y = H - ((s - min) / (max - min)) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = scores[scores.length - 1];
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      className="overflow-visible"
      aria-label={`Score trend: ${scores.join(", ")}`}
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className={scoreColor(last)}
      />
      {points.map((p, i) => {
        const [x, y] = p.split(",");
        return (
          <circle
            key={i}
            cx={x}
            cy={y}
            r={i === points.length - 1 ? 3 : 1.5}
            className={scoreColor(scores[i]).replace("text-", "fill-")}
          />
        );
      })}
    </svg>
  );
}

function SessionRow({ session }: { session: Session }) {
  const job = getJob(session.jobId);
  const candidateTurns = session.turns.filter((t) => t.role === "candidate");
  const interviewerTurns = session.turns.filter(
    (t) => t.role === "interviewer",
  );
  const candidateChars = candidateTurns.reduce(
    (sum, t) => sum + t.text.length,
    0,
  );
  const interviewerChars = interviewerTurns.reduce(
    (sum, t) => sum + t.text.length,
    0,
  );
  const totalChars = candidateChars + interviewerChars;
  const candidatePct =
    totalChars > 0 ? Math.round((candidateChars / totalChars) * 100) : 0;

  const lastTs = session.turns[session.turns.length - 1]?.ts ?? session.startedAt;
  const durationMs = lastTs - session.startedAt;
  const minutes = Math.max(1, Math.round(durationMs / 60000));

  const topicSet = new Set<string>();
  for (const t of interviewerTurns) {
    if (t.signals?.topicsCovered) {
      for (const topic of t.signals.topicsCovered) {
        topicSet.add(topic.toLowerCase().trim());
      }
    }
  }
  const topicCount = topicSet.size;

  const score = session.evaluation?.overallScore;

  return (
    <li>
      <Link
        href={`/session/${session.id}`}
        className="block rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-5 hover:border-zinc-700 hover:bg-zinc-900/60 transition-colors"
      >
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h3 className="text-base font-medium text-white mb-1">
              {job?.title ?? session.jobId}
            </h3>
            <p className="text-xs text-zinc-500">
              {new Date(session.startedAt).toLocaleString()} · {minutes} min ·{" "}
              {session.questionCount} questions · {topicCount} topics
            </p>
          </div>
          <div className="text-right shrink-0">
            {session.state === "completed" && typeof score === "number" ? (
              <p className={`text-2xl font-mono font-semibold ${scoreColor(score)}`}>
                {score}
                <span className="text-sm text-zinc-600">/10</span>
              </p>
            ) : (
              <span className="inline-flex items-center rounded-md bg-amber-950/40 border border-amber-900/40 px-2 py-0.5 text-xs text-amber-300">
                In progress
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-emerald-500/70"
              style={{ width: `${candidatePct}%` }}
            />
          </div>
          <span className="text-[11px] text-zinc-500 tabular-nums">
            {candidatePct}% candidate
          </span>
        </div>
      </Link>
    </li>
  );
}

function scoreColor(score: number) {
  if (score >= 8) return "text-emerald-400";
  if (score >= 6) return "text-amber-400";
  return "text-rose-400";
}
