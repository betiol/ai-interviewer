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
    const question = await generateNextQuestion(job, working, upcoming);
    const nextTurns: Turn[] = [
      ...working,
      { role: "interviewer", text: question, ts: Date.now() },
    ];
    return NextResponse.json({
      question,
      questionNumber: upcoming,
      totalQuestions: TARGET_QUESTIONS,
      turns: nextTurns,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Interviewer failed" },
      { status: 500 },
    );
  }
}
