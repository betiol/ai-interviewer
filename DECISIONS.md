# Engineering decisions

Notes on the calls I made during this 4-hour take-home, in roughly the order I made them. The intent is to make the trade-offs auditable, not to celebrate any of them.

---

## 1. Stack: Next.js 15 + Tailwind, single repo, no DB

**Why:** the spec asks for "single public GitHub repo" and "deployed on a publicly viewable website". One Next.js codebase covers both — frontend and API in the same project, one Vercel deploy, no infra to wire up. Tailwind because I needed to ship visual UI fast and didn't want to invent design primitives. No design system library — Tailwind utility classes are enough at this scope.

**Trade-off:** can't drop in a different framework per page if a future feature wants it. Acceptable for the task size.

---

## 2. Voice: browser-native Web Speech API, not Whisper

**Why:** Chrome and Edge ship a `SpeechRecognition` API for free. Sub-100ms feel, no audio uploads, no extra service. For a 4-hour build I'd rather spend the time on the interviewer logic than wire up an audio upload pipeline.

**Trade-off:** doesn't work in Safari or Firefox. Mitigated with a clear keyboard fallback inside the same UI. The README calls out the browser support explicitly.

The same hook pattern was reused for TTS (`speechSynthesis`) and camera (`getUserMedia`).

---

## 3. Sessions: stateless API + client-side `localStorage`

**Why:** my first version had an in-memory `Map` on the server keyed by session ID. That works on `localhost` but breaks on Vercel — serverless cold starts land on different instances, so a session created on one request might not exist on the next. I caught this before shipping and refactored:

- The API is fully stateless. Every `/api/interview/turn` call gets the full transcript from the client.
- The client owns the session and persists it to `localStorage`.

**Trade-off:** sessions don't follow you across browsers or devices. For this take-home, a DB would have been the wrong call — too much weight, no real benefit when sessions are short and per-user. If we needed shareable session URLs we'd swap for Vercel KV.

---

## 4. Interviewer: single LLM call per turn returning structured JSON

