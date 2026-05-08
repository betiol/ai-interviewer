import { describe, it, expect } from "vitest";
import { parseTurn, TARGET_QUESTIONS } from "../interviewer";

describe("parseTurn", () => {
  it("parses a clean JSON response", () => {
    const raw = JSON.stringify({
      question: "Walk me through your last production incident.",
      signals: {
        skillsDemonstrated: ["debugging"],
        topicsCovered: ["incidents"],
        gaps: ["observability"],
        rationale: "Opener for backend role.",
      },
    });

    const result = parseTurn(raw);

    expect(result.question).toBe("Walk me through your last production incident.");
    expect(result.signals.skillsDemonstrated).toEqual(["debugging"]);
    expect(result.signals.topicsCovered).toEqual(["incidents"]);
    expect(result.signals.gaps).toEqual(["observability"]);
    expect(result.signals.rationale).toBe("Opener for backend role.");
    expect(result.signals.pickedFromPack).toBeUndefined();
  });

  it("recovers JSON wrapped in prose", () => {
    const raw = `Sure, here's my response:\n\n{"question": "What's your debugging process?", "signals": {"skillsDemonstrated": [], "topicsCovered": [], "gaps": [], "rationale": ""}}\n\nLet me know if you need more.`;

    const result = parseTurn(raw);

    expect(result.question).toBe("What's your debugging process?");
  });

  it("recovers JSON wrapped in markdown fences", () => {
    const raw = '```json\n{"question": "Why this design?", "signals": {"skillsDemonstrated": [], "topicsCovered": [], "gaps": [], "rationale": "ok"}}\n```';

    const result = parseTurn(raw);

    expect(result.question).toBe("Why this design?");
  });

  it("preserves a valid pickedFromPack", () => {
    const raw = JSON.stringify({
      question: "How do you handle cross-shard transactions?",
      signals: {
        skillsDemonstrated: [],
        topicsCovered: [],
        gaps: [],
        rationale: "Pulled from pack.",
        pickedFromPack: {
          category: "technical",
          question: "Walk me through how you'd handle cross-shard transactions.",
        },
      },
    });

    const result = parseTurn(raw);

    expect(result.signals.pickedFromPack).toBeDefined();
    expect(result.signals.pickedFromPack?.category).toBe("technical");
  });

  it("strips an invalid pickedFromPack (wrong category)", () => {
    const raw = JSON.stringify({
      question: "Test?",
      signals: {
        skillsDemonstrated: [],
        topicsCovered: [],
        gaps: [],
        rationale: "",
        pickedFromPack: { category: "made-up", question: "x" },
      },
    });

    const result = parseTurn(raw);

    expect(result.signals.pickedFromPack).toBeUndefined();
  });

  it("fills missing signal fields with safe defaults", () => {
    const raw = JSON.stringify({ question: "Just a question." });

    const result = parseTurn(raw);

    expect(result.signals.skillsDemonstrated).toEqual([]);
    expect(result.signals.topicsCovered).toEqual([]);
    expect(result.signals.gaps).toEqual([]);
    expect(result.signals.rationale).toBe("");
  });

  it("trims whitespace around the question", () => {
    const raw = JSON.stringify({
      question: "   Tell me about a refactor.   ",
      signals: {
        skillsDemonstrated: [],
        topicsCovered: [],
        gaps: [],
        rationale: "",
      },
    });

    const result = parseTurn(raw);

    expect(result.question).toBe("Tell me about a refactor.");
  });

  it("throws on missing JSON object", () => {
    expect(() => parseTurn("totally not json at all")).toThrow();
  });

  it("throws on missing question field", () => {
    const raw = JSON.stringify({ signals: { rationale: "no question here" } });
    expect(() => parseTurn(raw)).toThrow(/question/i);
  });

  it("throws on empty question string", () => {
    const raw = JSON.stringify({ question: "   ", signals: {} });
    expect(() => parseTurn(raw)).toThrow();
  });
});

describe("TARGET_QUESTIONS", () => {
  it("matches the spec's '≥6 questions' requirement", () => {
    expect(TARGET_QUESTIONS).toBeGreaterThanOrEqual(6);
  });
});
