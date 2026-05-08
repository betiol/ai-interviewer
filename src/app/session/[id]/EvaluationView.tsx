"use client";

import type { Evaluation } from "@/lib/types";

type Props = { evaluation: Evaluation };

function scoreColor(score: number) {
  if (score >= 8) return "text-emerald-400";
  if (score >= 6) return "text-amber-400";
  return "text-rose-400";
}

export default function EvaluationView({ evaluation }: Props) {
  return (
    <section className="mb-10 rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
      <div className="flex items-start justify-between mb-6 gap-6">
        <div>
          <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
            Evaluation
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed max-w-2xl">
            {evaluation.summary}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-zinc-500">Score</p>
          <p className={`text-4xl font-mono font-semibold ${scoreColor(evaluation.overallScore)}`}>
            {evaluation.overallScore}
            <span className="text-lg text-zinc-600">/10</span>
          </p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wider text-emerald-400 mb-2">
            Strengths
          </p>
          <ul className="space-y-2">
            {evaluation.strengths.map((s, i) => (
              <li key={i} className="text-sm text-zinc-300 flex gap-2">
                <span className="text-emerald-400 shrink-0">+</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-amber-400 mb-2">
            Concerns
          </p>
          <ul className="space-y-2">
            {evaluation.concerns.map((c, i) => (
              <li key={i} className="text-sm text-zinc-300 flex gap-2">
                <span className="text-amber-400 shrink-0">!</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
