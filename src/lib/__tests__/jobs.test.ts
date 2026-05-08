import { describe, it, expect } from "vitest";
import { JOBS, getJob } from "../jobs";

describe("JOBS dataset", () => {
  it("ships at least 3 roles (spec requirement)", () => {
    expect(JOBS.length).toBeGreaterThanOrEqual(3);
  });

  it("every job has a unique id", () => {
    const ids = JOBS.map((j) => j.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every job has the fields the UI expects", () => {
    for (const job of JOBS) {
      expect(job.title.length).toBeGreaterThan(0);
      expect(job.shortDescription.length).toBeGreaterThan(0);
      expect(job.longDescription.length).toBeGreaterThan(0);
      expect(job.focusAreas.length).toBeGreaterThan(0);
      expect(job.estimatedMinutes.length).toBeGreaterThan(0);
    }
  });

  it("every job ships behavioral and technical question packs (stretch #2)", () => {
    for (const job of JOBS) {
      expect(job.questionPack.behavioral.length).toBeGreaterThanOrEqual(3);
      expect(job.questionPack.technical.length).toBeGreaterThanOrEqual(3);
      // No empty strings sneaking in
      [...job.questionPack.behavioral, ...job.questionPack.technical].forEach(
        (q) => expect(q.trim().length).toBeGreaterThan(10),
      );
    }
  });
});

describe("getJob", () => {
  it("returns the matching job", () => {
    const first = JOBS[0];
    expect(getJob(first.id)?.id).toBe(first.id);
  });

  it("returns undefined for unknown ids", () => {
    expect(getJob("nope")).toBeUndefined();
  });
});
