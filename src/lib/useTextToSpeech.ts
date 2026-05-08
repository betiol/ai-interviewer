"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "ai-interviewer:tts-muted";

export function useTextToSpeech(lang = "en-US") {
  const [supported, setSupported] = useState(false);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);

    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "1") setMuted(true);

    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, []);

  function pickVoice(): SpeechSynthesisVoice | undefined {
    const voices = voicesRef.current;
    if (voices.length === 0) return undefined;
    const preferences = [
      (v: SpeechSynthesisVoice) =>
        v.lang.startsWith(lang) && /Google US English/i.test(v.name),
      (v: SpeechSynthesisVoice) =>
        v.lang.startsWith(lang) && /Samantha|Karen|Daniel|Alex/i.test(v.name),
      (v: SpeechSynthesisVoice) =>
        v.lang.startsWith(lang) && v.localService,
      (v: SpeechSynthesisVoice) => v.lang.startsWith(lang),
    ];
    for (const pref of preferences) {
      const found = voices.find(pref);
      if (found) return found;
    }
    return voices[0];
  }

  const speak = useCallback(
    (text: string) => {
      if (!supported || muted || !text) return;
      const synth = window.speechSynthesis;
      synth.cancel();

      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = lang;
      utter.rate = 1.0;
      utter.pitch = 1.0;
      const voice = pickVoice();
      if (voice) utter.voice = voice;

      utter.onstart = () => setSpeaking(true);
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);

      synth.speak(utter);
    },
    [supported, muted, lang],
  );

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {}
      if (next) window.speechSynthesis.cancel();
      return next;
    });
  }, []);

  return { supported, muted, speaking, speak, stop, toggleMute };
}
