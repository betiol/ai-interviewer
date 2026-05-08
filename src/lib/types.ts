export type Job = {
  id: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  focusAreas: string[];
};

export type Turn = {
  role: "interviewer" | "candidate";
  text: string;
  ts: number;
};

export type Evaluation = {
  strengths: string[];
  concerns: string[];
  overall_score: number;
  summary: string;
};

export type Session = {
  id: string;
  jobId: string;
  startedAt: number;
  turns: Turn[];
  state: "in_progress" | "completed";
  evaluation?: Evaluation;
  questionCount: number;
};
