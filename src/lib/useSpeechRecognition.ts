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
  onresult:
    | ((ev: {
        results: ArrayLike<ArrayLike<{ transcript: string }>> & { length: number };
      }) => void)
    | null;
  onerror: ((ev: { error: string }) => void) | null;
  onend: (() => void) | null;
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
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    return () => {
      try {
        rec.stop();
      } catch {}
      recRef.current = null;
    };
  }, [lang]);

  const start = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    try {
      rec.start();
      setListening(true);
    } catch {
      // Already started
    }
  }, []);

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    try {
      rec.stop();
    } catch {}
    setListening(false);
  }, []);

  return { supported, listening, start, stop };
}
