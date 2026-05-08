import type { Job } from "./types";

export const JOBS: Job[] = [
  {
    id: "senior-backend-engineer",
    title: "Senior Backend Engineer",
    shortDescription:
      "Design and ship distributed services that handle millions of requests a day.",
    longDescription:
      "You will own backend services end-to-end: API design, data modeling, performance, and reliability. We are looking for engineers who think in terms of systems, not features — people who can debug a P99 spike at 2am and ship a redesign at 2pm.",
    focusAreas: [
      "Distributed systems and concurrency",
      "API and data model design",
      "Production debugging and observability",
      "Trade-off thinking under ambiguity",
    ],
    estimatedMinutes: "10-15 min",
  },
  {
    id: "ml-platform-engineer",
    title: "ML Platform Engineer",
    shortDescription:
      "Build the infrastructure that turns research notebooks into reliable production pipelines.",
    longDescription:
      "You will work between research and production: training infrastructure, feature stores, model serving, and evaluation tooling. Strong backend fundamentals are required; ML research background is welcome but not the focus — we care about the systems that make ML usable.",
    focusAreas: [
      "Training and serving infrastructure",
      "Pipeline orchestration and data quality",
      "Cost and latency optimization",
      "Working across research and engineering",
    ],
    estimatedMinutes: "10-15 min",
  },
  {
    id: "founding-product-engineer",
    title: "Founding Product Engineer",
    shortDescription:
      "Ship full-stack features fast at an early-stage startup, from idea to production.",
    longDescription:
      "You will own features end-to-end across frontend, backend, and infra. The role is for engineers who are happiest when shipping daily and talking to users weekly. Pragmatism and product taste matter as much as technical depth here.",
    focusAreas: [
      "Full-stack delivery and shipping speed",
      "Product judgment and user empathy",
      "Pragmatic technical decisions",
      "Working without specs",
    ],
    estimatedMinutes: "10-15 min",
  },
];

export function getJob(id: string): Job | undefined {
  return JOBS.find((j) => j.id === id);
}
