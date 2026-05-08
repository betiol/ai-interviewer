"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Job, Session, Turn } from "@/lib/types";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";
import { newSessionId, saveSession } from "@/lib/sessionStore";
import DecisionPanel from "./DecisionPanel";

type Props = { job: Job };

const TOTAL_QUESTIONS = 6;

export default function InterviewRoom({ job }: Props) {
  const router = useRouter();
  const [sessionId] = useState(() => newSessionId());
  const [startedAt] = useState(() => Date.now());
  const [turns, setTurns] = useState<Turn[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [questionNumber, setQuestionNumber] = useState(0);
  const [pendingAnswer, setPendingAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const speech = useSpeechRecognition({
    onResult: (text) =>
      setPendingAnswer((prev) => (prev ? prev + " " : "") + text),
  });

  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void requestNext([], undefined);
  }, []);

  function persist(updates: Partial<Session>) {
    saveSession({
      id: sessionId,
      jobId: job.id,
      startedAt,
      turns: [],
      state: "in_progress",
      questionCount: 0,
      ...updates,
    });
  }

  // If a turn fails, we keep the answer around so the user can retry without
  // having to re-speak it.
  const [lastFailedAnswer, setLastFailedAnswer] = useState<string | undefined>(
    undefined,
  );

  async function requestNext(history: Turn[], answer: string | undefined) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/interview/turn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          turns: history,
          candidateAnswer: answer,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error ?? `Request failed (${res.status})`);
      }
      const data = (await res.json()) as {
        question?: string;
        questionNumber?: number;
        done?: boolean;
        evaluation?: Session["evaluation"];
        turns: Turn[];
      };

      setTurns(data.turns);
      setLastFailedAnswer(undefined);

      if (data.done && data.evaluation) {
        persist({
          turns: data.turns,
          state: "completed",
          questionCount: TOTAL_QUESTIONS,
          evaluation: data.evaluation,
        });
        router.push(`/session/${sessionId}`);
        return;
      }

      if (data.question) {
        setCurrentQuestion(data.question);
        setQuestionNumber(data.questionNumber ?? questionNumber + 1);
        persist({
          turns: data.turns,
          questionCount: data.questionNumber ?? questionNumber + 1,
        });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      // Stash the answer (if any) so the user can retry the same turn
      setLastFailedAnswer(answer);
    } finally {
      setLoading(false);
    }
  }

  function submitAnswer() {
    const answer = pendingAnswer.trim();
    if (!answer || loading) return;
    if (speech.listening) speech.stop();
    setPendingAnswer("");
    void requestNext(turns, answer);
  }

  function retryLast() {
    if (loading) return;
    void requestNext(turns, lastFailedAnswer);
  }

  return (
    <div className="flex flex-1 flex-col px-6 py-10 max-w-6xl w-full mx-auto">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <Link
            href="/"
            className="text-xs text-zinc-500 hover:text-zinc-300 mb-2 inline-block"
          >
            ← Back to roles
          </Link>
          <h1 className="text-2xl font-semibold text-white">{job.title}</h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            {job.shortDescription}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">Question</p>
          <p className="text-2xl font-mono text-white">
            {questionNumber || "-"}
            <span className="text-base text-zinc-600">/{TOTAL_QUESTIONS}</span>
          </p>
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300 flex items-start justify-between gap-4">
          <span>{error}</span>
          <button
            type="button"
            onClick={retryLast}
            disabled={loading}
            className="shrink-0 inline-flex items-center gap-1 rounded-md border border-red-800/60 bg-red-950/50 px-3 py-1 text-xs font-medium text-red-200 hover:bg-red-900/50 disabled:opacity-40"
          >
            {loading ? "Retrying…" : "Retry"}
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 mb-6 min-h-[120px]">
        <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
          Interviewer
        </p>
        <p className="text-lg text-white leading-relaxed">
          {loading && !currentQuestion
            ? "Preparing your first question…"
            : currentQuestion || "—"}
        </p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 mb-4">
        {speech.supported ? (
          <div className="flex flex-col items-center gap-4 py-2">
            <button
              type="button"
              onClick={() =>
                speech.listening ? speech.stop() : speech.start()
              }
              disabled={loading}
              aria-label={speech.listening ? "Stop recording" : "Start recording"}
              className={`relative inline-flex items-center justify-center h-24 w-24 rounded-full transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                speech.listening
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-zinc-800 hover:bg-zinc-700"
              }`}
            >
              {speech.listening && (
                <span className="absolute inset-0 rounded-full bg-red-500/40 animate-ping" />
              )}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-10 w-10 text-white relative"
              >
                <rect x="9" y="2" width="6" height="12" rx="3" />
                <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </button>
            <p className="text-sm text-zinc-400 h-5">
              {speech.listening
                ? "Listening… tap to stop"
                : pendingAnswer
                ? "Tap mic again to add more, or submit below"
                : "Tap to start speaking"}
            </p>
            {pendingAnswer && (
              <div className="w-full rounded-lg bg-zinc-950/50 border border-zinc-800 p-3 text-sm text-zinc-200 whitespace-pre-wrap">
                {pendingAnswer}
              </div>
            )}
            <details className="w-full text-xs text-zinc-500">
              <summary className="cursor-pointer hover:text-zinc-300 text-center">
                Use keyboard instead
              </summary>
              <textarea
                value={pendingAnswer}
                onChange={(e) => setPendingAnswer(e.target.value)}
                placeholder="Type your answer here."
                rows={4}
                className="mt-3 w-full rounded-lg bg-zinc-950/50 border border-zinc-800 p-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 resize-none"
                disabled={loading}
              />
            </details>
          </div>
        ) : (
          <>
            <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
              Your answer
            </p>
            <p className="text-xs text-amber-400 mb-3">
              Voice input isn&apos;t supported in this browser — type your answer
              below. (Try Chrome or Edge for voice mode.)
            </p>
            <textarea
              value={pendingAnswer}
              onChange={(e) => setPendingAnswer(e.target.value)}
              placeholder="Type your answer here."
              rows={4}
              className="w-full bg-transparent text-white placeholder:text-zinc-600 focus:outline-none resize-none"
              disabled={loading}
            />
          </>
        )}
        <div className="flex justify-end mt-4 pt-4 border-t border-zinc-800">
          <button
            type="button"
            onClick={submitAnswer}
            disabled={!pendingAnswer.trim() || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-200 transition-colors"
          >
            {loading ? "Thinking…" : "Submit answer"}
          </button>
        </div>
      </div>

      {turns.length > 1 && (
        <details className="mt-4">
          <summary className="text-xs text-zinc-500 cursor-pointer hover:text-zinc-300">
            Transcript so far ({turns.length} turns)
          </summary>
          <div className="mt-3 space-y-3">
            {turns.map((t, i) => (
              <div
                key={i}
                className={`text-sm ${
                  t.role === "interviewer"
                    ? "text-zinc-300"
                    : "text-zinc-400 pl-4 border-l-2 border-zinc-800"
                }`}
              >
                <span className="text-xs uppercase tracking-wider text-zinc-600 mr-2">
                  {t.role === "interviewer" ? "Q" : "A"}
                </span>
                {t.text}
              </div>
            ))}
          </div>
        </details>
      )}
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <DecisionPanel turns={turns} />
        </div>
      </div>
    </div>
  );
}
