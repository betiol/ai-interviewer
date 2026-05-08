import Anthropic from "@anthropic-ai/sdk";
import type { Job, Turn, Evaluation, InterviewerSignals } from "./types";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
const FALLBACK_MODEL = process.env.ANTHROPIC_FALLBACK_MODEL ?? "claude-haiku-4-5";
const EVAL_MODEL = process.env.ANTHROPIC_EVAL_MODEL ?? MODEL;
export const TARGET_QUESTIONS = 6;

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    _client = new Anthropic();
  }
  return _client;
}

function interviewerSystemPrompt(job: Job, questionNumber: number): string {
  const FOLLOWUP_QS = new Set([3, 5]);
  const isFollowup = FOLLOWUP_QS.has(questionNumber);

  const followupRule = isFollowup
    ? `THIS turn (#${questionNumber}) MUST be a follow-up: quote or paraphrase a specific phrase from the candidate's most recent answer, and dig into one concrete claim, decision, or gap they just mentioned. Do not change topics.`
    : `This turn can introduce a new topic. Move forward — don't repeat ground already covered.`;

  return `You are conducting a live job interview. You ARE the interviewer — never break character.

# OUTPUT FORMAT (MANDATORY)

Your entire response MUST be a single JSON object. No prose before or after. No markdown code fences. Start with { and end with }.

Schema:
{
  "question": string,                  // the question text you'll say next (see Question rules below)
  "signals": {
    "skillsDemonstrated": [string],    // skills the candidate has shown so far (cumulative; empty on Q1). Short noun phrases.
    "topicsCovered": [string],         // topics covered so far (cumulative; empty on Q1). Short noun phrases.
    "gaps": [string],                  // important areas you still want to probe but haven't yet. Short noun phrases.
    "rationale": string                // 1-2 sentences: why you chose THIS question now. Reference the candidate's answer if it's a follow-up.
  }
}

Use proper JSON: double quotes, escape internal quotes with \\", no trailing commas. Keep arrays short — max ~5 items each.

# CONTEXT

Role being interviewed for: "${job.title}"

Role focus areas:
${job.focusAreas.map((f) => `- ${f}`).join("\n")}

Role context: ${job.longDescription}

You will ask exactly ${TARGET_QUESTIONS} questions in this interview. This is question #${questionNumber} of ${TARGET_QUESTIONS}.

# RULES FOR THE "question" FIELD

- Speak DIRECTLY to the candidate. You ARE the interviewer, not an AI helping someone run an interview.
- No preamble ("Great answer", "Thanks", "I see"), no acknowledgements, no meta-commentary, no offering choices, no "would you like…", no numbering, no quotes wrapping.
- NEVER refer to "the interview" or "questions" or "the candidate" or "your next response" — those are meta.
- If the candidate's answer was short, vague, off-topic, or unclear, just ask the next question naturally. Do NOT ask the candidate what they want to do.
- Exactly ONE question. No multi-part questions joined with "and" or "also".
- 1 to 3 sentences max. Conversational tone.
- First question must be a meaty, role-specific opener — never "tell me about yourself".
- Don't ask trivia. Probe judgment, trade-offs, real experience.
- ${followupRule}

Make the signals concrete and grounded in the transcript so far.`;
}

function evaluationSystemPrompt(job: Job): string {
  return `You are a hiring manager reviewing a completed interview transcript for the role "${job.title}".

Produce a structured evaluation as a single JSON object with this exact shape:
{
  "strengths": [string, ...],     // 2-4 concrete strengths grounded in transcript quotes/topics
  "concerns": [string, ...],      // 1-3 honest concerns or gaps
  "overallScore": number,         // 1-10 integer, calibrated: 5 = average, 7 = strong, 9 = exceptional
  "summary": string               // 2-3 sentence hiring recommendation
}

Rules:
- Output ONLY the JSON object. No markdown fences, no commentary.
- Ground every point in what the candidate actually said.
- Be honest. If answers were thin, say so explicitly and score accordingly (3-5).`;
}

function turnsToMessages(turns: Turn[]): Anthropic.MessageParam[] {
  const msgs: Anthropic.MessageParam[] = [];
  for (const t of turns) {
    const text = t.text?.trim();
    if (!text) continue;
    msgs.push({
      role: t.role === "interviewer" ? "assistant" : "user",
      content: text,
    });
  }
  return msgs;
}

