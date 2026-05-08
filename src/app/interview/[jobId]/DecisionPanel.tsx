"use client";

import type { Turn, InterviewerSignals } from "@/lib/types";

type Props = {
  turns: Turn[];
};

function mergeSignals(turns: Turn[]): InterviewerSignals & { turnsWithData: number } {
  const interviewerTurns = turns.filter((t) => t.role === "interviewer" && t.signals);
  const latest = interviewerTurns[interviewerTurns.length - 1]?.signals;

  if (!latest) {
    return {
      skillsDemonstrated: [],
      topicsCovered: [],
      gaps: [],
      rationale: "",
      turnsWithData: 0,
    };
  }

  return {
    ...latest,
    turnsWithData: interviewerTurns.length,
  };
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  return items.filter((s) => {
    const k = s.toLowerCase().trim();
    if (seen.has(k) || !k) return false;
    seen.add(k);
    return true;
  });
}

export default function DecisionPanel({ turns }: Props) {
  const signals = mergeSignals(turns);
  const skills = dedupe(signals.skillsDemonstrated);
  const topics = dedupe(signals.topicsCovered);
  const gaps = dedupe(signals.gaps);

  return (
    <aside className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5 text-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
          Interviewer state
        </p>
        <span className="text-xs text-zinc-600 font-mono">
          live
        </span>
      </div>

      {signals.turnsWithData === 0 ? (
        <p className="text-xs text-zinc-500 italic">
          Signals will appear after the first question is asked.
        </p>
      ) : (
        <div className="space-y-5">
          {signals.rationale && (
            <Section
              label="Why this question"
              accent="text-sky-400"
            >
              <p className="text-zinc-300 leading-relaxed text-[13px]">
                {signals.rationale}
              </p>
            </Section>
          )}

          <Section
            label={`Skills detected (${skills.length})`}
            accent="text-emerald-400"
          >
            {skills.length > 0 ? (
              <ChipList items={skills} tone="emerald" />
            ) : (
              <Empty>No skills surfaced yet.</Empty>
            )}
          </Section>

          <Section
            label={`Topics covered (${topics.length})`}
            accent="text-zinc-400"
          >
            {topics.length > 0 ? (
              <ChipList items={topics} tone="zinc" />
            ) : (
              <Empty>No topics covered yet.</Empty>
            )}
          </Section>

          <Section
            label={`Open gaps (${gaps.length})`}
            accent="text-amber-400"
          >
            {gaps.length > 0 ? (
              <ChipList items={gaps} tone="amber" />
            ) : (
              <Empty>All planned areas covered.</Empty>
            )}
          </Section>
        </div>
      )}
    </aside>
  );
}

function Section({
  label,
  accent,
  children,
}: {
  label: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className={`text-[11px] uppercase tracking-wider mb-2 font-medium ${accent}`}>
        {label}
      </p>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-zinc-600 italic">{children}</p>;
}

const TONES = {
  emerald: "border-emerald-900/60 bg-emerald-950/30 text-emerald-200",
  zinc: "border-zinc-800 bg-zinc-900/60 text-zinc-300",
  amber: "border-amber-900/60 bg-amber-950/30 text-amber-200",
} as const;

function ChipList({ items, tone }: { items: string[]; tone: keyof typeof TONES }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span
          key={i}
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] ${TONES[tone]}`}
        >
          {item}
        </span>
      ))}
    </div>
  );
}
