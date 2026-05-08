"use client";

import type { RefObject } from "react";

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  cameraEnabled: boolean;
  cameraError: string | null;
  onToggleCamera: () => void;
  interviewerSpeaking: boolean;
  candidateName?: string;
};

export default function VideoStage({
  videoRef,
  cameraEnabled,
  cameraError,
  onToggleCamera,
  interviewerSpeaking,
  candidateName = "You",
}: Props) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 mb-6">
      <Tile label="Interviewer" speaking={interviewerSpeaking}>
        <InterviewerAvatar speaking={interviewerSpeaking} />
      </Tile>
      <Tile
        label={candidateName}
        speaking={false}
        action={
          cameraEnabled ? (
            <button
              type="button"
              onClick={onToggleCamera}
              className="text-[11px] font-mono text-zinc-400 hover:text-amber-300 transition-colors"
            >
              stop camera
            </button>
          ) : null
        }
      >
        {cameraEnabled ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="absolute inset-0 h-full w-full object-cover scale-x-[-1]"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              console.log("[camera] start clicked");
              onToggleCamera();
            }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-3 group hover:bg-zinc-900/40 transition-colors"
          >
            <span className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-zinc-800 group-hover:bg-amber-400/20 group-hover:border-amber-300/40 border border-zinc-700 transition-colors">
              <CameraIcon />
            </span>
            <span className="text-sm text-zinc-300 group-hover:text-amber-200 transition-colors">
              Start camera
            </span>
            {cameraError && (
              <span className="text-xs text-rose-400 max-w-[80%] text-center">
                {cameraError}
              </span>
            )}
          </button>
        )}
      </Tile>
    </div>
  );
}

function Tile({
  label,
  speaking,
  action,
  children,
}: {
  label: string;
  speaking: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative aspect-video rounded-xl overflow-hidden bg-zinc-950 border ${
        speaking ? "border-amber-400/60" : "border-zinc-800"
      } transition-colors`}
    >
      {children}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-gradient-to-t from-black/90 to-transparent">
        <span className="text-xs font-medium text-white inline-flex items-center gap-2">
          {speaking && (
            <span className="flex items-end gap-0.5 h-3">
              <span className="w-0.5 h-2 bg-amber-300 animate-pulse" style={{ animationDelay: "0ms" }} />
              <span className="w-0.5 h-3 bg-amber-300 animate-pulse" style={{ animationDelay: "150ms" }} />
              <span className="w-0.5 h-1.5 bg-amber-300 animate-pulse" style={{ animationDelay: "300ms" }} />
            </span>
          )}
          {label}
        </span>
        {action}
      </div>
    </div>
  );
}

function InterviewerAvatar({ speaking }: { speaking: boolean }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
      <div className="relative">
        <div
          className={`h-32 w-32 rounded-full bg-gradient-to-br from-amber-400/30 via-amber-500/20 to-amber-700/10 backdrop-blur-sm border border-amber-300/20 flex items-center justify-center transition-transform ${
            speaking ? "scale-105" : "scale-100"
          }`}
        >
          <span className="text-3xl font-semibold text-amber-200/70 font-mono">
            AI
          </span>
        </div>
        {speaking && (
          <>
            <span className="absolute inset-0 rounded-full border border-amber-300/30 animate-ping" />
            <span
              className="absolute -inset-3 rounded-full border border-amber-300/15 animate-ping"
              style={{ animationDelay: "200ms" }}
            />
          </>
        )}
      </div>
    </div>
  );
}

function CameraIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-zinc-300 group-hover:text-amber-200 transition-colors"
      aria-hidden
    >
      <path d="M23 7l-7 5 7 5V7z" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function CameraOffIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-zinc-700"
      aria-hidden
    >
      <path d="m1 1 22 22" />
      <path d="M21 21H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3l3-3h6l1.5 1.5" />
      <path d="M14.5 14.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z" />
    </svg>
  );
}
