"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Job, Turn } from "@/lib/types";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";

type Props = { job: Job };

export default function InterviewRoom({ job }: Props) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [questionNumber, setQuestionNumber] = useState(0);
  const [pendingAnswer, setPendingAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const speech = useSpeechRecognition({
    onResult: (text) => setPendingAnswer((prev) => (prev ? prev + " " : "") + text),
  });

  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void start();
  }, []);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/interview/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as {
        sessionId: string;
        question: string;
        questionNumber: number;
      };
      setSessionId(data.sessionId);
      setCurrentQuestion(data.question);
      setQuestionNumber(data.questionNumber);
      setTurns([{ role: "interviewer", text: data.question, ts: Date.now() }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start interview");
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer() {
    const answer = pendingAnswer.trim();
    if (!answer || !sessionId || loading) return;
    if (speech.listening) speech.stop();

    const newTurns: Turn[] = [
      ...turns,
      { role: "candidate", text: answer, ts: Date.now() },
    ];
    setTurns(newTurns);
    setPendingAnswer("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/interview/turn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sessionId, answer }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as {
        question?: string;
        questionNumber?: number;
        done?: boolean;
      };

      if (data.done) {
        setDone(true);
      } else if (data.question) {
        setCurrentQuestion(data.question);
        setQuestionNumber(data.questionNumber ?? questionNumber + 1);
        setTurns([
          ...newTurns,
          { role: "interviewer", text: data.question, ts: Date.now() },
        ]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit answer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col px-6 py-10 max-w-4xl w-full mx-auto">
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
          </p>
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {done ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
          <h2 className="text-xl font-semibold text-white mb-2">
            Interview complete
          </h2>
          <p className="text-zinc-400 mb-6">
            We have generated your transcript and evaluation.
          </p>
          <Link
            href={`/session/${sessionId}`}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-zinc-950 hover:bg-zinc-200 transition-colors"
          >
            View results →
          </Link>
        </div>
      ) : (
        <>
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
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-wider text-zinc-500">
                Your answer
              </p>
              <div className="flex items-center gap-2">
                {!speech.supported && (
                  <span className="text-xs text-amber-400">
                    Voice input not supported in this browser — type below.
                  </span>
                )}
                {speech.supported && (
                  <button
                    type="button"
                    onClick={() =>
                      speech.listening ? speech.stop() : speech.start()
                    }
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                      speech.listening
                        ? "bg-red-500 text-white hover:bg-red-600"
                        : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        speech.listening
                          ? "bg-white animate-pulse"
                          : "bg-zinc-500"
                      }`}
                    />
                    {speech.listening ? "Listening…" : "Hold to talk"}
                  </button>
                )}
              </div>
            </div>
            <textarea
              value={pendingAnswer}
              onChange={(e) => setPendingAnswer(e.target.value)}
              placeholder={
                speech.supported
                  ? "Press the mic to speak, or type your answer here."
                  : "Type your answer here."
              }
              rows={4}
              className="w-full bg-transparent text-white placeholder:text-zinc-600 focus:outline-none resize-none"
            />
            <div className="flex justify-end mt-3">
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
        </>
      )}
    </div>
  );
}
