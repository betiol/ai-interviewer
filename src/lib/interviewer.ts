import Anthropic from "@anthropic-ai/sdk";
import type { Job, Turn, Evaluation, InterviewerSignals } from "./types";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
const FALLBACK_MODEL = process.env.ANTHROPIC_FALLBACK_MODEL ?? "claude-haiku-4-5";
const EVAL_MODEL = process.env.ANTHROPIC_EVAL_MODEL ?? MODEL;

export const TARGET_QUESTIONS = 6;
const FORCED_FOLLOWUPS = new Set([3, 5]);

let _client: Anthropic | null = null;
function client() {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
    _client = new Anthropic();
  }
  return _client;
}

function interviewerPrompt(job: Job, qNumber: number) {
  const isFollowup = FORCED_FOLLOWUPS.has(qNumber);
  const followup = isFollowup
    ? `This question MUST be a follow-up — quote a phrase from the candidate's last answer and dig into it. Do not change topics. Do not pull from the question pack.`
    : `This question introduces a new topic. Prefer drawing from the question pack below; you may rephrase or sharpen, but don't ignore the pack unless nothing in it fits the unexplored ground. Don't repeat topics already covered.

Important: if the candidate's previous answer was clearly thin or unconfident — for example they said they didn't know, gave a one-liner, or were off-topic — don't move on. Re-approach the same area from a different angle (a more specific version, an easier framing, or "what would you consider if you had to make a call"). Treat moving to a brand-new pack question as wasteful when the prior topic wasn't actually engaged with.`;

  return `You are conducting a live job interview for: "${job.title}".

Focus areas:
${job.focusAreas.map((f) => `- ${f}`).join("\n")}

Context: ${job.longDescription}

# Question pack (curated for this role)

Behavioral:
${job.questionPack.behavioral.map((q) => `- ${q}`).join("\n")}

Technical:
${job.questionPack.technical.map((q) => `- ${q}`).join("\n")}

Aim for a rough behavioral / technical balance across the 6 questions. Don't ask the same one twice.

# Output

Question ${qNumber} of ${TARGET_QUESTIONS}.

Reply with a single JSON object, no prose around it, no fences:
{
  "question": "the question you'll say next",
  "signals": {
    "skillsDemonstrated": ["..."],
    "topicsCovered": ["..."],
    "gaps": ["..."],
    "rationale": "1-2 sentences on why you chose this question",
    "pickedFromPack": { "category": "behavioral" | "technical", "question": "the verbatim pack question you drew from" } // omit this field if the question is a generated follow-up or if you didn't pull from the pack
  }
}

Rules for the question:
- You ARE the interviewer talking to the candidate. Don't say "the interview", "the candidate", or "would you like".
- One question only. 1-3 sentences. Conversational.
- ${followup}
- The first question is a meaty role-specific opener.`;
}

function evalPrompt(job: Job) {
  return `You are a hiring manager scoring this interview for "${job.title}".

Reply with a single JSON object, no fences:
{
  "strengths": ["2-4 concrete strengths from the transcript"],
  "concerns": ["1-3 honest concerns or gaps"],
  "overallScore": 1-10,
  "summary": "2-3 sentence hiring recommendation"
}

Be honest. If answers were thin, say so and score 3-5.`;
}

function turnsToMessages(turns: Turn[]): Anthropic.MessageParam[] {
  return turns
    .filter((t) => t.text?.trim())
    .map((t) => ({
      role: t.role === "interviewer" ? ("assistant" as const) : ("user" as const),
      content: t.text.trim(),
    }));
}

function textOf(msg: Anthropic.Message) {
  return msg.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

const EMPTY_SIGNALS: InterviewerSignals = {
  skillsDemonstrated: [],
  topicsCovered: [],
  gaps: [],
  rationale: "",
};

function parseTurn(raw: string) {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) {
    throw new Error(`Interviewer didn't return JSON: ${raw.slice(0, 120)}`);
  }
  const parsed = JSON.parse(raw.slice(start, end + 1)) as {
    question?: string;
    signals?: Partial<InterviewerSignals>;
  };
  if (typeof parsed.question !== "string" || !parsed.question.trim()) {
    throw new Error("Missing 'question' in interviewer response");
  }
  const incoming = parsed.signals ?? {};
  const picked = incoming.pickedFromPack;
  const validPick =
    picked &&
    typeof picked === "object" &&
    typeof picked.question === "string" &&
    (picked.category === "behavioral" || picked.category === "technical")
      ? picked
      : undefined;
  return {
    question: parsed.question.trim(),
    signals: {
      ...EMPTY_SIGNALS,
      ...incoming,
      pickedFromPack: validPick,
    },
  };
}

function isOverloaded(err: unknown) {
  if (err instanceof Anthropic.APIError) {
    return [429, 503, 529].includes(err.status ?? 0);
  }
  return /overloaded|529|rate[_ ]?limit/i.test(String(err));
}

async function callClaude(args: Anthropic.MessageCreateParamsNonStreaming) {
  try {
    return await client().messages.create(args);
  } catch (err) {
    if (!isOverloaded(err) || args.model === FALLBACK_MODEL) throw err;
    return await client().messages.create({ ...args, model: FALLBACK_MODEL });
  }
}

export async function generateNextQuestion(
  job: Job,
  turns: Turn[],
  qNumber: number,
) {
  const messages = turnsToMessages(turns);
  if (messages.length === 0) {
    messages.push({ role: "user", content: "Begin the interview now. Reply with the JSON only." });
  } else if (messages[messages.length - 1].role === "assistant") {
    messages.push({ role: "user", content: "(no answer given) Move to the next question. Reply with the JSON only." });
  }

  const system = interviewerPrompt(job, qNumber);

  const text = textOf(
    await callClaude({
      model: MODEL,
      max_tokens: 1500,
      system,
      messages,
    }),
  );

  try {
    return parseTurn(text);
  } catch {
    const retry = textOf(
      await callClaude({
        model: MODEL,
        max_tokens: 1500,
        system,
        messages: [
          ...messages,
          { role: "user", content: "Reply with the JSON object only — start with { and end with }." },
        ],
      }),
    );
    return parseTurn(retry);
  }
}

export async function generateEvaluation(job: Job, turns: Turn[]): Promise<Evaluation> {
  const transcript = turns
    .map((t) => `${t.role === "interviewer" ? "Interviewer" : "Candidate"}: ${t.text}`)
    .join("\n\n");

  const text = textOf(
    await callClaude({
      model: EVAL_MODEL,
      max_tokens: 1000,
      system: evalPrompt(job),
      messages: [{ role: "user", content: `Transcript:\n\n${transcript}\n\nReturn the JSON now.` }],
    }),
  );

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("Evaluator didn't return JSON");
  const parsed = JSON.parse(text.slice(start, end + 1)) as Partial<Evaluation>;

  if (
    !Array.isArray(parsed.strengths) ||
    !Array.isArray(parsed.concerns) ||
    typeof parsed.overallScore !== "number" ||
    typeof parsed.summary !== "string"
  ) {
    throw new Error("Evaluation JSON missing required fields");
  }
  return parsed as Evaluation;
}
