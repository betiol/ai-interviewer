# Project notes for AI assistants (and humans skimming the repo)

This is the AI Interviewer take-home. Voice-driven interviews, role-grounded questions, structured evaluation. Single Next.js 15 app, no DB.

## Architecture in one paragraph

The app is one Next.js 15 codebase. The browser handles all audio (STT via Web Speech, TTS via `speechSynthesis`, optional camera via `getUserMedia`). The client owns the session and persists it to `localStorage`. The server is a single stateless route — `/api/interview/turn` — that takes the full transcript and returns the next interviewer turn (a JSON object with `question` + structured `signals`). The LLM is Claude Sonnet 4.6 by default, with automatic fallback to Haiku 4.5 on `529 overloaded`.

## Where things live

- `src/app/page.tsx` — home / role picker
- `src/app/interview/[jobId]/InterviewRoom.tsx` — the live interview UI; orchestrates STT, TTS, camera, decision panel
- `src/app/interview/[jobId]/DecisionPanel.tsx` — live signals sidebar
- `src/app/interview/[jobId]/VideoStage.tsx` — two-tile video-call layout (interviewer avatar + candidate camera)
- `src/app/session/[id]/` — results page (transcript + evaluation)
- `src/app/history/page.tsx` — past sessions + analytics (avg score, sparkline trend, talk ratio, topic coverage)
- `src/app/api/interview/turn/route.ts` — the only server endpoint
- `src/lib/interviewer.ts` — system prompts, JSON parser, evaluation logic
- `src/lib/llm.ts` — provider-agnostic LLM wrapper (OpenRouter or Anthropic direct, picked from env)
- `src/lib/jobs.ts` — the 3 roles + their question packs
- `src/lib/types.ts` — shared types (`Job`, `Turn`, `InterviewerSignals`, `Evaluation`)
- `src/lib/sessionStore.ts` — localStorage persistence
- `src/lib/useSpeechRecognition.ts` / `useTextToSpeech.ts` / `useCamera.ts` — the three browser-API hooks

## Conventions

- **TypeScript camelCase everywhere**, including JSON keys we ask the LLM to emit. No snake_case.
- **No comments explaining what code does** — names should do that. Comments only for non-obvious *why*.
- **Server is stateless.** Don't reach for an in-memory map or a DB without a real reason; the client owns the session.
- **One LLM call per turn.** The interviewer returns `{ question, signals }` together. Do not split into two calls.
- **Tolerant parsing > strict prompting.** Assume the model will occasionally drift. The parser in `interviewer.ts` extracts JSON from prose, retries once, and falls back gracefully.
- **No regex matching on candidate text in the route handler.** Anything that looks like "if user said X" belongs in the system prompt — the model handles it. Hardcoded heuristics in the server look brittle in code review.
- **Voice is primary, keyboard is fallback.** UI must default to mic-forward; textarea is hidden behind a disclosure.

## How the interviewer prompt is structured

`interviewerPrompt(job, qNumber)` builds:
1. Output format (JSON schema) at the **top** — most salient slot.
2. Role context (title, focus areas, long description).
3. Question pack (behavioral + technical) for the role.
4. Question number + total.
5. Per-turn rules:
   - **Q3 and Q5 are forced follow-ups.** They must quote the candidate's last answer and not pull from the pack.
   - **Other turns** prefer pulling from the pack, but improvise if nothing fits.
   - **Thin/empty answers** → re-approach the same area from a different angle, don't burn a fresh pack question.
   - Persona rules (no meta talk, one question, 1-3 sentences, conversational).

If you change this prompt, run a quick sanity curl through `/api/interview/turn` to confirm JSON output still parses and Q3/Q5 still follow up.

## How to extend

- **Add a role:** drop a new entry in `src/lib/jobs.ts`. Include `focusAreas`, `longDescription`, and a `questionPack` with 4 behavioral + 4 technical. The home page and history page pick it up automatically.
- **Add a stretch goal:** the spec lists four; all are implemented. If you want a fifth (e.g. server-side persistence), add a route under `src/app/api/`, swap `sessionStore.ts` for a fetch-based store, and keep the API stateless on the wire.
- **Switch LLM provider:** all LLM calls go through `callLLM()` in `src/lib/llm.ts`. It picks OpenRouter (via OpenAI SDK) or Anthropic direct based on env vars at boot. To add a third provider, branch inside `callLLM` and keep the same input/output contract.

## How this codebase was built

Built with [Claude Code](https://claude.com/claude-code) as a pair-programming assistant during a 4-hour take-home window. The decision log lives in `DECISIONS.md`. Code reviewed and shipped by me.
