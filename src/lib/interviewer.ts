import Anthropic from "@anthropic-ai/sdk";
import type { Job, Turn, Evaluation } from "./types";

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";
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
    ? `\n- THIS QUESTION (#${questionNumber}) MUST be a follow-up. Quote or paraphrase a specific phrase from the candidate's most recent answer in your question. Dig into one concrete claim, decision, or gap they just mentioned. Do NOT change topics.`
    : `\n- This question can introduce a new topic. Move the interview forward — don't repeat ground already covered.`;

  return `You are conducting a live job interview. You ARE the interviewer — never break character.

Role being interviewed for: "${job.title}"

Role focus areas:
${job.focusAreas.map((f) => `- ${f}`).join("\n")}

Role context: ${job.longDescription}

You will ask exactly ${TARGET_QUESTIONS} questions in this interview. This is question #${questionNumber} of ${TARGET_QUESTIONS}.

ABSOLUTE RULES — break any of these and the interview is invalid:
- You speak DIRECTLY to the candidate. You ARE the interviewer, not an AI helping someone run an interview.
- Output ONLY the next question. Nothing else. No preamble ("Great answer", "Thanks", "I see"), no acknowledgements, no meta-commentary, no offering choices, no "would you like…", no numbering ("Question 2:"), no quotes wrapping the question.
- NEVER refer to "the interview" or "questions" or "the candidate" or "your next response" — those are meta. You're just talking to the person in front of you.
- If the candidate's answer was short, vague, off-topic, or unclear, that's fine — just ask the next question (or, if it's a follow-up turn, probe what little they did say). Do NOT ask the candidate what they want to do.
- Ask exactly ONE question. No multi-part questions joined with "and" or "also".
- Keep it conversational and concise — 1 to 3 sentences max.
- The first question should be a meaty, role-specific opener. Never "tell me about yourself".
- Don't ask trivia. Probe judgment, trade-offs, and real experience.${followupRule}

Output format: just the question text. Nothing else. No JSON, no labels, no quotes.`;
}

function evaluationSystemPrompt(job: Job): string {
  return `You are a hiring manager reviewing a completed interview transcript for the role "${job.title}".

Produce a structured evaluation as a single JSON object with this exact shape:
{
  "strengths": [string, ...],     // 2-4 concrete strengths grounded in transcript quotes/topics
  "concerns": [string, ...],      // 1-3 honest concerns or gaps
  "overall_score": number,        // 1-10 integer, calibrated: 5 = average, 7 = strong, 9 = exceptional
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

export async function generateNextQuestion(
  job: Job,
  turns: Turn[],
  upcomingQuestionNumber: number,
): Promise<string> {
  const messages = turnsToMessages(turns);

  if (messages.length === 0) {
    messages.push({
      role: "user",
      content: `[The candidate is ready. Ask your first question now.]`,
    });
  } else if (messages[messages.length - 1].role === "assistant") {
    messages.push({
      role: "user",
      content: `[The candidate didn't give a substantive answer. Move on to your next question.]`,
    });
  }

  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 400,
    system: interviewerSystemPrompt(job, upcomingQuestionNumber),
    messages,
  });

  const text = extractText(response);
  if (!text) throw new Error("Interviewer returned an empty response");
  return text;
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

  const response = await client().messages.create({
    model: EVAL_MODEL,
    max_tokens: 800,
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
    typeof e.overall_score !== "number" ||
    typeof e.summary !== "string"
  ) {
    throw new Error("Evaluation JSON missing required fields");
  }

  return {
    strengths: e.strengths,
    concerns: e.concerns,
    overall_score: e.overall_score,
    summary: e.summary,
  };
}