function extractText(message: Anthropic.Message): string {
  return message.content
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

function parseInterviewerJson(
  raw: string,
  prefilled: boolean,
): { question: string; signals: InterviewerSignals } {
  // If we used prefill, the model's response starts mid-JSON — re-attach the prefix.
  const restored = prefilled ? `{"question": "${raw}` : raw;

  const stripped = restored
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  // Try to slice out a balanced JSON object
  let jsonText = stripped;
  const firstBrace = stripped.indexOf("{");
  const lastBrace = stripped.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    jsonText = stripped.slice(firstBrace, lastBrace + 1);
  }

  try {
    const parsed = JSON.parse(jsonText) as {
      question?: unknown;
      signals?: Partial<InterviewerSignals>;
    };
    if (typeof parsed.question === "string" && parsed.question.trim()) {
      const s = parsed.signals ?? {};
      return {
        question: parsed.question.trim(),
        signals: {
          skillsDemonstrated: Array.isArray(s.skillsDemonstrated)
            ? s.skillsDemonstrated.filter((x): x is string => typeof x === "string")
            : [],
          topicsCovered: Array.isArray(s.topicsCovered)
            ? s.topicsCovered.filter((x): x is string => typeof x === "string")
            : [],
          gaps: Array.isArray(s.gaps)
            ? s.gaps.filter((x): x is string => typeof x === "string")
            : [],
          rationale: typeof s.rationale === "string" ? s.rationale : "",
        },
      };
    }
  } catch {
    // Fall through to recovery
  }

  // Recovery: try to extract just the question string from broken JSON
  // Match: "question": "...." up to the next unescaped quote
  const m = jsonText.match(/"question"\s*:\s*"((?:[^"\\]|\\.)*)/);
  if (m && m[1]) {
    const q = m[1].replace(/\\"/g, '"').replace(/\\n/g, " ").trim();
    if (q) return { question: q, signals: { ...EMPTY_SIGNALS } };
  }

  // Last resort: treat the raw output as the question itself
  // This keeps the interview alive even if the model totally drops JSON.
  const fallback = raw.replace(/^[\s`{}\[\]"]+|[\s`{}\[\]"]+$/g, "").trim();
  if (fallback.length >= 10) {
    return { question: fallback, signals: { ...EMPTY_SIGNALS } };
  }

  throw new Error(`Interviewer returned unusable output: ${raw.slice(0, 200)}`);
}

function isOverloaded(err: unknown): boolean {
  if (err instanceof Anthropic.APIError) {
    return err.status === 529 || err.status === 429 || err.status === 503;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return /overloaded|529|rate[_ ]?limit/i.test(msg);
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function createMessageWithFallback(
  args: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  // First try the primary model with one quick retry on overload.
  try {
    return await client().messages.create(args);
  } catch (err) {
    if (!isOverloaded(err)) throw err;
    await sleep(1500);
    try {
      return await client().messages.create(args);
    } catch (err2) {
      if (!isOverloaded(err2) || args.model === FALLBACK_MODEL) throw err2;
      // Final attempt: switch to fallback model
      return await client().messages.create({
        ...args,
        model: FALLBACK_MODEL,
      });
    }
  }
}

async function callInterviewer(
  job: Job,
  messages: Anthropic.MessageParam[],
  upcomingQuestionNumber: number,
  reminder?: string,
): Promise<string> {
  const finalMessages = reminder
    ? [
        ...messages,
        {
          role: "user" as const,
          content: reminder,
        },
      ]
    : messages;

  const response = await createMessageWithFallback({
    model: MODEL,
    max_tokens: 1500,
    system: interviewerSystemPrompt(job, upcomingQuestionNumber),
    messages: finalMessages,
  });
  return extractText(response);
}

export async function generateNextQuestion(
  job: Job,
  turns: Turn[],
  upcomingQuestionNumber: number,
): Promise<{ question: string; signals: InterviewerSignals }> {
  const messages = turnsToMessages(turns);

  if (messages.length === 0) {
    messages.push({
      role: "user",
      content: `[The candidate is ready. Ask your first question now. Reply with the JSON object only.]`,
    });
  } else if (messages[messages.length - 1].role === "assistant") {
    messages.push({
      role: "user",
      content: `[The candidate didn't give a substantive answer. Move on to your next question. Reply with the JSON object only.]`,
    });
  }

  const text = await callInterviewer(job, messages, upcomingQuestionNumber);
  if (!text) throw new Error("Interviewer returned an empty response");

  try {
    return parseInterviewerJson(text, false);
  } catch (firstErr) {
    // Retry once with a stronger reminder
    const retry = await callInterviewer(
      job,
      messages,
      upcomingQuestionNumber,
      `Your previous response was not valid JSON or was missing required fields. Reply with ONLY the JSON object specified by the system prompt — start with { and end with }. No prose, no fences.`,
    );
    try {
      return parseInterviewerJson(retry, false);
    } catch {
      throw firstErr;
    }
  }
}

export async function generateEvaluation(
  job: Job,
  turns: Turn[],
): Promise<Evaluation> {
  const transcript = turns
    .map((t) => {
      const label = t.role === "interviewer" ? "Interviewer" : "Candidate";
      return `${label}: ${t.text}`;
    })
    .join("\n\n");

  const response = await createMessageWithFallback({
    model: EVAL_MODEL,
    max_tokens: 1000,
    system: evaluationSystemPrompt(job),
    messages: [
      {
        role: "user",
        content: `Transcript:\n\n${transcript}\n\nReturn the JSON evaluation now.`,
      },
    ],
  });

  const raw = extractText(response);
  const cleaned = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Evaluation was not valid JSON. Got: ${raw.slice(0, 200)}`);
  }

  const e = parsed as Partial<Evaluation>;
  if (
    !Array.isArray(e.strengths) ||
    !Array.isArray(e.concerns) ||
    typeof e.overallScore !== "number" ||
    typeof e.summary !== "string"
  ) {
    throw new Error("Evaluation JSON missing required fields");
  }

  return {
    strengths: e.strengths,
    concerns: e.concerns,
    overallScore: e.overallScore,
    summary: e.summary,
  };
}
