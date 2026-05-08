export type QuestionPack = {
  behavioral: string[];
  technical: string[];
};

export type Job = {
  id: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  focusAreas: string[];
  estimatedMinutes: string;
  questionPack: QuestionPack;
};

export type InterviewerSignals = {
  skillsDemonstrated: string[];
  topicsCovered: string[];
  gaps: string[];
  rationale: string;
  pickedFromPack?: { category: "behavioral" | "technical"; question: string };
};

export type Turn = {
  role: "interviewer" | "candidate";
  text: string;
  ts: number;
  signals?: InterviewerSignals;
};

export type Evaluation = {
  strengths: string[];
  concerns: string[];
  overallScore: number;
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
