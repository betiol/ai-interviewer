import { NextResponse } from "next/server";
import { getJob } from "@/lib/jobs";
import {
  generateEvaluation,
  generateNextQuestion,
  TARGET_QUESTIONS,
} from "@/lib/interviewer";
import type { Turn } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  jobId?: string;
  turns?: Turn[];
  candidateAnswer?: string;
};

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const job = body.jobId ? getJob(body.jobId) : undefined;
  if (!job) {
    return NextResponse.json({ error: "Unknown jobId" }, { status: 400 });
  }

  const incomingTurns = Array.isArray(body.turns) ? body.turns : [];
  const answer = body.candidateAnswer?.trim();

  const working: Turn[] = answer
    ? [...incomingTurns, { role: "candidate", text: answer, ts: Date.now() }]
    : incomingTurns;

  const askedSoFar = working.filter((t) => t.role === "interviewer").length;

  try {
    if (answer && askedSoFar >= TARGET_QUESTIONS) {
      const evaluation = await generateEvaluation(job, working);
      return NextResponse.json({
        done: true,
        evaluation,
        turns: working,
      });
    }

    const upcoming = askedSoFar + 1;
    const { question, signals } = await generateNextQuestion(
      job,
      working,
      upcoming,
    );
    const nextTurns: Turn[] = [
      ...working,
      { role: "interviewer", text: question, ts: Date.now(), signals },
    ];
    return NextResponse.json({
      question,
      signals,
      questionNumber: upcoming,
      totalQuestions: TARGET_QUESTIONS,
      turns: nextTurns,
    });
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    let message = "The interviewer ran into an error. Please try again.";
    let status = 500;
    if (/overloaded|529/i.test(raw)) {
      message =
        "The model is overloaded right now. Wait a few seconds and try again.";
      status = 503;
    } else if (/rate[_ ]?limit|429/i.test(raw)) {
      message = "Rate limit hit — please wait a moment and try again.";
      status = 429;
    } else if (/api[_ ]?key|unauthorized|401/i.test(raw)) {
      message =
        "Server is missing or has an invalid API key. Set OPENROUTER_API_KEY or ANTHROPIC_API_KEY.";
      status = 500;
    }
    return NextResponse.json({ error: message, detail: raw }, { status });
  }
}
