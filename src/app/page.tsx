import Link from "next/link";
import { JOBS } from "@/lib/jobs";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 px-6 sm:px-10 lg:px-20 py-14 lg:py-24 max-w-6xl w-full mx-auto">
        {/* HERO */}
        <header className="mb-20 lg:mb-28">
          <div className="flex items-center gap-3 mb-8 text-[11px] font-mono uppercase tracking-[0.18em] text-zinc-500">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>System ready</span>
            <span className="text-zinc-700">/</span>
            <span>v0.1.0</span>
          </div>

          <h1 className="font-semibold text-white tracking-tight leading-[0.95] mb-8">
            <span className="block text-[15vw] sm:text-[88px] lg:text-[120px]">
              Interview
            </span>
            <span className="block text-[15vw] sm:text-[88px] lg:text-[120px] text-amber-300 italic font-light">
              ⟶ practice
            </span>
          </h1>

          <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-xl font-mono">
            A voice interviewer that adapts to what you say, shows you what
            it's noticing in real time, and writes you a structured evaluation
            when you finish.
          </p>
        </header>

        {/* ROLES: vertical numbered list */}
        <section>
          <div className="flex items-baseline justify-between mb-8 pb-3 border-b border-zinc-800/70">
            <h2 className="text-xs font-mono uppercase tracking-[0.18em] text-zinc-500">
              Roles available
            </h2>
            <span className="text-xs font-mono text-zinc-600">
              {JOBS.length.toString().padStart(2, "0")}
            </span>
          </div>

          <ul className="divide-y divide-zinc-800/70">
            {JOBS.map((job, i) => (
              <li key={job.id}>
                <Link
                  href={`/interview/${job.id}`}
                  className="group grid grid-cols-[auto_1fr_auto] items-center gap-6 py-7 lg:py-8 transition-colors hover:bg-zinc-900/30 -mx-4 px-4 rounded-xl"
                >
                  <span className="font-mono text-sm text-zinc-600 group-hover:text-amber-300 transition-colors w-8">
                    {(i + 1).toString().padStart(2, "0")}
                  </span>

                  <div className="min-w-0">
                    <h3 className="text-2xl lg:text-3xl font-semibold text-white tracking-tight mb-1.5 group-hover:text-amber-50 transition-colors">
                      {job.title}
                    </h3>
                    <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
                      {job.shortDescription}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] font-mono uppercase tracking-wider text-zinc-600">
                      <span>{job.estimatedMinutes}</span>
                      <span className="text-zinc-800">·</span>
                      <span>6 questions</span>
                      <span className="text-zinc-800">·</span>
                      <span>voice-driven</span>
                    </div>
                  </div>

                  <span className="font-mono text-2xl text-zinc-700 group-hover:text-amber-300 group-hover:translate-x-1 transition-all">
                    ⟶
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* STATUS BAR — terminal-style sticky footer */}
      <footer className="border-t border-zinc-800/70 bg-zinc-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-20 py-3 flex flex-wrap items-center justify-between gap-4 text-[11px] font-mono text-zinc-500">
          <div className="flex items-center gap-4">
            <Link
              href="/history"
              className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-amber-300 transition-colors"
            >
              <span className="text-zinc-600">$</span> session history
            </Link>
            <span className="text-zinc-700 hidden sm:inline">·</span>
            <span className="hidden sm:inline">
              chrome / edge recommended for voice
            </span>
          </div>
          <span className="text-zinc-600">
            built for the AfterQuery LatAM take-home
          </span>
        </div>
      </footer>
    </div>
  );
}
