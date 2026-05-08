"use client";

import type { Session } from "./types";

const KEY = "ai-interviewer:sessions";

type Index = Record<string, Session>;

function read(): Index {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Index) : {};
  } catch {
    return {};
  }
}

function write(index: Index) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(index));
  } catch {
    // quota exceeded — ignore
  }
}

export function saveSession(session: Session) {
  const index = read();
  index[session.id] = session;
  write(index);
}

export function loadSession(id: string): Session | undefined {
  return read()[id];
}

export function listSessions(): Session[] {
  return Object.values(read()).sort((a, b) => b.startedAt - a.startedAt);
}

export function newSessionId(): string {
  return crypto.randomUUID();
}
