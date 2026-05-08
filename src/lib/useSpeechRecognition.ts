"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Options = {
  onResult: (text: string) => void;
  lang?: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onresult:
    | ((ev: {
        results: ArrayLike<ArrayLike<{ transcript: string }>> & { length: number };
      }) => void)
    | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
};

type Constructor = new () => SpeechRecognitionLike;

function getCtor(): Constructor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: Constructor;
    webkitSpeechRecognition?: Constructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function useSpeechRecognition({ onResult, lang = "en-US" }: Options) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onResultRef = useRef(onResult);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    const Ctor = getCtor();
    if (!Ctor) return;
    setSupported(true);
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = lang;
    rec.onresult = (ev) => {
      let finalText = "";
      for (let i = 0; i < ev.results.length; i++) {
        const result = ev.results[i];
        const alt = result[0];
        if (alt && alt.transcript) finalText += alt.transcript + " ";
      }
      const text = finalText.trim();
      if (text) onResultRef.current(text);
    };
    rec.onerror = (ev) => {
      console.warn("[STT] error:", ev.error);
      setError(ev.error);
      setListening(false);
    };
    rec.onstart = () => {
      console.log("[STT] started");
      setError(null);
      setListening(true);
    };
    rec.onend = () => {
      console.log("[STT] ended");
      setListening(false);
    };
    recRef.current = rec;
    return () => {
      try {
        rec.abort?.();
        rec.stop();
      } catch {}
      recRef.current = null;
    };
  }, [lang]);

  const start = useCallback(async () => {
    const rec = recRef.current;
    if (!rec) {
      console.warn("[STT] no recognition instance");
      return;
    }
    setError(null);
    try {
      rec.start();
    } catch (e) {
      console.warn("[STT] start failed, aborting and retrying:", e);
      try {
        rec.abort?.();
      } catch {}
      await new Promise((r) => setTimeout(r, 200));
      try {
        rec.start();
      } catch (e2) {
        console.error("[STT] retry failed:", e2);
        setError(e2 instanceof Error ? e2.message : "could not start");
      }
    }
  }, []);

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {}
  }, []);

  return { supported, listening, start, stop, error };
}
