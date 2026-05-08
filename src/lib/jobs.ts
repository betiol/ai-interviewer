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
    questionPack: {
      behavioral: [
        "Tell me about a production incident you led the response on. What was the gap between what you knew at the start and what turned out to be true?",
        "Describe a time you disagreed with a senior engineer or architect about a technical direction. How did it land?",
        "Walk me through a project where you had to push back on scope or deadline. What did you say, and how did you say it?",
        "When was the last time you mentored or unblocked a more junior engineer on something gnarly?",
      ],
      technical: [
        "Walk me through how you'd design rate limiting for a multi-tenant API where tenants have very different traffic profiles.",
        "You're seeing intermittent P99 latency spikes that don't show up in averages or in any obvious metric. How do you investigate?",
        "Describe a time you migrated or sharded a database under live traffic. What were the worst footguns?",
        "How do you decide between adding a queue, adding a cache, or just making the synchronous path faster?",
      ],
    },
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
    questionPack: {
      behavioral: [
        "Describe a time you had to translate a fuzzy research idea into a production-ready system. What changed between the notebook and the deploy?",
        "Tell me about a time a researcher and an engineer wanted very different things and you had to broker it.",
        "When did you push back on building 'one more feature' for a model and instead invest in tooling? How did you justify it?",
        "Walk me through a model launch you owned end-to-end. What did you wish you'd done differently?",
      ],
      technical: [
        "How would you design a feature store that has to serve both training (batch, point-in-time correct) and online inference (sub-10ms)?",
        "A model in production is suddenly returning bad predictions. How do you debug whether it's a data issue, a serving issue, or model drift?",
        "Walk me through how you'd cut serving cost on a transformer model that's currently the biggest line item on the cloud bill.",
        "Describe how you'd structure an offline evaluation pipeline so that a researcher can ship a model change with confidence in under a day.",
      ],
    },
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
    questionPack: {
      behavioral: [
        "Tell me about a feature you built where you weren't given a spec. How did you decide what 'done' looked like?",
        "Describe a time you killed a feature you'd already built. What was the trigger?",
        "When was the last time talking to a user changed what you were building, mid-build?",
        "Walk me through a moment where you chose to ship something you weren't proud of technically. How did that play out?",
      ],
      technical: [
        "You have one week to build an MVP for a feature you suspect only 30% of users will care about. How do you architect it so you don't paint yourself into a corner if it takes off?",
        "Walk me through how you'd add real-time updates to an existing CRUD app without a full backend rewrite.",
        "When do you reach for a managed service vs. roll your own? Give a recent concrete example.",
        "You're seeing slow page loads in production but you don't have a perf team. What's your first hour of investigation look like?",
      ],
    },
  },
];

export function getJob(id: string): Job | undefined {
  return JOBS.find((j) => j.id === id);
}