The decision panel (stretch #1) needs both a question AND a structured analysis (skills/topics/gaps/rationale) per turn. Two designs considered:

- **(a) Single call** returning `{ question, signals }` together.
- **(b) Two calls** — one to analyze, one to ask.

**Picked (a).** Half the cost, half the latency, and the signals tend to be more coherent because the model writes them with full awareness of the question it's about to ask.

**Risk:** the model occasionally drops JSON format mid-conversation. Mitigated with:
- A tolerant parser that extracts the JSON object even from prose-wrapped output.
- One automatic retry with a stronger reminder if parsing fails.
- `max_tokens: 1500` so long signal arrays don't truncate the response.

---

## 5. Forced follow-ups instead of trusting the model to count

Spec requires "≥2 follow-ups that depend on the user's prior answer". My first instinct was to instruct the model to "include at least 2 follow-ups across the 6 questions". That's brittle — models drift across long conversations and may miscount.

Instead: the system prompt **explicitly marks Q3 and Q5 as forced follow-ups**. On those turns the prompt tells the model to quote the candidate's most recent answer and ignore the question pack. On other turns (Q1, Q2, Q4, Q6) the model is told to prefer pulling from the pack.

This is a deterministic guarantee rather than a hope. If I wanted more depth and less breadth, I could move Q4 into the followup set — it's a one-line change.

---

## 6. Sonnet 4.6 default with Haiku 4.5 fallback

Started on Haiku 4.5 to save cost during prompt iteration. **Haiku occasionally broke character on short or unclear answers** — when the candidate said something like "blah" or "I don't know", Haiku would reply with meta text like *"Would you like me to ask question #3?"* instead of staying in the interviewer role.

Switched the default to Sonnet 4.6. The persona holds. Haiku is kept as the **automatic fallback** when Sonnet returns 529 (overloaded) — one retry on the primary, then automatic downgrade rather than failing the user.

The downgrade is pure cost-of-resilience: when Sonnet is overloaded I'd rather give the user a Haiku-quality question than nothing.

---

## 7. Anti-meta prompt rules

The biggest persona issue isn't asking weak questions — it's the model breaking the fourth wall. *"As an AI interviewer..."* or *"would you like me to..."* immediately destroys the illusion.

I tried abstract instructions ("stay in character") first and they didn't hold. What worked: an **explicit list of forbidden phrases** in the system prompt. "Never say 'the interview', 'the candidate', 'your next response', 'would you like'." Concrete bans land much harder than abstract ones.

---

## 8. Question pack lives in the prompt, not a tool/RAG

Stretch #2 asks for "structured question banks per role". The simplest workable design: keep the pack as plain TypeScript data in `lib/jobs.ts` and inject it into the system prompt every turn. The model is told to prefer drawing from it on new-topic turns and to ignore it on forced follow-up turns.

I considered exposing the pack as an Anthropic tool the model could call, but it's overkill for a static list of 8 strings per role. The prompt-injection approach is cheaper and lets the model rephrase or sharpen pack questions naturally, while still letting it return `pickedFromPack: { category, question }` in the signals so the UI can show which bank question inspired the turn.

---

## 9. Thin-answer handling: prompt-side, not server-side

When the candidate gives a thin or unconfident answer ("I don't know", one-liner), the interviewer should **probe further** rather than burn a fresh pack question. My first attempt was to detect this server-side with a regex matching common phrases. I deleted that approach — regexes for natural language are brittle and would look bad in code review.

The current approach: instruct the model in the system prompt to recognize thin answers and re-approach the same area from a different angle. The detection lives where it belongs — with the model — not in a hardcoded list of strings on the server.

---

## 10. Video mode: abstract avatar instead of fake video

Stretch #3 asks for a "video call" layout. The natural temptation is to slap a generic AI avatar with lip-sync onto the interviewer tile. That's uncanny-valley territory and would look worse than no video at all.

The interviewer tile is intentionally **abstract** — a circular gradient with "AI" in mono text — that scales up and pulses concentric rings whenever TTS is speaking. It ties to actual state (TTS is or isn't speaking) without pretending to be a person. The candidate tile is a real `<video>` from `getUserMedia`.

---

## 11. History/analytics: localStorage-derived, no extra storage

Stretch #4 asks for a session history page with per-session metrics. Since we already persist full sessions (transcript + signals + evaluation) to `localStorage`, all the metrics can be derived client-side:

- **Talk ratio** = candidate characters / total characters.
- **Topic coverage** = `Set` size of all `signals.topicsCovered` across the session.
- **Score trend** = sequence of `evaluation.overallScore` ordered by `startedAt`, rendered as an inline SVG sparkline.
- **Filter by role** auto-derives the chips from the sessions present.

No new storage, no new API. The history page reads what's already there.

---

## 12. Provider-agnostic LLM wrapper (OpenRouter primary, Anthropic fallback)

The take-home brief recommended OpenRouter as the default and listed "use your own API keys" as a backup if their API was unavailable. My first pass shipped on the Anthropic SDK directly because that was the fastest path and I had a key handy. Re-reading the brief later, I realized "use your own keys" was a fallback, not a green light to skip OpenRouter.

I refactored to a thin wrapper (`src/lib/llm.ts`) that picks the provider at boot:

- If `OPENROUTER_API_KEY` is set → use the OpenAI SDK pointed at `https://openrouter.ai/api/v1` with `anthropic/claude-sonnet-4.5` as the default model.
- Otherwise → use the Anthropic SDK directly (the original path).

The wrapper exposes a single `callLLM({ system, messages, maxTokens, model? })` function returning the response text. The rest of `interviewer.ts` doesn't know or care which provider is in use. The 529 → fallback-model retry behaves identically on both paths.

**Trade-off:** an extra dependency (`openai`) and a small amount of conversion code in the OpenRouter path. Net positive — the reviewer can plug in their OpenRouter key without touching the code.

---

## 13. Things I'd change with another four hours

- **Server-side session persistence** (Vercel KV / Postgres) so results URLs are shareable across devices.
- **Streaming** the interviewer's question via SSE so the text and the TTS could begin before the full LLM response arrives — that latency is the most-felt friction in the flow today.
- **Better STT UX**: interim transcripts as you speak (instead of finalized only), automatic stop on silence, language auto-detect.
- **A small e2e test** with Playwright that drives a full 6-question interview against a mocked LLM, asserting the transcript shape and that Q3/Q5 actually quote prior answers.
