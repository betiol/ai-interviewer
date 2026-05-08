import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

export type LLMMessage = {
  role: "user" | "assistant";
  content: string;
};

export type LLMRequest = {
  system: string;
  messages: LLMMessage[];
  maxTokens: number;
  model?: string;
};

type Provider = "openrouter" | "anthropic";

function getProvider(): Provider {
  if (process.env.OPENROUTER_API_KEY) return "openrouter";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  throw new Error("No API key configured. Set OPENROUTER_API_KEY or ANTHROPIC_API_KEY.");
}

const PROVIDER: Provider = process.env.OPENROUTER_API_KEY ? "openrouter" : "anthropic";

export const PRIMARY_MODEL =
  PROVIDER === "openrouter"
    ? process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4.5"
    : process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

export const FALLBACK_MODEL =
  PROVIDER === "openrouter"
    ? process.env.OPENROUTER_FALLBACK_MODEL ?? "anthropic/claude-3.5-haiku"
    : process.env.ANTHROPIC_FALLBACK_MODEL ?? "claude-haiku-4-5";

export const EVAL_MODEL =
  PROVIDER === "openrouter"
    ? process.env.OPENROUTER_EVAL_MODEL ?? PRIMARY_MODEL
    : process.env.ANTHROPIC_EVAL_MODEL ?? PRIMARY_MODEL;

let _anthropic: Anthropic | null = null;
let _openrouter: OpenAI | null = null;

function anthropicClient(): Anthropic {
  if (!_anthropic) _anthropic = new Anthropic();
  return _anthropic;
}

function openrouterClient(): OpenAI {
  if (!_openrouter) {
    _openrouter = new OpenAI({
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_REFERER ?? "https://ai-interviewer.local",
        "X-Title": "AI Interviewer",
      },
    });
  }
  return _openrouter;
}

async function callAnthropic(req: LLMRequest): Promise<string> {
  const res = await anthropicClient().messages.create({
    model: req.model ?? PRIMARY_MODEL,
    max_tokens: req.maxTokens,
    system: req.system,
    messages: req.messages,
  });
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

async function callOpenRouter(req: LLMRequest): Promise<string> {
  const res = await openrouterClient().chat.completions.create({
    model: req.model ?? PRIMARY_MODEL,
    max_tokens: req.maxTokens,
    messages: [
      { role: "system", content: req.system },
      ...req.messages.map((m) => ({ role: m.role, content: m.content })),
    ],
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}

function isOverloaded(err: unknown): boolean {
  if (err instanceof Anthropic.APIError) {
    return [429, 503, 529].includes(err.status ?? 0);
  }
  if (err instanceof OpenAI.APIError) {
    return [429, 503, 529].includes(err.status ?? 0);
  }
  return /overloaded|529|rate[_ ]?limit/i.test(String(err));
}

export async function callLLM(req: LLMRequest): Promise<string> {
  // Validate provider on first call (throws clean error if neither key present)
  getProvider();

  const callOnce = (model: string) =>
    PROVIDER === "openrouter"
      ? callOpenRouter({ ...req, model })
      : callAnthropic({ ...req, model });

  const primary = req.model ?? PRIMARY_MODEL;
  try {
    return await callOnce(primary);
  } catch (err) {
    if (!isOverloaded(err) || primary === FALLBACK_MODEL) throw err;
    return await callOnce(FALLBACK_MODEL);
  }
}

export const llmInfo = {
  provider: PROVIDER,
  primary: PRIMARY_MODEL,
  fallback: FALLBACK_MODEL,
  eval: EVAL_MODEL,
};
