import Link from "next/link";
import { JOBS } from "@/lib/jobs";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center px-6 py-16">
      <header className="w-full max-w-4xl mb-12">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-3">
          AI Interviewer
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-white mb-3">
          Pick a role to interview for
        </h1>
        <p className="text-zinc-400 max-w-2xl">
          Select one of the roles below to start a voice-driven interview. The
          interviewer adapts its questions to your answers and the role you
          choose.
        </p>
      </header>

      <div className="w-full max-w-4xl grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {JOBS.map((job) => (
          <Link
            key={job.id}
            href={`/interview/${job.id}`}
            className="group rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 hover:border-zinc-600 hover:bg-zinc-900 transition-colors flex flex-col"
          >
            <h2 className="text-lg font-medium text-white mb-2 group-hover:text-white">
              {job.title}
            </h2>
            <p className="text-sm text-zinc-400 mb-6 flex-1">
              {job.shortDescription}
            </p>
            <span className="text-xs text-zinc-500 group-hover:text-zinc-300 inline-flex items-center gap-1">
              Start interview
              <span aria-hidden>→</span>
            </span>
          </Link>
        ))}
      </div>

      <footer className="mt-16 text-xs text-zinc-600">
        Built for the AfterQuery LatAM take-home.
      </footer>
    </div>
  );
}
