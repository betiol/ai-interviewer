"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useCamera() {
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setEnabled(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      console.warn("[camera] getUserMedia not available in this context");
      setError("Camera API not available (needs HTTPS or localhost)");
      return;
    }
    console.log("[camera] requesting permission…");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      console.log("[camera] permission granted, attaching stream");
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setEnabled(true);
    } catch (e) {
      const name = e instanceof Error ? e.name : "Error";
      console.warn("[camera] start failed:", name, e);
      setError(
        name === "NotAllowedError"
          ? "Camera permission denied — check the site permissions"
          : name === "NotFoundError"
          ? "No camera found on this device"
          : `Could not start camera (${name})`,
      );
    }
  }, []);

  useEffect(() => {
    if (enabled && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [enabled]);

  useEffect(() => () => stop(), [stop]);

  return { enabled, error, videoRef, start, stop };
}
